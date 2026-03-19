import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Globe, DollarSign, BarChart, Lock, Receipt, Store, CheckCircle } from 'lucide-react';
import * as db from '../../lib/db';
import { useAsyncQuery } from '../../hooks/useAsyncQuery';
import VerificationBadge from '../common/VerificationBadge';
import { useAuth } from '../../providers/AuthProvider';

const BENEFITS = [
// ...
// (Note: I'll keep the BENEFITS array as is, just showing the import change)
  {
    icon: Zap,
    title: 'Instant Settlement',
    desc: 'Get paid in USDC instantly. No waiting 3 to 5 business days. No chargebacks. Your money is yours the moment a customer pays.',
  },
  {
    icon: Globe,
    title: 'Global Reach',
    desc: 'Accept payments from anyone, anywhere in the world without worrying about international transfer fees or blocked cross-border payments.',
  },
  {
    icon: DollarSign,
    title: 'Near-Zero Fees',
    desc: 'Solana transaction fees cost fractions of a cent. Compare that to the 2 to 3% card processing fees eating into your margins every day.',
  },
  {
    icon: BarChart,
    title: 'Real-time Dashboard',
    desc: 'See every sale, every payout, and every trend in real time. Export receipts, generate invoices, and reconcile your books in minutes.',
  },
  {
    icon: Lock,
    title: 'Fraud-Proof',
    desc: 'Blockchain-confirmed payments cannot be reversed by buyers after the fact. No more fraudulent chargeback disputes draining your revenue.',
  },
  {
    icon: Receipt,
    title: 'QR Point of Sale',
    desc: 'Display a QR code at checkout. Customers scan, confirm, done. No card readers, no monthly POS subscription, no fuss.',
  },
];

export default function MerchantTab() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const existingEntry = useAsyncQuery(
    user ? () => db.getMyWaitlistEntry({ externalUserId: user?.userId }) : null,
    [user?.userId]
  );
  const isJoined = submitted || !!existingEntry;

  useEffect(() => {
    if (!existingEntry) return;
    setSubmitted(true);
    setName((existingEntry as any).name || '');
    setEmail((existingEntry as any).email || '');
    setBusinessType((existingEntry as any).businessType || '');
  }, [existingEntry]);

  const handleSubmit = async () => {
    if (!name || !email || !businessType) { setError('Please fill in all fields.'); return; }
    if (isJoined) return;
    setError('');
    setSubmitting(true);
    try {
      await db.joinWaitlist({
        name,
        email,
        businessType,
        externalUserId: user?.userId,
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to join waitlist. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px 20px 0' }}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.8px' }}>Merchant</h2>
          <VerificationBadge level={3} size={22} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 28 }}>Accept payments for your business on Solana</p>

        {/* Coming soon banner */}
        <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(124,58,237,0.08) 100%)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 20, padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
          <Store size={32} color="#F97316" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>Merchant Portal</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Point of sale, invoicing, and instant settlement launching on mainnet. Join the waitlist for early access.</p>
          </div>
        </div>

        {/* Benefits */}
        <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 16 }}>Why PayMe for Business?</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
          {BENEFITS.map(b => (
            <div key={b.title} style={{ background: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: 18, padding: '16px 14px' }}>
              <div style={{ marginBottom: 10 }}><b.icon size={26} color="#F97316" /></div>
              <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 5 }}>{b.title}</p>
              <p style={{ fontSize: 11.5, color: 'var(--color-text-3)', lineHeight: 1.55 }}>{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Waitlist form */}
        <AnimatePresence mode="wait">
          {!isJoined ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 17, marginBottom: 16 }}>Join the Waitlist</p>
              {[
                { label: 'Business Name', value: name, setter: setName, placeholder: 'Your store or company name' },
                { label: 'Email', value: email, setter: setEmail, placeholder: 'contact@yourbusiness.com', type: 'email' },
                { label: 'Business Type', value: businessType, setter: setBusinessType, placeholder: 'e.g. Restaurant, Salon, Online Shop' },
              ].map(({ label, value, setter, placeholder, type }) => (
                <div key={label} style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6, letterSpacing: '0.5px' }}>{label.toUpperCase()}</p>
                  <input type={type || 'text'} value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                    style={{ width: '100%', background: 'var(--color-border)', border: '1.5px solid var(--color-border-strong)', borderRadius: 14, padding: '13px 16px', fontSize: 14, fontFamily: 'inherit', color: 'var(--color-text)', outline: 'none' }} />
                </div>
              ))}
              {error && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</p>}
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting} style={{ width: '100%', height: 54, borderRadius: 18, fontSize: 16, marginTop: 4 }}>
                {submitting ? 'Joining...' : 'Join Waitlist'}
              </button>
            </motion.div>
          ) : (
            <motion.div key="success" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', padding: '20px 0 40px' }}>
              <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center' }}><CheckCircle size={64} color="#22C55E" /></div>
              <p style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>You are on the list!</p>
              <p style={{ fontSize: 14, color: 'var(--color-text-3)' }}>
                We will reach out to <strong style={{ color: 'var(--color-text)' }}>{(existingEntry as any)?.email || email}</strong> when merchant features go live on mainnet.
              </p>
              <div style={{ marginTop: 16, background: 'var(--color-border)', border: '1px solid var(--color-border-strong)', borderRadius: 14, padding: '12px 14px', textAlign: 'left' }}>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', marginBottom: 6 }}>Saved Details</p>
                <p style={{ fontSize: 13, marginBottom: 4 }}><strong>Business:</strong> {(existingEntry as any)?.name || name}</p>
                <p style={{ fontSize: 13, marginBottom: 4 }}><strong>Email:</strong> {(existingEntry as any)?.email || email}</p>
                <p style={{ fontSize: 13 }}><strong>Type:</strong> {(existingEntry as any)?.businessType || businessType}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
