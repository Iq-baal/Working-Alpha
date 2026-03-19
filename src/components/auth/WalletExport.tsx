import { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Shield } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';

interface WalletExportProps {
  onClose: () => void;
}

export default function WalletExport({ onClose }: WalletExportProps) {
  const { walletPublicKey: walletAddress } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!walletAddress) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-overlay"
        onClick={onClose}
      >
        <motion.div
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>Wallet Not Ready</h2>
            <button onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <p>Wallet address is still provisioning. Please wait a moment and try again.</p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        className="modal-content"
        style={{ maxWidth: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Wallet Info</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16, padding: 18, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Shield size={18} color="#22C55E" />
              <strong>Embedded Wallet</strong>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Your wallet keys are secured by your embedded wallet provider. Private key export may be available after Turnkey integration.
            </p>
          </div>

          <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: 'var(--color-text-2)' }}>
            Public Address
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              value={walletAddress}
              readOnly
              style={{
                flex: 1,
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                padding: '10px 12px',
                color: 'var(--color-text)',
                fontSize: 12,
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={() => copyToClipboard(walletAddress)}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                border: '1px solid var(--color-border)',
                background: copied ? 'rgba(34,197,94,0.2)' : 'var(--color-surface-2)',
                color: copied ? '#22C55E' : 'var(--color-text-2)',
                cursor: 'pointer',
              }}
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
