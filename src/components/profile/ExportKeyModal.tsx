import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ShieldCheck, Key, Copy, Check } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';

interface ExportKeyModalProps {
  onClose: () => void;
}

type ExportStep = 'warning' | 'password' | 'processing' | 'finished';

export default function ExportKeyModal({ onClose }: ExportKeyModalProps) {
  const { decryptWallet } = useAuth();
  const [step, setStep] = useState<ExportStep>('warning');
  const [errorMessage, setErrorMessage] = useState('');
  const [exportedSecret, setExportedSecret] = useState<string>('');
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);

  const handleStartExport = async () => {
    if (!password) {
      setErrorMessage('Enter your password to decrypt your wallet.');
      return;
    }
    setErrorMessage('');
    setExportedSecret('');
    setStep('processing');
    try {
      const secretKey = await decryptWallet(password);
      if (!secretKey) {
        setErrorMessage('Incorrect password or wallet not found.');
        setStep('password');
        return;
      }

      // Encode secret key as base58
      const { default: bs58 } = await import('bs58');
      const secretKeyBase58 = bs58.encode(secretKey);
      setExportedSecret(secretKeyBase58);
      setStep('finished');
    } catch (err) {
      console.error('Wallet export failed:', err);
      const message = err instanceof Error ? err.message : 'Private key export failed. Please try again.';
      setErrorMessage(message);
      setStep('password');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(exportedSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="modal-overlay"
      style={{ zIndex: 600 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="modal-sheet"
        style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', padding: '0 24px 44px' }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-divider)', margin: '14px auto 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 24px' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Export Private Key</h2>
          <button onClick={onClose} style={{ background: 'var(--color-border)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text)' }}><X size={16} /></button>
        </div>

        {errorMessage && (
          <div style={{ display: 'flex', gap: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#FCA5A5', borderRadius: 12, padding: '10px 12px', marginBottom: 18 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, lineHeight: 1.45 }}>{errorMessage}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'warning' && (
            <motion.div
              key="warning"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <AlertTriangle size={32} color="#EF4444" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#EF4444', marginBottom: 12 }}>Extreme Caution Required</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: 24 }}>
                Your private key is the master key to your funds. Anyone who has it can steal your money permanently.
                <br /><br />
                <strong>PayMe will never ask for your private key.</strong> Do not share it with anyone, including support.
              </p>
              
              <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--card-radius)', padding: '16px', textAlign: 'left', marginBottom: 32, border: '1px solid var(--color-divider)' }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-3)', display: 'flex', gap: 10 }}>
                   <ShieldCheck size={18} color="#F97316" style={{ flexShrink: 0 }} />
                   <span>Only export if you intend to move your wallet to another provider like Phantom or Solflare.</span>
                </p>
              </div>

              <button 
                onClick={() => setStep('password')}
                className="btn-primary" 
                style={{ width: '100%', height: 54, borderRadius: 18, background: '#EF4444' }}
              >
                I understand, continue
              </button>
            </motion.div>
          )}

          {step === 'password' && (
            <motion.div
              key="password"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(249,115,22,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Key size={32} color="#F97316" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Enter your password</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 20, lineHeight: 1.5 }}>
                Your private key is encrypted with your account password.
              </p>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleStartExport()}
                style={{
                  width: '100%', height: 54,
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: '0 16px',
                  fontSize: 16, color: '#fff',
                  outline: 'none', fontFamily: 'inherit',
                  marginBottom: 16,
                }}
              />
              <button 
                onClick={handleStartExport}
                className="btn-primary" 
                style={{ width: '100%', height: 54, borderRadius: 18, background: '#EF4444' }}
              >
                Export Now
              </button>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              style={{ textAlign: 'center', padding: '24px 0' }}
            >
              <div style={{ width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px', border: '4px solid rgba(249,115,22,0.2)', borderTop: '4px solid #F97316' }} className="spinner" />
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Decrypting wallet...</h3>
            </motion.div>
          )}

          {step === 'finished' && (
            <motion.div
              key="finished"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', padding: '20px 0' }}
            >
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Key size={32} color="#22C55E" />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Private Key Exported</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-2)', marginBottom: 16 }}>
                Store this secret offline immediately. Never share it.
              </p>
              <div style={{ position: 'relative' }}>
                <textarea
                  readOnly
                  value={exportedSecret}
                  style={{
                    width: '100%', minHeight: 80, borderRadius: 12, padding: 12,
                    border: '1px solid var(--color-border-strong)', background: 'var(--color-surface)',
                    color: 'var(--color-text)', fontSize: 12, fontFamily: 'monospace', marginBottom: 16,
                  }}
                />
                <button
                  onClick={handleCopy}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
                >
                  {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                </button>
              </div>
              <button onClick={onClose} className="btn-primary" style={{ width: '100%', height: 52, borderRadius: 16 }}>Close</button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
