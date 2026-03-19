import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';

interface TenantInfo { name: string; primary_color: string; logo_url: string; }
interface TableInfo { table_number: number; name: string; }

export default function ScanPage() {
  const { tenantSlug, tableNumber } = useParams<{ tenantSlug: string; tableNumber: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<{ tenant: TenantInfo; table: TableInfo } | null>(null);
  const [step, setStep] = useState<'loading' | 'otp' | 'name'>('loading');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/auth/table-info/${tenantSlug}/${tableNumber}`)
      .then(r => { setInfo(r.data); setStep('otp'); })
      .catch(() => setError('Table or restaurant not found.'));
  }, [tenantSlug, tableNumber]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !name) { toast.error('OTP and name required'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/otp/verify', { otp, customerName: name, tenantSlug, tableNumber });
      localStorage.setItem('tf_session', JSON.stringify({ sessionToken: data.sessionToken, tenantId: data.tenantId, tableId: data.tableId, customerName: data.customerName }));
      navigate(`/menu/${tenantSlug}`);
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Verification failed');
    } finally { setLoading(false); }
  };

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
        <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Not Found</h2>
        <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    </div>
  );

  if (step === 'loading') return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: 16 }}>
      <div style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontSize: 48 }}>🍽️</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, margin: '8px 0 4px' }}>{info?.tenant.name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Table {info?.table.table_number} · {info?.table.name}</p>
        </div>
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Welcome! 👋</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 13 }}>Ask your waiter for the OTP to access our menu.</p>
          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">Your Name</label>
              <input className="input" type="text" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">OTP Code</label>
              <input className="input" type="text" placeholder="6-digit OTP" maxLength={6} value={otp} onChange={e => setOtp(e.target.value)} style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center' }} />
            </div>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? <><span className="spinner" />Verifying...</> : '🚀 Access Menu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
