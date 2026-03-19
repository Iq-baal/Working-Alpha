import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, ArrowRight, XCircle, CheckCircle2 } from 'lucide-react';
import * as db from '../../lib/db';
import { useAuth } from '../../providers/AuthProvider';


export default function InviteGate({ onAuthorized }: { onAuthorized: () => void }) {
  const { user, refreshUser } = useAuth();
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !user?.userId) return;

    setStatus('loading');
    try {
      const result = await db.validateInviteCode({ code, externalUserId: user?.userId });
      if (result.valid) {
        setStatus('success');
        await refreshUser();
        setTimeout(() => onAuthorized(), 1000);
      }
    } catch (err: any) {
      setStatus('error');
      const msg = err.message || '';
      if (msg.includes('MAX_REACHED')) {
        setErrorMsg('Get another code, this one has reached its Max');
      } else if (msg.includes('INVALID_CODE')) {
        setErrorMsg('Invalid code. Please try again.');
      } else {
        setErrorMsg(msg || 'Verification failed');
      }
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(var(--color-bg-rgb), 0.8)',
      backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          width: '100%', maxWidth: 400,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 32, padding: 32,
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: 'var(--color-orange-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px', color: '#F97316'
        }}>
          <KeyRound size={32} />
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, letterSpacing: '-0.5px' }}>
          Who invited you?
        </h2>
        <p style={{ fontSize: 15, color: 'var(--color-text-3)', marginBottom: 32, lineHeight: 1.5 }}>
          PayMe Protocol is currently in private beta. Please enter your invite code to join.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ENTER CODE HERE"
              autoFocus
              style={{
                width: '100%', height: 60,
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 18, padding: '0 20px',
                fontSize: 16, fontWeight: 700,
                color: 'var(--color-text)',
                textAlign: 'center',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                outline: 'none'
              }}
            />
          </div>

          <button
            disabled={status === 'loading' || !code.trim() || status === 'success'}
            type="submit"
            className="btn-primary"
            style={{
              height: 60, borderRadius: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontSize: 16, fontWeight: 700,
              background: status === 'success' ? '#22C55E' : undefined,
              opacity: (status === 'loading' || !code.trim()) ? 0.6 : 1
            }}
          >
            {status === 'loading' ? 'Verifying...' : 
             status === 'success' ? 'Access Granted' : 'Start Paying'}
            {status === 'idle' && <ArrowRight size={20} />}
            {status === 'success' && <CheckCircle2 size={20} />}
          </button>
        </form>

        <AnimatePresence>
          {status === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                marginTop: 20, padding: '12px 16px',
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 14,
                display: 'flex', alignItems: 'center', gap: 10,
                color: '#EF4444', fontSize: 13, fontWeight: 600
              }}
            >
              <XCircle size={18} />
              <p>{errorMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
