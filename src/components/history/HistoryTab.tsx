import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, ArrowUpRight, ArrowDownLeft, Gift, RefreshCw } from 'lucide-react';
import { getInitials, getAvatarColor, formatDate } from '../../lib/utils';
import { getGlobalCurrency, onCurrencyChange } from '../../lib/appState';
import { transactionFromLabel, transactionToLabel } from '../../lib/transactionDisplay';
import TransactionDetailModal from './TransactionDetailModal';

import { useHistory } from '../../hooks/useDataHooks';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { TransactionSkeleton } from '../common/LoadingSkeleton';

const formatCompactCurrency = (amount: number, symbol: string) => {
  const abs = Math.abs(amount);
  if (abs >= 1_000) {
    return `${symbol}${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)}`;
  }
  return `${symbol}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
};

export default function HistoryTab() {
  const { transactions: transactionsRaw, loading, refresh } = useHistory();
  const transactions = transactionsRaw ?? [];
  const [selectedTx, setSelectedTx] = useState<typeof transactions[0] | null>(null);
  const [currency, setCurrency] = useState(getGlobalCurrency());
  const pull = usePullToRefresh(async () => {
    await refresh();
  });
  useEffect(() => {
    const unsub = onCurrencyChange((next) => setCurrency(next));
    return () => unsub();
  }, []);
  const totalReceived = transactions
    .filter((tx) => tx.type === 'receive')
    .reduce((sum, tx) => sum + tx.amount_usdc * currency.rate, 0);
  const totalSent = transactions
    .filter((tx) => tx.type === 'send')
    .reduce((sum, tx) => sum + tx.amount_usdc * currency.rate, 0);

  // Note: Local useEffect for onTransactionsChange is removed as useHistory handles it

  return (
    <div ref={pull.rootRef} {...pull.bind} style={{ padding: '20px 20px 0', position: 'relative' }}>
      <div
        style={{
          height: pull.pullDistance,
          opacity: pull.pullDistance > 0 || pull.refreshing ? 1 : 0,
          transition: pull.refreshing ? 'none' : 'height 0.2s ease, opacity 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', borderRadius: 999, padding: '6px 12px', color: 'var(--color-text-3)', fontSize: 12, fontWeight: 600 }}>
          <RefreshCw size={13} className={pull.refreshing ? 'spin' : undefined} />
          <span>{pull.refreshing ? 'Refreshing...' : pull.ready ? 'Release to refresh' : 'Pull to refresh'}</span>
        </div>
      </div>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 6 }}>History</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 24 }}>All your transactions on Solana devnet</p>

        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Received', amount: formatCompactCurrency(totalReceived, currency.symbol), color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
            { label: 'Total Sent', amount: formatCompactCurrency(totalSent, currency.symbol), color: '#F97316', bg: 'rgba(249,115,22,0.1)' },
          ].map(({ label, amount, color, bg }) => (
            <div key={label} style={{ background: bg, borderRadius: 16, padding: '16px', border: `1px solid ${color}22` }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.4px' }}>{label.toUpperCase()}</p>
              <p style={{ fontSize: 'clamp(16px, 4.6vw, 22px)', fontWeight: 800, color, letterSpacing: '-0.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{amount}</p>
            </div>
          ))}
        </div>

        <p className="section-header">All Transactions</p>

        <div style={{ background: 'var(--color-surface)', borderRadius: 20, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <TransactionSkeleton />
              <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />
              <TransactionSkeleton />
              <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />
              <TransactionSkeleton />
              <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />
              <TransactionSkeleton />
            </div>
          ) : (
            <AnimatePresence>
              {transactions.map((tx, i) => {
                const isReceive = tx.type === 'receive';
                const displayName = isReceive ? transactionFromLabel(tx) : transactionToLabel(tx);
                const name = displayName || 'Unknown';
                const initials = getInitials(displayName);
                const color = tx.category === 'bonus' ? '#F97316' : getAvatarColor(displayName);
                const avatarBase64 = tx.category === 'bonus' ? null : (isReceive ? tx.from_avatar_base64 : tx.to_avatar_base64);

                return (
                  <div key={tx.id}>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ 
                        delay: i * 0.03,
                        type: 'spring',
                        stiffness: 450,
                        damping: 30
                      }}
                      whileHover={{ scale: 1.01, backgroundColor: 'var(--color-border)' }}
                      whileTap={{ scale: 0.99 }}
                      className="row-item"
                      style={{ padding: '14px 18px', cursor: 'pointer', transition: 'background-color 0.2s' }}
                      onClick={() => setSelectedTx(tx)}
                    >
                      <div style={{ position: 'relative' }}>
                        <div className="avatar" style={{ width: 46, height: 46, background: tx.category === 'bonus' ? 'rgba(249,115,22,0.15)' : color, color: tx.category === 'bonus' ? '#F97316' : 'var(--color-text)' }}>
                          {tx.category === 'bonus' ? <Gift size={20} /> : avatarBase64 ? <img src={avatarBase64} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', display: 'block' }} /> : <span>{initials}</span>}
                        </div>
                        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: isReceive ? '#22C55E' : '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-surface)' }}>
                          {isReceive ? <ArrowDownLeft size={9} color="var(--color-text)" /> : <ArrowUpRight size={9} color="var(--color-text)" />}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{name}</p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                          {tx.note || formatDate(tx.created_at)} {tx.note ? `· ${formatDate(tx.created_at)}` : ''}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, fontSize: 15, color: isReceive ? '#22C55E' : 'var(--color-text)', fontVariantNumeric: 'tabular-nums' }}>
                          {isReceive ? '+' : '-'}{formatCompactCurrency(tx.amount_usdc * currency.rate, currency.symbol)}
                        </p>
                        <p style={{ fontSize: 10, color: 'var(--color-text-3)', marginTop: 2 }}>{currency.code}</p>
                      </div>
                    </motion.div>
                    {i < transactions.length - 1 && <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />}
                  </div>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-4)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Clock size={13} /> All transactions shown
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedTx && (
          <TransactionDetailModal
            transaction={selectedTx}
            onClose={() => setSelectedTx(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
