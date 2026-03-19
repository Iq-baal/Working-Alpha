import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Copy, Check, ExternalLink, Banknote, Globe } from 'lucide-react';
import QRCode from 'react-qr-code';

interface ReceiveModalProps {
  walletAddress: string;
  recipientUsername?: string;
  onClose: () => void;
}

type ReceiveTab = 'qr' | 'address' | 'ramp';

export default function ReceiveModal({ walletAddress, recipientUsername, onClose }: ReceiveModalProps) {
  const [activeTab, setActiveTab] = useState<ReceiveTab>('qr');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const normalizedUsername = (recipientUsername || '').trim().replace(/^@+/, '').toLowerCase();
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://payme-protocol.pages.dev';
  const payLink = normalizedUsername ? `${appOrigin}/?pay=${encodeURIComponent(normalizedUsername)}` : '';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 600, damping: 38 }}
        className="modal-sheet"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-handle" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Receive Money</h2>
          <button onClick={onClose} style={{ background: 'var(--color-border)', border: '1px solid var(--color-border-strong)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-2)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', background: 'var(--color-border)',
          borderRadius: 14, padding: 4, marginBottom: 28, gap: 4,
        }}>
          {(['qr', 'address', 'ramp'] as ReceiveTab[]).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              style={{
                flex: 1,
                background: activeTab === t ? '#F97316' : 'transparent',
                border: 'none', borderRadius: 11, padding: '9px 4px',
                cursor: 'pointer', color: activeTab === t ? 'var(--color-text)' : 'var(--color-text-3)',
                fontSize: 12, fontWeight: activeTab === t ? 700 : 500,
                transition: 'all 0.2s',
              }}
            >
              {t === 'qr' ? 'QR Code' : t === 'address' ? 'Address' : 'Add Funds'}
            </button>
          ))}
        </div>

        <AnimatePresence initial={false}>

          {/* QR Tab */}
          {activeTab === 'qr' && (
            <motion.div key="qr" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ textAlign: 'center' }}>
              <div style={{
                background: 'var(--color-text)', borderRadius: 24, padding: 24,
                display: 'inline-block', marginBottom: 20,
              }}>
                <QRCode
                  value={payLink || walletAddress || 'loading...'}
                  size={200}
                  bgColor="var(--color-text)"
                  fgColor="var(--color-bg)"
                />
              </div>
              <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 20, lineHeight: 1.5 }}>
                Scan to open PayMe send flow prefilled with your username
              </p>
              <button
                className="btn-secondary"
                onClick={() => handleCopy(payLink)}
                disabled={!payLink}
                style={{ width: '100%', height: 48, opacity: !payLink ? 0.5 : 1 }}
              >
                {copied ? <Check size={16} color="#22C55E" /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Payment Link'}
              </button>
            </motion.div>
          )}

          {/* Address Tab */}
          {activeTab === 'address' && (
            <motion.div key="address" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 16, lineHeight: 1.5 }}>
                Share your Solana wallet address to receive USDC from anywhere.
              </p>
              <div style={{
                background: 'var(--color-border)',
                border: '1px solid var(--color-border)',
                borderRadius: 16, padding: 20, marginBottom: 16,
              }}>
                <p style={{ fontFamily: 'monospace', fontSize: 13, lineHeight: 1.7, wordBreak: 'break-all', color: 'var(--color-text-2)' }}>
                  {walletAddress || 'Loading your secure wallet address...'}
                </p>
              </div>
              <button
                className="btn-primary"
                onClick={() => handleCopy(walletAddress)}
                disabled={!walletAddress}
                style={{ width: '100%', height: 52, marginBottom: 12, opacity: !walletAddress ? 0.5 : 1 }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Full Address'}
              </button>
              <button
                className="btn-ghost"
                onClick={() => window.open(`https://explorer.solana.com/address/${walletAddress}?cluster=devnet`, '_blank')}
                disabled={!walletAddress}
                style={{ width: '100%', height: 44, fontSize: 13, opacity: !walletAddress ? 0.5 : 1 }}
              >
                <ExternalLink size={14} />
                View on Solana Explorer
              </button>
            </motion.div>
          )}

          {/* Ramp Tab */}
          {activeTab === 'ramp' && (
            <motion.div key="ramp" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div style={{
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.2)',
                borderRadius: 16, padding: 16, marginBottom: 20,
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <Banknote size={20} color="#F97316" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
                  <strong style={{ color: '#F97316' }}>Testnet mode:</strong>{' '}
                  Fiat on-ramping (Yellow Card, Kotani Pay) will be live at mainnet launch.
                  On devnet, you receive free test tokens automatically.
                </p>
              </div>

              {[
                { name: 'Yellow Card', region: 'Nigeria · Ghana · Kenya · 15 more', icon: Globe, color: '#F97316', fee: '1.5–3%', status: 'Mainnet' },
                { name: 'Kotani Pay', region: 'M-Pesa · East Africa', icon: Banknote, color: '#22C55E', fee: '1–2%', status: 'Mainnet' },
                { name: 'MoonPay', region: 'Global · 100+ countries', icon: Globe, color: '#0EA5E9', fee: '1.99%+', status: 'Mainnet' },
              ].map(({ name, region, icon: Icon, color, fee, status }) => (
                <div key={name} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 16, padding: '14px 16px', marginBottom: 10, opacity: 0.7,
                }}>
                  <div style={{ width: 36, display: 'flex', justifyContent: 'center' }}><Icon size={26} color={color} /></div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{name}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{region}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)' }}>{fee}</p>
                    <span className="coming-soon">{status}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
