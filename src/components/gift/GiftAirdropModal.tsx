import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Gift } from 'lucide-react';
import * as db from '../../lib/db';
import { getGlobalCurrency } from '../../lib/appState';
import { useAppState } from '../../App';

interface GiftAirdropModalProps {
  onClose: () => void;
}

const ELIGIBILITY_TIERS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

const formatCompact = (value: number, symbol: string) =>
  `${symbol}${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)}`;

export default function GiftAirdropModal({ onClose }: GiftAirdropModalProps) {
  const { mode: appMode } = useAppState();
  const currency = getGlobalCurrency();

  const [giftMode, setGiftMode] = useState<'random' | 'specific'>('random');
  const [amount, setAmount] = useState('');
  const [count, setCount] = useState('5');
  const [eligibilityCap, setEligibilityCap] = useState<number>(5);
  const [usernames, setUsernames] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async () => {
    const amountNum = Number(amount.replace(/,/g, ''));
    const recipientsCount = Number(count);
    const normalizedCap = Number.isFinite(eligibilityCap) ? Math.min(50, Math.max(5, eligibilityCap)) : 5;
    const recipientList = usernames
      .split(/[\n, ]+/)
      .map((x) => x.trim())
      .filter(Boolean);

    if (!Number.isFinite(amountNum) || amountNum <= 0) return setError('Enter a valid gift amount.');
    if (giftMode === 'random' && (!Number.isFinite(recipientsCount) || recipientsCount <= 0)) return setError('Enter valid recipients count.');
    if (giftMode === 'random' && recipientsCount > 20) return setError('Max 20 recipients at once.');
    if (giftMode === 'specific' && recipientList.length === 0) return setError('Enter at least one username.');
    if (giftMode === 'specific' && recipientList.length > 20) return setError('Max 20 users at once.');

    setError('');
    setSuccess('');
    setSaving(true);
    try {
      if (appMode === 'demo') {
        await new Promise((r) => setTimeout(r, 700));
        setSuccess('Gift airdrop simulated in demo mode.');
      } else {
        const result = await db.startGiftAirdrop({
          mode: giftMode,
          amountPerRecipient: amountNum / currency.rate,
          recipients: giftMode === 'specific' ? recipientList : [],
          isAnonymous: anonymous,
          eligibilityTier: giftMode === 'random' ? normalizedCap : undefined,
        });
        setSuccess(`Airdrop sent to ${result.results?.length ?? 0} users.`);
      }
    } catch (e: any) {
      setError(e?.message || 'Airdrop failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 600, damping: 38 }} className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900 }}>GIFT AIRDROP</h2>
          <button onClick={onClose} style={{ background: 'var(--color-border)', border: '1px solid var(--color-border-strong)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text-2)' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: 'var(--color-border)', padding: 4, borderRadius: 12 }}>
            <button
              onClick={() => setGiftMode('random')}
              style={{ height: 34, border: 'none', borderRadius: 10, fontWeight: 700, background: giftMode === 'random' ? 'var(--color-surface)' : 'transparent', color: giftMode === 'random' ? 'var(--color-text)' : 'var(--color-text-3)', cursor: 'pointer' }}
            >
              Random
            </button>
            <button
              onClick={() => setGiftMode('specific')}
              style={{ height: 34, border: 'none', borderRadius: 10, fontWeight: 700, background: giftMode === 'specific' ? 'var(--color-surface)' : 'transparent', color: giftMode === 'specific' ? 'var(--color-text)' : 'var(--color-text-3)', cursor: 'pointer' }}
            >
              Specific Users
            </button>
          </div>
          <input className="input-field" placeholder={`Gift amount (${currency.code})`} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} />
          {giftMode === 'random' ? (
            <>
              <input className="input-field" placeholder="How many people (max 20)" value={count} onChange={(e) => setCount(e.target.value.replace(/[^\d]/g, ''))} />
              <div style={{ display: 'grid', gap: 6 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.4px' }}>ELIGIBILITY GROUP</p>
                <div
                  style={{
                    borderRadius: 14,
                    border: '1px solid rgba(120,120,128,0.25)',
                    background: 'rgba(120,120,128,0.12)',
                    padding: 8,
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {ELIGIBILITY_TIERS.map((tier) => {
                      const active = tier === eligibilityCap;
                      const equivalent = tier * currency.rate;
                      return (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setEligibilityCap(tier)}
                          style={{
                            minHeight: 46,
                            borderRadius: 12,
                            border: active ? '1px solid rgba(249,115,22,0.6)' : '1px solid rgba(120,120,128,0.22)',
                            background: active ? 'rgba(249,115,22,0.2)' : 'rgba(255,255,255,0.06)',
                            color: active ? '#F97316' : 'var(--color-text-2)',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            padding: '7px 8px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 2,
                          }}
                        >
                          <span style={{ lineHeight: 1.1 }}>${tier}</span>
                          <span style={{ lineHeight: 1.1, fontSize: 10, fontWeight: 700, color: active ? '#EA580C' : 'var(--color-text-3)' }}>
                            {formatCompact(equivalent, currency.symbol)} {currency.code}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <textarea
              value={usernames}
              onChange={(e) => setUsernames(e.target.value)}
              placeholder="@user1, @user2, @user3 (max 20)"
              style={{ minHeight: 92, resize: 'vertical', background: 'var(--color-border)', border: '1.5px solid var(--color-border-strong)', borderRadius: 14, padding: '12px 14px', fontSize: 14, color: 'var(--color-text)', outline: 'none', fontFamily: 'inherit' }}
            />
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-text-2)' }}>
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            Send as anonymous
          </label>
          {error && <p style={{ color: '#EF4444', fontSize: 12 }}>{error}</p>}
          {success && <p style={{ color: '#22C55E', fontSize: 12 }}>{success}</p>}
          <button className="btn-primary" style={{ width: '100%', height: 52, borderRadius: 16 }} onClick={submit} disabled={saving}>
            <Gift size={16} /> {saving ? 'Starting...' : 'Start Gifting'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
