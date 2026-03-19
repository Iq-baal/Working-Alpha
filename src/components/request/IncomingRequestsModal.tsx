import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, XCircle } from 'lucide-react';
import * as db from '../../lib/db';
import { formatDate } from '../../lib/utils';
import { getGlobalCurrency } from '../../lib/appState';
import SendModal from '../send/SendModal';

type MoneyRequest = {
  id: string;
  amountUsdc: number;
  note: string | null;
  status: string;
  requesterUsername: string;
  requesterId: string;
  createdAt: string;
};

interface IncomingRequestsModalProps {
  requests: MoneyRequest[];
  onClose: () => void;
  onResolved: (id: string) => void;
}

export default function IncomingRequestsModal({ requests, onClose, onResolved }: IncomingRequestsModalProps) {
  const currency = getGlobalCurrency();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [payTarget, setPayTarget] = useState<{ username: string; amountUsdc: number } | null>(null);

  const handleDecline = async (id: string) => {
    setLoadingId(id);
    setErrors((e) => ({ ...e, [id]: '' }));
    try {
      await db.respondToMoneyRequest({ requestId: id, action: 'decline' });
      onResolved(id);
    } catch (err: any) {
      setErrors((e) => ({ ...e, [id]: err?.message || 'Failed to decline.' }));
    } finally {
      setLoadingId(null);
    }
  };

  const handlePay = (req: MoneyRequest) => {
    setPayTarget({ username: req.requesterUsername, amountUsdc: req.amountUsdc });
  };

  const formatAmount = (usdc: number) => {
    const converted = usdc * currency.rate;
    return `${currency.symbol}${converted.toFixed(2)} ${currency.code}`;
  };

  return (
    <>
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
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-handle" />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Money Requests</h2>
            <button
              onClick={onClose}
              style={{ background: 'var(--color-border)', border: '1px solid var(--color-border-strong)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-2)' }}
            >
              <X size={16} />
            </button>
          </div>

          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-text-3)', fontSize: 14 }}>
              No pending requests
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '60vh', overflowY: 'auto' }}>
              {requests.map((req) => (
                <div
                  key={req.id}
                  style={{ background: 'var(--color-surface-2)', borderRadius: 16, border: '1px solid var(--color-border)', padding: '14px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                        @{req.requesterUsername}
                      </p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: '#F97316', marginBottom: req.note ? 4 : 0 }}>
                        {formatAmount(req.amountUsdc)}
                      </p>
                      {req.note && (
                        <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic' }}>
                          "{req.note}"
                        </p>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--color-text-4)', flexShrink: 0, marginLeft: 10 }}>
                      {formatDate(req.createdAt)}
                    </p>
                  </div>

                  {errors[req.id] && (
                    <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 8 }}>{errors[req.id]}</p>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      className="btn-secondary"
                      disabled={loadingId === req.id}
                      onClick={() => handleDecline(req.id)}
                      style={{ height: 44, borderRadius: 12, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#EF4444', borderColor: 'rgba(239,68,68,0.3)' }}
                    >
                      <XCircle size={14} /> Decline
                    </button>
                    <button
                      className="btn-primary"
                      disabled={loadingId === req.id}
                      onClick={() => handlePay(req)}
                      style={{ height: 44, borderRadius: 12, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Check size={14} /> Pay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {payTarget && (
          <SendModal
            initialRecipientUsername={payTarget.username}
            initialAmount={payTarget.amountUsdc}
            onClose={() => {
              setPayTarget(null);
              onClose();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
