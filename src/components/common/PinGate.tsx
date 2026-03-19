import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Delete, Fingerprint } from 'lucide-react';
import { verifyPin, getBiometrics, canUseBiometrics, authenticateWithBiometrics } from '../../lib/appState';

interface PinGateProps {
  onSuccess: () => void;
  onClose: () => void;
  allowClose?: boolean;
}

const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function PinGate({ onSuccess, onClose, allowClose = true }: PinGateProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const biometricsEnabled = getBiometrics() && canUseBiometrics();

  const press = (key: string) => {
    if (key === '⌫') {
      setInput(p => p.slice(0, -1));
      return;
    }
    if (key === '') return;
    const next = input + key;
    setInput(next);

    if (next.length === 4) {
      if (verifyPin(next)) {
        setTimeout(onSuccess, 160);
      } else {
        setShaking(true);
        setError(true);
        setTimeout(() => {
          setInput('');
          setError(false);
          setShaking(false);
        }, 700);
      }
    }
  };

  const dotColor = (i: number) =>
    error ? '#EF4444' : input.length > i ? '#F97316' : 'var(--color-text-4)';

  const tryBiometric = async () => {
    if (!biometricsEnabled || bioLoading) return;
    setBioLoading(true);
    const ok = await authenticateWithBiometrics();
    setBioLoading(false);
    if (ok) {
      onSuccess();
      return;
    }
    setShaking(true);
    setError(true);
    setTimeout(() => {
      setError(false);
      setShaking(false);
    }, 650);
  };

  useEffect(() => {
    if (!biometricsEnabled) return;
    void tryBiometric();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'var(--color-overlay)',
        backdropFilter: 'blur(20px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '0 24px',
      }}
    >
      {/* Close */}
      {allowClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 52, right: 24,
            background: 'var(--color-border)', border: 'none',
            borderRadius: '50%', width: 38, height: 38,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--color-text)',
          }}
        >
          <X size={17} />
        </button>
      )}

      {/* Title */}
      <p style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Enter PIN</p>
      <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 48, textAlign: 'center' }}>
        {getBiometrics() ? 'Use your PIN or biometric to confirm' : 'Enter your 4-digit transaction PIN'}
      </p>

      {/* Dots */}
      <motion.div
        animate={shaking ? { x: [0, -10, 10, -8, 8, -5, 5, 0] } : {}}
        transition={{ duration: 0.5 }}
        style={{ display: 'flex', gap: 20, marginBottom: 56 }}
      >
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            animate={{
              background: dotColor(i),
              scale: input.length === i + 1 ? [1, 1.15, 1] : 1,
            }}
            transition={{ duration: 0.15 }}
            style={{
              width: 18, height: 18, borderRadius: '50%',
              background: dotColor(i),
              border: `2px solid ${error ? '#EF444488' : 'var(--color-text-4)'}`,
            }}
          />
        ))}
      </motion.div>

      {biometricsEnabled && (
        <button
          onClick={tryBiometric}
          disabled={bioLoading}
          style={{
            marginBottom: 20,
            height: 42,
            minWidth: 180,
            borderRadius: 999,
            border: '1px solid var(--color-border-strong)',
            background: 'var(--color-border)',
            color: 'var(--color-text)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            cursor: bioLoading ? 'wait' : 'pointer',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Fingerprint size={16} />
          {bioLoading ? 'Checking...' : 'Use Biometrics'}
        </button>
      )}

      {/* Numeric keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, width: '100%', maxWidth: 300 }}>
        {PAD.map((key, i) => (
          <motion.button
            key={i}
            whileTap={key ? { scale: 0.88, background: 'rgba(249,115,22,0.2)' } : {}}
            onClick={() => press(key)}
            style={{
              height: 72,
              background: key === '' ? 'transparent' : 'var(--color-border)',
              border: key === '' ? 'none' : '1px solid var(--color-border-strong)',
              borderRadius: 18,
              cursor: key === '' ? 'default' : 'pointer',
              color: 'var(--color-text)',
              fontSize: key === '⌫' ? 20 : 28,
              fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
              fontFamily: 'inherit',
            }}
          >
            {key === '⌫' ? <Delete size={22} /> : key}
          </motion.button>
        ))}
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ color: '#EF4444', fontSize: 14, marginTop: 24, fontWeight: 600 }}
        >
          Incorrect PIN. Try again.
        </motion.p>
      )}
    </motion.div>
  );
}
