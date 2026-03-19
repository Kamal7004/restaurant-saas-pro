import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import { JWTPayload } from '../middleware/auth';

interface AuthedClient {
  ws: WebSocket;
  tenantId?: string;
  tableId?: string;
  role?: string;
  userId?: string;
  isCustomer?: boolean;
}

class WSManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<AuthedClient> = new Set();

  initialize(server: http.Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const client: AuthedClient = { ws };
      this.clients.add(client);

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === 'AUTH' && msg.token) {
            try {
              const payload = jwt.verify(msg.token, process.env.JWT_SECRET || 'secret') as JWTPayload;
              client.userId = payload.userId;
              client.role = payload.role;
              client.tenantId = payload.tenantId || undefined;
              client.isCustomer = false;
              ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', role: payload.role }));
            } catch {
              ws.send(JSON.stringify({ type: 'AUTH_ERROR', message: 'Invalid token' }));
            }
          }

          if (msg.type === 'AUTH_CUSTOMER' && msg.tenantId && msg.tableId) {
            client.tenantId = msg.tenantId;
            client.tableId = msg.tableId;
            client.isCustomer = true;
            ws.send(JSON.stringify({ type: 'AUTH_SUCCESS', role: 'CUSTOMER' }));
          }

          if (msg.type === 'RESOLVE_WAITER_CALL' && msg.callId) {
            if (client.tenantId) {
              this.broadcastToTenant(client.tenantId, { type: 'WAITER_CALL_RESOLVED', data: { callId: msg.callId } });
            }
          }
        } catch {
          // ignore parse errors
        }
      });

      ws.on('close', () => {
        this.clients.delete(client);
      });
    });

    console.log('🔌 WebSocket server ready at /ws');
  }

  broadcastToTenant(tenantId: string, message: unknown): void {
    const payload = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.tenantId === tenantId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  broadcast(message: unknown): void {
    const payload = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }
}

export const wsManager = new WSManager();
