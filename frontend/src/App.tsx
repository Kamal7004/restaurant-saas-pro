import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import ProtectedRoute, { CustomerRoute } from './components/ProtectedRoute';

// Auth
import LoginPage from './pages/LoginPage';

// Customer
import ScanPage from './pages/customer/ScanPage';
import CustomerMenuPage from './pages/customer/MenuPage';

// Admin
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/Dashboard';
import MenuPage from './pages/admin/MenuPage';
import TablesPage from './pages/admin/TablesPage';
import OrdersPage from './pages/admin/OrdersPage';
import StaffPage from './pages/admin/StaffPage';

// Kitchen & Staff
import KitchenView from './pages/KitchenView';
import StaffView from './pages/StaffView';

// Super Admin
import SuperAdminLayout from './pages/superadmin/SuperAdminLayout';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import TenantsPage from './pages/superadmin/TenantsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-light)',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: 'var(--green)', secondary: '#fff' } },
          error: { iconTheme: { primary: 'var(--red)', secondary: '#fff' } },
        }}
      />

      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/scan/:tenantSlug/:tableNumber" element={<ScanPage />} />

        {/* Customer (session-protected) */}
        <Route element={<CustomerRoute />}>
          <Route path="/menu/:tenantSlug" element={<CustomerMenuPage />} />
        </Route>

        {/* Kitchen */}
        <Route element={<ProtectedRoute roles={['KITCHEN_STAFF', 'ADMIN', 'SUPER_ADMIN']} />}>
          <Route path="/kitchen" element={<KitchenView />} />
        </Route>

        {/* Staff */}
        <Route element={<ProtectedRoute roles={['STAFF', 'ADMIN', 'SUPER_ADMIN']} />}>
          <Route path="/staff" element={<StaffView />} />
        </Route>

        {/* Admin Panel */}
        <Route element={<ProtectedRoute roles={['ADMIN', 'SUPER_ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="staff" element={<StaffPage />} />
          </Route>
        </Route>

        {/* Super Admin Panel */}
        <Route element={<ProtectedRoute roles={['SUPER_ADMIN']} />}>
          <Route path="/super-admin" element={<SuperAdminLayout />}>
            <Route index element={<SuperAdminDashboard />} />
            <Route path="tenants" element={<TenantsPage />} />
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
