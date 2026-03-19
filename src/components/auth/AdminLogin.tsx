import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, ArrowRight, Lock } from 'lucide-react';

export default function AdminLogin({ onLogin }: { onLogin: (key: string) => Promise<void> | void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setError('');
    setLoading(true);

    try {
      await onLogin(key.trim());
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Access denied.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--color-bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: '100%', maxWidth: 400,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 24, padding: 32,
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}
      >
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'var(--color-orange-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', color: '#F97316'
        }}>
          <Shield size={28} />
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px' }}>
          Admin Access
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 32 }}>
          Enter the admin secret to elevate this signed-in account.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: error ? '#EF4444' : 'var(--color-text-3)' }} />
            <input
              type="password"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter admin secret"
              style={{
                width: '100%', height: 56,
                background: 'var(--color-surface-2)',
                border: `1px solid ${error ? '#EF4444' : 'var(--color-border)'}`,
                borderRadius: 16, padding: '0 16px 0 48px',
                fontSize: 16, color: 'var(--color-text)',
                outline: 'none', transition: 'all 0.2s'
              }}
            />
          </div>

          <button
            disabled={loading || !key}
            type="submit"
            className="btn-primary"
            style={{
              height: 56, borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: (loading || !key) ? 0.6 : 1
            }}
          >
            {loading ? 'Verifying...' : 'Access Console'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {!!error && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ color: '#EF4444', fontSize: 13, fontWeight: 600, marginTop: 16 }}
          >
            {error}
          </motion.p>
        )}
      </motion.div>

      <p style={{ position: 'absolute', bottom: 40, fontSize: 11, color: 'var(--color-text-4)', fontWeight: 600, letterSpacing: '1px' }}>
        PAYME PROTOCOL SECURITY LAYER
      </p>
    </div>
  );
}
