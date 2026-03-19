import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../providers/AuthProvider';
import { Check, AlertCircle, Loader } from 'lucide-react';
import PayMeLogo from '../common/PayMeLogo';
import { useNav, useAppState } from '../../App';
import * as db from '../../lib/db';

export default function UsernameClaim({ onClaimed }: { onClaimed?: () => void }) {
  const { goTo } = useNav();
  const { user, walletPublicKey: walletAddress, refreshUser } = useAuth();
  const { mode } = useAppState();
  
  const displayName = user?.email?.split('@')[0] || 'User';
  
  const [username, setUsername] = useState(displayName.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [availability, setAvailability] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const availabilityRequestRef = useRef(0);

  const handleClaim = async () => {
    const normalized = username.trim().toLowerCase();
    if (normalized.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (/[^a-z0-9_]/.test(normalized)) {
      setError('Only lowercase letters, numbers, and underscores allowed');
      return;
    }
    if (mode === 'live') {
      if (availability === 'checking') {
        setError('Checking username availability...');
        return;
      }
      if (availability === 'taken') {
        setError('Username is already taken.');
        return;
      }
      if (availability === 'invalid') {
        setError('Username is invalid.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      if (mode === 'live') {
        if (!user) {
           throw new Error("Cannot claim username; user is not authenticated.");
        }
        if (!walletAddress) {
          throw new Error("Wallet is still provisioning. Please wait a few seconds and try again.");
        }
        // Claim username via API
        await db.claimUsername({
          username: normalized,
        });
        await refreshUser();
        onClaimed?.();
        setLoading(false);
        goTo('app');
      } else {
        // ==== DEMO MODE ====
        // Simulate network delay for demo
        await new Promise(r => setTimeout(r, 1200));
        onClaimed?.();
        setLoading(false);
        goTo('app');
      }
    } catch (err: any) {
      console.error('Failed to claim username:', err);
      const message = err?.data || err?.message || 'Failed to claim username. Please try again.';
      setError(typeof message === 'string' ? message : 'Failed to claim username. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== 'live') {
      setAvailability('idle');
      return;
    }

    const normalized = username.trim().toLowerCase();
    if (!normalized || normalized.length < 3) {
      setAvailability('idle');
      return;
    }
    if (/[^a-z0-9_]/.test(normalized)) {
      setAvailability('invalid');
      return;
    }

    const requestId = ++availabilityRequestRef.current;
    setAvailability('checking');
    const timer = setTimeout(async () => {
      try {
        const result = await db.checkUsernameAvailability({
          username: normalized,
        });
        if (availabilityRequestRef.current !== requestId) return;
        setAvailability(result.available ? 'available' : 'taken');
      } catch (err) {
        if (availabilityRequestRef.current !== requestId) return;
        setAvailability('taken');
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, mode, user?.userId]);

  return (
    <motion.div
      className="app-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      style={{ background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}
    >
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <PayMeLogo size={56} showText={false} />
        </div>
        
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 12 }}>Claim your username</h2>
        <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 40, lineHeight: 1.5 }}>
          This is how friends will find you and send you money. <strong style={{color: 'var(--color-text)'}}>It cannot be changed later.</strong>
        </p>

        <div style={{ marginBottom: 24, textAlign: 'left' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 16, fontSize: 20, fontWeight: 700, color: 'var(--color-text-3)', pointerEvents: 'none' }}>@</span>
            <input
              value={username}
              onChange={e => {
                setUsername(e.target.value.toLowerCase().replace(/\s/g, ''));
                if (error) setError('');
              }}
              placeholder="username"
              style={{
                width: '100%',
                height: 64,
                background: 'var(--color-border)',
                border: `2px solid ${error ? '#EF4444' : 'var(--color-border-strong)'}`,
                borderRadius: 20,
                padding: '0 20px 0 42px',
                fontSize: 20,
                fontWeight: 700,
                color: 'var(--color-text)',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
          </div>
          {mode === 'live' && username.trim().length >= 3 && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: availability === 'available' ? '#22C55E' : availability === 'taken' || availability === 'invalid' ? '#EF4444' : 'var(--color-text-3)' }}>
              {availability === 'checking' && <Loader size={14} className="spin" />}
              {availability === 'available' && <Check size={14} />}
              {availability === 'taken' && <AlertCircle size={14} />}
              {availability === 'invalid' && <AlertCircle size={14} />}
              {availability === 'checking' && 'Checking availability...'}
              {availability === 'available' && 'Username is available'}
              {availability === 'taken' && 'Username is already taken'}
              {availability === 'invalid' && 'Only lowercase letters, numbers, and underscores allowed'}
              {availability === 'idle' && null}
            </div>
          )}
          {error && (
            <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} style={{ color: '#EF4444', fontSize: 12, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} /> {error}
            </motion.p>
          )}
        </div>

        <button 
          className="btn-primary" 
          onClick={handleClaim} 
          disabled={
            loading ||
            !username ||
            (mode === 'live' && !walletAddress) ||
            (mode === 'live' && availability === 'checking') ||
            (mode === 'live' && (availability === 'taken' || availability === 'invalid'))
          }
          style={{ width: '100%', height: 56, fontSize: 16, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading ? <Loader size={20} className="spin" /> : <Check size={20} />}
          {loading ? 'Claiming...' : 'Claim Username'}
        </button>
        {mode === 'live' && !walletAddress && (
          <p style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-3)' }}>
            Creating your wallet on Solana Devnet...
          </p>
        )}
      </div>
    </motion.div>
  );
}
