import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      if (user.role === 'SUPER_ADMIN') navigate('/super-admin');
      else if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'KITCHEN_STAFF') navigate('/kitchen');
      else if (user.role === 'STAFF') navigate('/staff');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Fill in email and password'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password, tenantSlug: tenantSlug || undefined });
      login(data.user, data.token);
      const role = data.user.role;
      if (role === 'SUPER_ADMIN') navigate('/super-admin');
      else if (role === 'ADMIN') navigate('/admin');
      else if (role === 'KITCHEN_STAFF') navigate('/kitchen');
      else navigate('/staff');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '16px' }}>
      <div style={{ maxWidth: 440, width: '100%' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 40 }}>🍽️</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--text-primary)' }}>TableFlow</span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Restaurant Management Platform</p>
        </div>

        <div className="card" style={{ padding: 36 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Sign In</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: 13 }}>Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="input-group">
              <label className="input-label">Email address</label>
              <input className="input" type="email" placeholder="admin@yoursaas.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Restaurant slug <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(leave blank for super admin)</span></label>
              <input className="input" type="text" placeholder="my-restaurant (optional)" value={tenantSlug} onChange={e => setTenantSlug(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <><span className="spinner" />Signing in...</> : '🔒 Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)', fontSize: 12 }}>
          © 2025 TableFlow SaaS — All rights reserved
        </p>
      </div>
    </div>
  );
}
