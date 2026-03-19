import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';

import { runMigrations } from './db';
import { wsManager } from './websocket/manager';

// Routes
import authRoutes from './routes/auth';
import menuRoutes from './routes/menu';
import orderRoutes from './routes/orders';
import tableRoutes from './routes/tables';
import staffRoutes from './routes/staff';
import superAdminRoutes from './routes/superAdmin';

const app = express();
const httpServer = createServer(app);

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ─── API ROUTES ───────────────────────────────────────────────────────────────

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/menu', menuRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/tables', tableRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/super-admin', superAdminRoutes);

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── SERVE FRONTEND ───────────────────────────────────────────────────────────

const frontendDir = process.env.FRONTEND_DIR
  ? path.resolve(process.env.FRONTEND_DIR)
  : path.join(__dirname, '../../frontend/build');

// Serve static files
app.use(express.static(frontendDir));

// Fallback for SPA routing
app.get('*', (req, res) => {
  // Check if it's an API route that somehow got here (shouldn't happen due to order)
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  const indexPath = path.join(frontendDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({
      message: 'Frontend build not found. Please build the frontend or set FRONTEND_DIR.',
      servingFrom: frontendDir
    });
  }
});

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── START ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3000');

async function start() {
  try {
    await runMigrations();
    wsManager.initialize(httpServer);
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📁 Serving frontend from: ${frontendDir}`);
      console.log(`🔌 WebSocket ready at ws://localhost:${PORT}/ws`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
