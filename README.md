# 🍽️ TableFlow — Multi-Tenant Restaurant Management SaaS

A full-stack, production-ready restaurant SaaS platform with QR-based ordering, real-time kitchen & staff views, and a super admin control panel.

---

## 🏗️ Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + TypeScript + Zustand |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| Cache | In-Memory (custom) |
| Real-time | WebSockets (ws) |
| Auth | JWT + OTP sessions |

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 2. Clone & Install
```bash
git clone <repo>
cd restaurant-saas
npm install
```

### 3. Configure Environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your DB credentials and secrets
```

### 4. Setup Database
```bash
# Create postgres DB
createdb restaurant_saas

# Run migrations + seed super admin
cd backend
npx ts-node src/seed.ts
```

### 5. Run Development
```bash
# From root (runs both frontend + backend)
npm run dev
```

- Frontend: http://localhost:3001
- Backend API: http://localhost:3000

### 6. Production Build
```bash
npm run build
# Frontend builds to frontend/build/
# Backend reads FRONTEND_DIR=../frontend/build
npm start
```

---

## 👥 User Roles & Access

| Role | Login URL | Access |
|---|---|---|
| Super Admin | `/login` (no slug) | Full platform control |
| Admin | `/login` (with slug) | Restaurant management |
| Kitchen Staff | `/login` (with slug) | Kitchen display |
| Waiter/Staff | `/login` (with slug) | Staff delivery view |
| Customer | `/scan/:slug/:table` | Menu + ordering |

---

## 📱 Flows

### Customer Flow
1. Scan QR code on table → `/scan/{restaurantSlug}/{tableNumber}`
2. Ask waiter for OTP
3. Enter OTP + name → get session token
4. Browse menu, add to cart, place order
5. Track order in real-time
6. Call waiter if needed
7. View bill → pay at counter

### Kitchen Flow
1. Login at `/login` with KITCHEN_STAFF credentials
2. See all active orders in real-time
3. Confirm → mark items Preparing → mark Ready

### Staff Flow
1. Login at `/login` with STAFF credentials
2. See ready orders → deliver → mark Delivered
3. Receive waiter call notifications

---

## 🔌 API Reference

### Auth
- `POST /api/v1/auth/login` — Staff/admin login
- `GET  /api/v1/auth/table-info/:slug/:table` — QR scan info
- `POST /api/v1/auth/otp/generate-staff` — Generate OTP (staff)
- `POST /api/v1/auth/otp/verify` — Customer verifies OTP

### Menu (Public)
- `GET /api/v1/menu/public/:slug` — Get menu (with filters: search, veg, categoryId)

### Orders
- `POST /api/v1/orders/customer` — Place order
- `GET  /api/v1/orders/customer/my-orders` — My orders
- `POST /api/v1/orders/customer/call-waiter` — Call waiter
- `GET  /api/v1/orders/customer/bill` — Get bill
- `GET  /api/v1/orders/kitchen` — Kitchen queue
- `PATCH /api/v1/orders/kitchen/items/:id` — Update item status
- `GET  /api/v1/orders/staff/ready` — Ready orders for delivery
- `PATCH /api/v1/orders/staff/:id/deliver` — Mark delivered

### Super Admin
- `GET  /api/v1/super-admin/tenants` — All tenants
- `POST /api/v1/super-admin/tenants` — Create tenant
- `PATCH /api/v1/super-admin/tenants/:id/status` — Approve/disable
- `GET  /api/v1/super-admin/analytics` — Global stats

---

## 🔌 WebSocket Events

Connect to `ws://localhost:3000/ws`

```json
// Authenticate (staff/admin)
{ "type": "AUTH", "token": "<jwt>" }

// Authenticate (customer)
{ "type": "AUTH_CUSTOMER", "tenantId": "...", "tableId": "..." }
```

Events received:
- `ORDER_CREATED` — New order placed
- `ORDER_UPDATED` — Order status changed
- `ITEM_STATUS_UPDATED` — Individual item status changed
- `ORDER_DELIVERED` — Order delivered to table
- `CALL_WAITER` — Customer called waiter
- `WAITER_CALL_RESOLVED` — Waiter call resolved

---

## 🗄️ Database Schema

Key tables: `tenants`, `users`, `restaurant_tables`, `menu_categories`, `menu_items`, `otp_sessions`, `orders`, `order_items`, `waiter_calls`

See `backend/src/db/schema.sql` for full schema.

---

## 🔒 Security Notes
- All tenant routes validate tenant status (ACTIVE only)
- JWT tokens expire in 7 days (configurable)
- Customer sessions expire in 4 hours
- Rate limiting: 200 requests per 15 min per IP
- All passwords bcrypt-hashed (12 rounds)
- OTPs expire in 10 minutes (configurable)

---

## 📦 Environment Variables

```env
PORT=3000
NODE_ENV=development
FRONTEND_DIR=../frontend/build
DATABASE_URL=postgres://user:pass@localhost:5432/restaurant_saas
JWT_SECRET=change-this-in-production
JWT_EXPIRES_IN=7d
SUPER_ADMIN_EMAIL=admin@yoursaas.com
SUPER_ADMIN_PASSWORD=SuperAdmin@123
OTP_EXPIRY_MINUTES=10
```
