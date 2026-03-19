import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X as XIcon, ExternalLink, Download, Copy, Check } from 'lucide-react';
import type { Transaction } from '../../types';
import { formatPreciseDate } from '../../lib/utils';
import { getGlobalCurrency, onCurrencyChange } from '../../lib/appState';
import { transactionFromLabel, transactionToLabel } from '../../lib/transactionDisplay';
import PrintReceipt from './PrintReceipt';
import * as db from '../../lib/db';
import { useAuth } from '../../providers/AuthProvider';
import { useAppState } from '../../App';

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#22C55E',
  pending: '#F59E0B',
  failed: '#EF4444',
};

export default function TransactionDetailModal({ transaction, onClose }: TransactionDetailModalProps) {
  const { user } = useAuth();
  const { mode } = useAppState();
  const [showReceipt, setShowReceipt] = useState(false);
  const [copiedField, setCopiedField] = useState<'internal' | 'signature' | null>(null);
  const [thanking, setThanking] = useState(false);
  const [thanksSent, setThanksSent] = useState(!!transaction.gift_acknowledged);
  const [currency, setCurrency] = useState(getGlobalCurrency());
  const isReceive = transaction.type === 'receive';
  const fromLabel = transactionFromLabel(transaction);
  const toLabel = transactionToLabel(transaction);
  const counterpart = isReceive ? fromLabel : toLabel;
  const explorerUrl = transaction.tx_hash
    ? `https://explorer.solana.com/tx/${transaction.tx_hash}?cluster=devnet`
    : null;
  const amountInSelectedCurrency = transaction.amount_usdc * currency.rate;
  const amountDisplay = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountInSelectedCurrency);
  const usdcReference = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(transaction.amount_usdc);
  const canThankGift = transaction.type === 'receive' && transaction.category === 'gift' && !thanksSent;

  useEffect(() => {
    const unsub = onCurrencyChange((next) => setCurrency(next));
    return () => unsub();
  }, []);

  const handleCopy = async (value: string, field: 'internal' | 'signature') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 1400);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--color-overlay)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 1000, damping: 50, mass: 0.3 }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', borderRadius: 'var(--modal-radius) var(--modal-radius) 0 0', borderTop: '1px solid var(--color-divider)', padding: '0 24px 52px', maxHeight: '80vh', overflowY: 'auto' }}
        >
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-divider)', margin: '14px auto 0' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 4px' }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Transaction</h2>
            <button onClick={onClose} style={{ background: 'var(--color-border)', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text)' }}><XIcon size={16} /></button>
          </div>

          <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: '50%', background: isReceive ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.12)', marginBottom: 14 }}>
              <span style={{ fontSize: 22 }}>{isReceive ? '↙' : '↗'}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 6 }}>
              {isReceive ? `From ${counterpart}` : `To ${counterpart}`}
            </p>
            <p style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-2px', color: isReceive ? '#22C55E' : 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
              {isReceive ? '+' : '-'}{currency.symbol}{amountDisplay}
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 4 }}>
              {usdcReference} USDC ({currency.code}) on Solana Devnet
            </p>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--card-radius)', overflow: 'hidden', marginBottom: 16 }}>
            {[
              { label: 'From', value: fromLabel },
              { label: 'To', value: toLabel },
              { label: 'Status', value: <span style={{ color: STATUS_COLORS[transaction.status] || 'var(--color-text)', fontWeight: 700, textTransform: 'capitalize' as const }}>{transaction.status}</span> },
              { label: 'Date and Time', value: formatPreciseDate(transaction.created_at) },
              ...(transaction.category ? [{ label: 'Category', value: transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1) }] : []),
              ...(transaction.narration ? [{ label: 'Note', value: transaction.narration }] : []),
            ].map(({ label, value }, i, arr) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px' }}>
                  <span style={{ fontSize: 14, color: 'var(--color-text-3)' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{value as React.ReactNode}</span>
                </div>
                {i < arr.length - 1 && <div style={{ height: 1, background: 'var(--color-divider)', margin: '0 18px' }} />}
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--card-radius)', padding: '12px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 10, fontWeight: 600 }}>Support IDs</p>
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 4 }}>Transaction ID (Internal)</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{ flex: 1, fontSize: 12, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.2)', overflowWrap: 'anywhere' }}>{transaction.id}</code>
                <button
                  onClick={() => handleCopy(transaction.id, 'internal')}
                  style={{ border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-2)', color: 'var(--color-text)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Copy internal transaction ID"
                >
                  {copiedField === 'internal' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 4 }}>Blockchain Signature</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{ flex: 1, fontSize: 12, padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.2)', overflowWrap: 'anywhere' }}>{transaction.tx_hash || 'Unavailable'}</code>
                <button
                  onClick={() => transaction.tx_hash && handleCopy(transaction.tx_hash, 'signature')}
                  disabled={!transaction.tx_hash}
                  style={{ border: '1px solid var(--color-border-strong)', background: transaction.tx_hash ? 'var(--color-surface-2)' : 'var(--color-border)', color: transaction.tx_hash ? 'var(--color-text)' : 'var(--color-text-4)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: transaction.tx_hash ? 'pointer' : 'not-allowed' }}
                  title="Copy blockchain signature"
                >
                  {copiedField === 'signature' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowReceipt(true)}
            style={{ width: '100%', height: 52, background: 'var(--color-border)', border: '1px solid var(--color-border-strong)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: 'var(--color-text-2)', fontWeight: 600, fontSize: 14, marginBottom: 12 }}
          >
            <Download size={16} /> Download Receipt
          </button>

          <button
            onClick={() => explorerUrl && window.open(explorerUrl, '_blank')}
            disabled={!explorerUrl}
            style={{ width: '100%', height: 46, background: 'none', border: '1px solid var(--color-border)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: explorerUrl ? 'var(--color-text-2)' : 'var(--color-text-4)', fontSize: 13, cursor: explorerUrl ? 'pointer' : 'not-allowed' }}
          >
            <ExternalLink size={14} /> {explorerUrl ? 'View on Solana Explorer (Devnet)' : 'Explorer link unavailable'}
          </button>

          {canThankGift && (
            <button
              onClick={async () => {
                if (mode === 'demo') {
                  setThanksSent(true);
                  return;
                }
                if (!user?.userId) return;
                setThanking(true);
                try {
                  await db.acknowledgeGiftThanks({ transactionId: transaction.id as any, externalUserId: user?.userId });
                  setThanksSent(true);
                } catch (err) {
                  console.error('Failed to send thanks:', err);
                } finally {
                  setThanking(false);
                }
              }}
              disabled={thanking}
              style={{ width: '100%', height: 46, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22C55E', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 12 }}
            >
              {thanking ? 'Sending Thanks...' : 'THANKS'}
            </button>
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showReceipt && <PrintReceipt transaction={transaction} onClose={() => setShowReceipt(false)} />}
      </AnimatePresence>
    </>
  );
}
