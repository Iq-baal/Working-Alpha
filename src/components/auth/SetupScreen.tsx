import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Download } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import PayMeLogo from '../common/PayMeLogo';
import { useNav } from '../../App';
import WalletExport from './WalletExport';

const STEPS = [
  'Securing your account...',
  'Generating your wallet...',
  'Connecting to Solana...',
  'Almost ready...',
  'Welcome to PayMe!',
];

export default function SetupScreen() {
  const { goTo } = useNav();
  const { user, walletPublicKey: walletAddress } = useAuth();
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);
  const [showWalletExport, setShowWalletExport] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const [canContinue, setCanContinue] = useState(false);

  const walletReady = !!walletAddress;

  useEffect(() => {
    let cur = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const advance = () => {
      const maxIdx = walletReady ? STEPS.length - 1 : Math.min(STEPS.length - 2, 2);
      if (cur < maxIdx) {
        cur += 1;
        setStepIdx(cur);
        timer = setTimeout(advance, cur === maxIdx - 1 ? 1200 : 900);
      }
    };
    timer = setTimeout(advance, 800);
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [walletReady]);

  useEffect(() => {
    if (!walletReady || !user) {
      setDone(false);
      setCanContinue(false);
      return;
    }
    const elapsed = Date.now() - startedAt;
    const minDelay = Math.max(0, 3200 - elapsed);
    const timer = setTimeout(() => {
      setDone(true);
      setCanContinue(true);
    }, minDelay);
    return () => clearTimeout(timer);
  }, [walletReady, user, startedAt]);

  return (
    <motion.div
      className="app-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      style={{ background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}
    >
      <div style={{ textAlign: 'center', width: '100%', maxWidth: 360 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '1.5px', marginBottom: 40 }}>STEP 3 OF 3</div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <PayMeLogo size={48} showText={true} textSize="24px" />
        </div>

        <div style={{ margin: '48px 0' }}>
          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div style={{ width: 80, height: 80, margin: '0 auto 32px', position: 'relative' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(249,115,22,0.15)', borderTop: '3px solid #F97316' }} />
                  <motion.div animate={{ rotate: -360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.2)', borderBottom: '2px solid #7C3AED' }} />
                </div>
                <AnimatePresence mode="wait">
                  <motion.p key={stepIdx} initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.15 }} style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-2)', letterSpacing: '-0.3px' }}>
                    {STEPS[stepIdx]}
                  </motion.p>
                </AnimatePresence>
                {!walletReady && (
                  <p style={{ marginTop: 10, fontSize: 12, color: 'var(--color-text-3)' }}>
                    Your secure wallet is being generated. This usually takes a few seconds.
                  </p>
                )}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 24 }}>
                  {STEPS.slice(0, -1).map((_, i) => (
                    <motion.div key={i} animate={{ background: i <= stepIdx ? '#F97316' : 'var(--color-border-strong)', scale: i === stepIdx ? 1.3 : 1 }} transition={{ duration: 0.15 }} style={{ width: 6, height: 6, borderRadius: '50%' }} />
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div key="done" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 1000, damping: 50, mass: 0.3 }}>
                <div style={{ width: 80, height: 80, margin: '0 auto 24px', background: 'rgba(34,197,94,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle size={40} color="#22C55E" />
                </div>
                <p style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>You're all set!</p>
                {walletAddress && (
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 8, fontFamily: 'monospace' }}>
                      {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                    </p>
                    <button
                      onClick={() => setShowWalletExport(true)}
                      style={{
                        marginTop: 16,
                        background: 'var(--color-orange-dim)',
                        color: 'var(--color-orange-light)',
                        border: '1px solid var(--color-orange-light)',
                        borderRadius: 999,
                        padding: '8px 16px',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Download size={14} />
                      Backup Wallet
                    </button>
                  </div>
                )}
                {!walletAddress && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 8 }}>
                    Finalizing wallet provisioning on Solana Devnet...
                  </p>
                )}
                {walletAddress && canContinue && (
                  <button
                    onClick={() => goTo('app')}
                    style={{
                      marginTop: 18,
                      background: '#F97316',
                      color: '#111827',
                      border: 'none',
                      borderRadius: 12,
                      padding: '12px 18px',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    Continue to App
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {user?.email && (
          <div style={{ background: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '12px 18px', fontSize: 13, color: 'var(--color-text-3)' }}>
            Signed in as <strong style={{ color: 'var(--color-text-2)' }}>{user.email}</strong>
          </div>
        )}
      </div>

      {/* Wallet Export Modal */}
      <AnimatePresence>
        {showWalletExport && (
          <WalletExport onClose={() => setShowWalletExport(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
