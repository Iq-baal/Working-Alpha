import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { X, HandCoins, Check, XCircle } from 'lucide-react';
import * as db from '../../lib/db';
import { useAsyncQuery } from '../../hooks/useAsyncQuery';
import { useAuth } from '../../providers/AuthProvider';
import { useAppState } from '../../App';
import { getGlobalCurrency } from '../../lib/appState';

interface RequestMoneyModalProps {
  onClose: () => void;
}

const CONTACT_GUARD_HINTS = [
  'do not know you',
  'outside your circle',
  'anti-begging shield',
  'trusted contact',
  'build the connection',
  'not saved you',
];

function cleanErrorMessage(raw: unknown) {
  const text = String(raw || '').replace(/\r/g, '').trim();
  if (!text) return 'Request failed.';

  const uncaught = text.match(/Uncaught Error:\s*([^.\n][^\n]*)/i);
  if (uncaught?.[1]) return uncaught[1].trim();

  const serverBlock = text.split('\n').find((line) => line.trim() && !line.includes('[CONVEX') && !line.includes('Called by client') && !line.includes('at ') && !line.includes('Request ID'));
  if (serverBlock) return serverBlock.trim();

  return text.split('\n')[0].trim();
}

function isContactGuardMessage(message: string) {
  const normalized = message.toLowerCase();
  return CONTACT_GUARD_HINTS.some((hint) => normalized.includes(hint));
}

export default function RequestMoneyModal({ onClose }: RequestMoneyModalProps) {
  const { user } = useAuth();
  const { mode } = useAppState();
  const currency = getGlobalCurrency();

  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [blockedMessage, setBlockedMessage] = useState('');
  const normalizedTarget = target.trim().toLowerCase();
  const looksLikeUsername = normalizedTarget.length > 0 && normalizedTarget.length < 20 && !normalizedTarget.includes(' ');
  const queryUsername = looksLikeUsername ? normalizedTarget.replace(/^@+/, '') : '';
  const usernameResults = useAsyncQuery(
    mode === 'live' && user?.userId && queryUsername.length >= 2
      ? () => db.searchUsers({ query: queryUsername, externalUserId: user?.userId })
      : null,
    [mode, user?.userId, queryUsername]
  ) as any[] | undefined;

  const usernameState = useMemo(() => {
    if (!looksLikeUsername || queryUsername.length < 2) return 'idle' as const;
    if (mode === 'live' && usernameResults === undefined) return 'checking' as const;
    const exact = (usernameResults || []).some((u) => (u?.username || '').toLowerCase() === queryUsername && !u?.isSelf);
    return exact ? 'valid' as const : 'invalid' as const;
  }, [looksLikeUsername, queryUsername, mode, usernameResults]);

  const formatAmountInput = (raw: string) => {
    if (!raw) return '';
    const [intPartRaw, decPartRaw] = raw.split('.');
    const intPart = (intPartRaw || '0').replace(/^0+(?=\d)/, '') || '0';
    const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    if (decPartRaw === undefined) return withCommas;
    return `${withCommas}.${decPartRaw}`;
  };

  const normalizeAmountInput = (value: string) => {
    const cleaned = value.replace(/,/g, '').replace(/[^\d.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot === -1) return cleaned;
    const before = cleaned.slice(0, firstDot + 1);
    const after = cleaned.slice(firstDot + 1).replace(/\./g, '');
    return before + after;
  };

  const submit = async () => {
    const amountNum = Number(amount.replace(/,/g, ''));
    if (!target.trim()) {
      setError('Enter username or wallet address.');
      return;
    }
    if (looksLikeUsername && usernameState === 'invalid') {
      setError('That username does not exist on PayMe.');
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('Enter a valid amount.');
      return;
    }

    setError('');
    setSuccess('');
    setBlockedMessage('');
    setSaving(true);
    try {
      if (mode === 'demo') {
        await new Promise((r) => setTimeout(r, 700));
        setSuccess('Request sent in demo mode.');
      } else {
        await db.requestMoney({
          target: target.trim(),
          amount: amountNum / currency.rate,
          note: note.trim() || undefined,
          externalUserId: user?.userId,
        });
        setSuccess('Request sent successfully.');
      }
    } catch (e: any) {
      const cleaned = cleanErrorMessage(e?.message || e);
      if (isContactGuardMessage(cleaned)) {
        setBlockedMessage(cleaned);
        setError('');
      } else {
        setError(cleaned || 'Request failed.');
      }
    } finally {
      setSaving(false);
    }
  };

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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Request Money</h2>
          <button onClick={onClose} style={{ background: 'var(--color-border)', border: '1px solid var(--color-border-strong)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-2)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="@username or wallet address"
              className="input-field"
              style={{ paddingRight: 40 }}
            />
            {looksLikeUsername && queryUsername.length >= 2 && (
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                {usernameState === 'valid' && <Check size={16} color="#22C55E" />}
                {usernameState === 'invalid' && <XCircle size={16} color="#EF4444" />}
              </div>
            )}
          </div>
          <input
            value={formatAmountInput(amount)}
            onChange={(e) => setAmount(normalizeAmountInput(e.target.value))}
            placeholder={`Amount (${currency.code})`}
            className="input-field"
            inputMode="decimal"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="input-field"
          />
          {error && <p style={{ color: '#EF4444', fontSize: 12 }}>{error}</p>}
          {success && <p style={{ color: '#22C55E', fontSize: 12 }}>{success}</p>}
          <button className="btn-primary" style={{ width: '100%', height: 52, borderRadius: 16 }} onClick={submit} disabled={saving}>
            <HandCoins size={16} /> {saving ? 'Sending Request...' : 'Send Request'}
          </button>
        </div>

        {blockedMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'flex-end' }}
            onClick={() => setBlockedMessage('')}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 620, damping: 42 }}
              className="modal-sheet"
              style={{ margin: 0, width: '100%', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-handle" />
              <div style={{ borderRadius: 'var(--card-radius)', border: '1px solid var(--color-divider)', background: 'var(--color-surface)', padding: '18px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>Request Blocked</p>
                <p style={{ fontSize: 14, color: 'var(--color-text-2)', lineHeight: 1.65 }}>{blockedMessage}</p>
              </div>
              <button className="btn-primary" style={{ width: '100%', marginTop: 14, height: 50, borderRadius: 16 }} onClick={() => setBlockedMessage('')}>
                Okay
              </button>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
