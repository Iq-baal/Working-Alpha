import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../providers/AuthProvider';
import {
  Shield, Bell, Globe, LogOut, Copy, ExternalLink,
  Lock, Check, Key, Moon, Sun, ChevronRight, Eye, EyeOff,
  ShieldCheck, Fingerprint, Delete, ArrowDownLeft, ArrowUpRight, Filter, Headphones,
  Trophy, Edit2, Camera
} from 'lucide-react';
import UserSupportModal from '../support/UserSupportModal';
import { truncateAddress, getInitials, getAvatarColor, usdcToDisplay, formatPreciseDate } from '../../lib/utils';
import { getGlobalCurrency, hasPin, setPin as savePin, setBiometrics, getBiometrics, demoProfile, getTheme, setGlobalTheme, onThemeChange, canUseBiometrics, registerBiometricCredential, getRichMode, setRichMode as setGlobalRichMode, getNotificationPrefs, setNotificationPrefs, onNotificationPrefsChange, bumpLiveProfileRefresh } from '../../lib/appState';
import { useNav, useAppState } from '../../App';
import { useHistory } from '../../hooks/useDataHooks';
import * as db from '../../lib/db';
import { useAsyncQuery } from '../../hooks/useAsyncQuery';
import { useLiveProfileRefreshKey } from '../../hooks/useLiveProfileRefresh';
import AppleBackButton from '../common/AppleBackButton';
import VerificationBadge from '../common/VerificationBadge';
import VerificationScreen from './VerificationScreen';
import ExportKeyModal from '../profile/ExportKeyModal';

type SettingsScreen =
  | 'main' | 'user-info' | 'security' | 'pin-setup' | 'notifications'
  | 'privacy' | 'appearance' | 'language' | 'legal'
  | 'legal-terms' | 'legal-privacy' | 'legal-aml' | 'legal-disclaimer'
  | 'verification' | 'rich-mode' | 'leaderboard' | 'security-question';

export let isDiscoverable = true;

// PIN keypad
const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

// ─── LEADERBOARD SCREEN
function LeaderboardScreen({ onBack }: { onBack: () => void }) {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ leaderboard: any[]; myRank: number; myPoints: number } | null>(null);

  useEffect(() => {
    db.getLeaderboard().then((result) => {
      setData(result);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <motion.div key="leaderboard" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <AppleBackButton onBack={onBack} />
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Leaderboard</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(249,115,22,0.2)', borderTop: '3px solid #F97316' }} className="spinner" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div key="leaderboard" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <AppleBackButton onBack={onBack} />
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Leaderboard</h2>
      </div>

      {/* User's own stats card */}
      <div style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(124,58,237,0.1))', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 20, padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 20, color: '#0b0b0f' }}>
            {currentUser?.username ? currentUser.username[0].toUpperCase() : '?'}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>Your Rank</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#F97316' }}>#{data?.myRank ?? 999}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 2 }}>PayPoints</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: '#22C55E' }}>{data?.myPoints ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Leaderboard list */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, overflow: 'hidden' }}>
        {(data?.leaderboard || []).slice(0, 50).map((entry, i) => {
          const isCurrentUser = entry.username === currentUser?.username;
          return (
            <div key={entry.rank}>
              <div className="row-item" style={{ padding: '14px 18px', background: isCurrentUser ? 'rgba(249,115,22,0.08)' : 'transparent' }}>
                <div style={{ width: 28, fontWeight: 800, fontSize: 14, color: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--color-text-3)' }}>
                  #{entry.rank}
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: getAvatarColor(entry.username), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff', margin: '0 12px' }}>
                  {entry.username[0]?.toUpperCase()}
                </div>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{entry.username}</span>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#22C55E' }}>{entry.payPoints.toLocaleString()}</span>
              </div>
              {i < Math.min((data?.leaderboard?.length || 0) - 1, 49) && <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />}
            </div>
          );
        })}
      </div>

      {(data?.leaderboard?.length === 0) && (
        <p style={{ textAlign: 'center', color: 'var(--color-text-3)', marginTop: 32 }}>No referrals yet. Be the first to invite friends!</p>
      )}
    </motion.div>
  );
}

// ─── SECURITY QUESTION SCREEN ──────────────────────────────────────
function SecurityQuestionScreen({ onBack }: { onBack: () => void }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const PRESET_QUESTIONS = [
    'What was your childhood nickname?',
    'What is the name of your first pet?',
    'What city were you born in?',
    'What is your mother\'s maiden name?',
    'What was the name of your elementary school?',
    'What is your favorite book?',
    'What was your dream job as a child?',
    'Custom question...',
  ];

  const handleSave = async () => {
    if (!question || !answer.trim()) {
      alert('Please fill in both fields');
      return;
    }
    setSaving(true);
    await db.setSecurityQuestion(question, answer.trim());
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      onBack();
    }, 1500);
  };

  return (
    <motion.div key="security-question" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <AppleBackButton onBack={onBack} />
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Security Question</h2>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 20, lineHeight: 1.6 }}>
        Set a security question to recover your account if you forget your password. Your answer is case-insensitive and stored securely.
      </p>

      {saved ? (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 16, padding: 18, textAlign: 'center' }}>
          <Check size={32} color="#22C55E" style={{ marginBottom: 8 }} />
          <p style={{ fontWeight: 700, color: '#22C55E' }}>Security question saved!</p>
        </div>
      ) : (
        <>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Question</label>
          <select
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{ width: '100%', height: 48, borderRadius: 12, border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontSize: 14, marginBottom: 16 }}
          >
            <option value="">Select a question...</option>
            {PRESET_QUESTIONS.map((q, i) => (
              <option key={i} value={q}>{q}</option>
            ))}
          </select>

          {question === 'Custom question...' && (
            <input
              type="text"
              placeholder="Enter your custom question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{ width: '100%', height: 48, borderRadius: 12, border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontSize: 14, marginBottom: 16 }}
            />
          )}

          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Answer</label>
          <input
            type="text"
            placeholder="Your answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            style={{ width: '100%', height: 48, borderRadius: 12, border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontSize: 14, marginBottom: 24 }}
          />

          <button
            onClick={handleSave}
            disabled={saving || !question || !answer.trim()}
            style={{ width: '100%', height: 52, borderRadius: 16, background: saving || !question || !answer.trim() ? 'var(--color-surface-3)' : '#F97316', color: saving || !question || !answer.trim() ? 'var(--color-text-4)' : '#0b0b0f', fontWeight: 700, fontSize: 15, cursor: saving || !question || !answer.trim() ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving...' : 'Save Security Question'}
          </button>
        </>
      )}
    </motion.div>
  );
}

function PinSetup({ onBack, onPinSet }: { onBack: () => void; onPinSet?: () => void }) {
  const [stage, setStage] = useState<'set' | 'confirm' | 'done'>('set');
  const [first, setFirst] = useState('');
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const press = (key: string) => {
    if (key === '⌫') { setInput(p => p.slice(0, -1)); return; }
    if (key === '') return;
    const next = input + key;
    setInput(next);

    if (next.length === 4) {
      if (stage === 'set') {
        setFirst(next);
        setInput('');
        setStage('confirm');
      } else {
        if (next === first) {
          savePin(next);
          onPinSet?.();
          setStage('done');
        } else {
          setError('PINs do not match. Start over.');
          setTimeout(() => { setInput(''); setFirst(''); setError(''); setStage('set'); }, 1200);
        }
      }
    }
  };

  if (stage === 'done') return (
    <div style={{ textAlign: 'center', padding: '32px 0' }}>
      <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', border: '2px solid #22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
        <Check size={32} color="#22C55E" />
      </div>
      <p style={{ fontWeight: 800, fontSize: 22, marginBottom: 8 }}>PIN Set</p>
      <p style={{ fontSize: 14, color: 'var(--color-text-3)', marginBottom: 32 }}>You will be asked for this PIN every time you send money.</p>
      <button className="btn-primary" onClick={onBack} style={{ width: '100%', height: 54, borderRadius: 18 }}>Done</button>
    </div>
  );

  return (
    <div>
      <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-text-3)', marginBottom: 32 }}>
        {stage === 'set' ? 'Choose a 4-digit PIN' : 'Enter the PIN again to confirm'}
      </p>
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 40 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: input.length > i ? '#F97316' : 'var(--color-border-strong)', border: '2px solid var(--color-text-4)', transition: 'background 0.15s' }} />
        ))}
      </div>
      {error && <p style={{ color: '#EF4444', textAlign: 'center', fontSize: 13, marginBottom: 16 }}>{error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {PAD.map((key, i) => (
          <motion.button key={i} whileTap={key ? { scale: 0.88 } : {}} onClick={() => press(key)}
            style={{ height: 68, background: key === '' ? 'transparent' : 'var(--color-border)', border: key === '' ? 'none' : '1px solid var(--color-border-strong)', borderRadius: 16, cursor: key ? 'pointer' : 'default', color: 'var(--color-text)', fontSize: key === '⌫' ? 20 : 26, fontWeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
            {key === '⌫' ? <Delete size={20} /> : key}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// Demo transaction data with precise timestamps
const MOCK_TXS = [
  { id: '1', type: 'receive', with: 'Kwame Osei',   amount: 50,  at: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', type: 'send',    with: 'Amara Diallo', amount: 25,  at: new Date(Date.now() - 86400000).toISOString() },
  { id: '3', type: 'receive', with: 'Chidi Nweke',  amount: 100, at: new Date(Date.now() - 172800000).toISOString() },
  { id: '4', type: 'receive', with: 'PayMe Bonus',  amount: 10,  at: new Date(Date.now() - 259200000).toISOString() },
  { id: '5', type: 'send',    with: 'Fatima K.',    amount: 75,  at: new Date(Date.now() - 345600000).toISOString() },
];

const TIMEFRAMES = ['All Time', 'Today', 'This Week', 'This Month'];

function UserInfoScreen({ onBack, walletAddress, displayName, email }: { onBack: () => void; walletAddress: string; displayName: string; email: string }) {
  const currency = getGlobalCurrency();
  const { mode } = useAppState();
  const { transactions } = useHistory();
  const { user } = useAuth();
  
  const profileRefreshKey = useLiveProfileRefreshKey();
  const profile = useAsyncQuery(
    mode === 'live' && user
      ? () => db.getProfile({ userId: user?.userId })
      : null,
    [mode, user?.userId, walletAddress, profileRefreshKey]
  );
  
  const referrals = useAsyncQuery(
    mode === 'live' && user ? () => db.getMyReferrals({ userId: user?.userId! }) : null,
    [mode, user?.userId]
  );
  
  const [blurAddress, setBlurAddress] = useState(true);
  const [copied, setCopied] = useState(false);
  const [timeframe, setTimeframe] = useState('All Time');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const txs = mode === 'live' ? transactions : MOCK_TXS as any[];
  
  const totalInUsdc = txs.filter(t => t.type === 'receive' || t.category === 'bonus').reduce((s, t) => s + (t.amount_usdc || t.amount || 0), 0);
  const totalOutUsdc = txs.filter(t => t.type === 'send').reduce((s, t) => s + (t.amount_usdc || t.amount || 0), 0);
  
  // Calculate based on selected currency
  const totalIn = totalInUsdc * currency.rate;
  const totalOut = totalOutUsdc * currency.rate;

  const copy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }
    
    setUploadingAvatar(true);
    try {
      const result = await db.uploadFile(file, 'avatar');
      if (result?.url) {
        // Update profile with new avatar URL
        await db.updateProfile({ avatarUrl: result.url });
        bumpLiveProfileRefresh();
      } else {
        alert('Upload failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      alert('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploadingAvatar(false);
      // Reset input
      e.target.value = '';
    }
  };

  const vLevel = mode === 'live' ? (profile?.verificationLevel || 0) : demoProfile.verificationLevel;
  const occupation = mode === 'live' ? ('Not set') : demoProfile.occupation;
  const username = mode === 'live' ? (profile?.username ? `@${profile.username}` : '@user') : `@${demoProfile.username}`;
  const effectiveDisplayName = mode === 'live' ? (profile?.name || displayName) : displayName;
  const effectiveEmail = mode === 'live' ? (profile?.email || email) : email;
  const avatarUrl = mode === 'live' ? (profile?.avatarBase64 || null) : demoProfile.avatarBase64;

  return (
    <motion.div key="user-info" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <AppleBackButton onBack={onBack} />
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>My Account</h2>
      </div>

      {/* Avatar + name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
        <div style={{ position: 'relative' }}>
          <div className="avatar" style={{ width: 80, height: 80, background: avatarUrl ? 'transparent' : getAvatarColor(effectiveDisplayName), fontSize: 26, color: 'var(--color-text)', marginBottom: 12, overflow: 'hidden', border: avatarUrl ? '1px solid var(--color-border)' : 'none' }}>
            {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(effectiveDisplayName)}
          </div>
          <label 
            htmlFor="avatar-upload" 
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(249, 115, 22, 0.9)',
              border: '2px solid var(--color-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
              opacity: uploadingAvatar ? 0.6 : 1
            }}
          >
            {uploadingAvatar ? (
              <div className="spinner-small" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#fff' }} />
            ) : (
              <Camera size={16} color="#fff" />
            )}
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            disabled={uploadingAvatar}
            style={{ display: 'none' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <p style={{ fontWeight: 800, fontSize: 20 }}>{effectiveDisplayName}</p>
          {vLevel > 0 && <VerificationBadge level={vLevel} size={18} />}
        </div>
        {effectiveEmail && <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 3 }}>{effectiveEmail}</p>}
      </div>

      {/* Referral Section (Only in demo) */}
      {(mode !== 'live') && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--card-radius)', padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: 'var(--color-orange)', fontWeight: 700, letterSpacing: '0.5px' }}>YOUR REFERRAL CODE</p>
            <div style={{ background: 'var(--color-orange-dim)', padding: '4px 10px', borderRadius: 8, color: '#F97316', fontSize: 11, fontWeight: 700 }}>
              {3 - ((referrals as any)?.referrals?.length || 0)} USES LEFT
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '12px 14px', borderRadius: 14, marginBottom: 16 }}>
            <p style={{ flex: 1, fontSize: 18, fontWeight: 800, letterSpacing: '1px', color: 'var(--color-text)' }}>
              {String(mode) === 'live' ? (profile?.username?.toUpperCase() || 'PAYME') : 'DEMO_USER'}
            </p>
            <button 
              onClick={() => {
                const codeToCopy = String(mode) === 'live' ? (profile?.username?.toUpperCase() || '') : 'DEMO_USER';
                navigator.clipboard.writeText(codeToCopy);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{ background: 'none', border: 'none', color: '#F97316', cursor: 'pointer' }}
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>

          {(referrals as any)?.referrals && (referrals as any).referrals.length > 0 && (
            <div>
              <p style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 10 }}>FRIENDS YOU INVITED</p>
              <div style={{ display: 'flex', gap: -8 }}>
                {((referrals as any)?.referrals || []).map((friend: any, i: number) => (
                  <div 
                    key={i} 
                    style={{ 
                      width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--color-surface)',
                      background: friend.avatarBase64 ? 'transparent' : getAvatarColor(friend.name),
                      marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i, overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700
                    }}
                    title={friend.name}
                  >
                    {friend.avatarBase64 ? <img src={friend.avatarBase64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={friend.name} /> : getInitials(friend.name)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info rows */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
        {[
          { label: 'Name', value: effectiveDisplayName },
          { label: 'Occupation', value: occupation },
          { label: 'Email', value: effectiveEmail || 'Not set' },
          { label: 'Username', value: username },
        ].map(({ label, value }, i) => (
          <div key={label}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', gap: 12 }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600, width: 90, flexShrink: 0 }}>{label.toUpperCase()}</p>
              <p style={{ fontSize: 14, color: 'var(--color-text)', flex: 1 }}>{value}</p>
            </div>
            {i < 3 && <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />}
          </div>

        ))}
      </div>

      {/* Wallet address */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>WALLET ADDRESS</p>
          <button onClick={() => setBlurAddress(b => !b)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}>
            {blurAddress ? <Eye size={13} /> : <EyeOff size={13} />}
            {blurAddress ? 'Reveal' : 'Hide'}
          </button>
        </div>
        <p style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-2)', wordBreak: 'break-all', marginBottom: 12, filter: blurAddress ? 'blur(6px)' : 'none', transition: 'filter 0.3s', userSelect: blurAddress ? 'none' : 'text' }}>
          {walletAddress || '3Gq8...demo...9pK2'}
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" style={{ flex: 1, height: 40, fontSize: 13, borderRadius: 12 }} onClick={copy}>
            {copied ? <Check size={13} color="#22C55E" /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {walletAddress && (
            <button className="btn-ghost" style={{ flex: 1, height: 40, fontSize: 13, borderRadius: 12 }}
              onClick={() => window.open(`https://explorer.solana.com/address/${walletAddress}?cluster=devnet`, '_blank')}>
              <ExternalLink size={13} /> Explorer
            </button>
          )}
        </div>
      </div>

      {/* Flow summary with timeframe filter */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '16px 18px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontWeight: 600 }}>BALANCE FLOW</p>
          <Filter size={11} color="var(--color-text-3)" />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 4,
            padding: 4,
            borderRadius: 12,
            background: 'rgba(120,120,128,0.16)',
            border: '1px solid rgba(120,120,128,0.2)',
            marginBottom: 14,
          }}
        >
          {TIMEFRAMES.map((t) => {
            const active = timeframe === t;
            return (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                style={{
                  height: 30,
                  border: 'none',
                  borderRadius: 9,
                  background: active ? 'rgba(255,255,255,0.94)' : 'transparent',
                  color: active ? '#111827' : 'var(--color-text-3)',
                  fontSize: 11,
                  fontWeight: active ? 700 : 600,
                  cursor: 'pointer',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.15)' : 'none',
                  transition: 'all 0.16s ease',
                }}
              >
                {t === 'All Time' ? 'All' : t.replace('This ', '')}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 14, padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <ArrowDownLeft size={14} color="#22C55E" />
              <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>MONEY IN</span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#22C55E' }}>{usdcToDisplay(totalIn / currency.rate, currency.code)}</p>
          </div>
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <ArrowUpRight size={14} color="#EF4444" />
              <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600 }}>MONEY OUT</span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#EF4444' }}>{usdcToDisplay(totalOut / currency.rate, currency.code)}</p>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-3)', letterSpacing: '0.5px', marginBottom: 10 }}>RECENT TRANSACTIONS</p>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, overflow: 'hidden', marginBottom: 24 }}>
        {txs.length === 0 ? (
          <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--color-text-3)' }}>No transactions found</div>
        ) : txs.slice(0, 5).map((tx, i) => {
          const isLive = mode === 'live';
          const name = isLive ? (tx.type === 'receive' ? (tx.from_name || 'Unknown') : (tx.to_name || 'Unknown')) : tx.with;
          const amt = isLive ? (tx.amount_usdc || 0) : tx.amount;
          const isReceive = tx.type === 'receive' || tx.category === 'bonus';
          const date = isLive ? tx.created_at : tx.at;

          return (
            <div key={tx.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: isReceive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isReceive ? <ArrowDownLeft size={15} color="#22C55E" /> : <ArrowUpRight size={15} color="#EF4444" />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{name}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-3)' }}>{formatPreciseDate(date)}</p>
                </div>
                <p style={{ fontWeight: 700, fontSize: 14, color: isReceive ? '#22C55E' : 'var(--color-text)' }}>
                  {isReceive ? '+' : '-'}{usdcToDisplay(amt, currency.code)}
                </p>
              </div>
              {i < txs.length - 1 && <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function SettingsTab({ openProfileModal }: { openProfileModal?: () => void }) {
  const { user, signOut, walletPublicKey: walletAddress } = useAuth();
  const { goTo } = useNav();
  const { mode } = useAppState();
  const profileRefreshKey = useLiveProfileRefreshKey();
  const profile = useAsyncQuery(
    mode === 'live' && user
      ? () => db.getProfile({ userId: user?.userId })
      : null,
    [mode, user?.userId, walletAddress, profileRefreshKey]
  );
  const [screen, setScreen] = useState<SettingsScreen>('main');
  const [showExportModal, setShowExportModal] = useState(false);
  const [notifications, setNotifications] = useState(getNotificationPrefs());
  const [discoverable, setDiscoverable] = useState(true);
  const [biometrics, setBiometricsState] = useState(getBiometrics());
  const [theme, setTheme] = useState<'dark' | 'light'>(getTheme());
  const [richMode, setRichModeState] = useState(getRichMode());
  const [richCelebrate, setRichCelebrate] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    return onThemeChange(setTheme);
  }, []);

  useEffect(() => onNotificationPrefsChange(setNotifications), []);

  const rawDisplayName = user?.email?.split('@')[0] || 'User';
  const displayName = mode === 'live' ? (profile?.name || rawDisplayName) : rawDisplayName;
  const email = mode === 'live' ? (profile?.email || user?.email || '') : (user?.email || '');
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);
  const avatarUrl = mode === 'live' ? (profile?.avatarBase64 || null) : demoProfile.avatarBase64;
  const vLevel = mode === 'live' ? (profile?.verificationLevel || 0) : demoProfile.verificationLevel;

  const handleStartVerification = () => {
    setScreen('verification');
  };

  const handleDiscoverableToggle = async () => {
    const next = !discoverable;
    setDiscoverable(next);
    isDiscoverable = next;
    if (mode === 'live') {
      await db.updateDiscoverable(next);
    }
  };

  const handleBiometricsToggle = async () => {
    const next = !biometrics;
    if (next) {
      if (!hasPin()) {
        alert('Set a transaction PIN first before enabling biometrics.');
        return;
      }
      if (!canUseBiometrics()) {
        alert('Biometrics are not supported on this device/browser.');
        return;
      }
      const enrolled = await registerBiometricCredential();
      if (!enrolled) {
        alert('Biometric enrollment failed. Please try again.');
        return;
      }
    }
    setBiometricsState(next);
    setBiometrics(next);
    if (mode === 'live' && user?.userId && notifications.security) {
      void db.createNotification({
        userId: user?.userId,
        type: 'security',
        title: `Biometrics ${next ? 'Enabled' : 'Disabled'}`,
        content: `Biometric authentication has been ${next ? 'enabled' : 'disabled'} on this device.`,
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput !== 'DELETE') {
      setDeleteError('Type DELETE exactly to continue.');
      return;
    }
    setDeleteError('');
    setDeletingAccount(true);
    try {
      if (mode === 'live' && user?.userId) {
        await db.deleteAccount({ externalUserId: user?.userId });
      }
      await signOut();
      goTo('welcome');
    } catch (e) {
      console.error(e);
      setDeleteError('Failed to delete account. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleRichModeToggle = (next: boolean) => {
    setRichModeState(next);
    setGlobalRichMode(next);
    if (next) {
      setRichCelebrate(true);
      setTimeout(() => setRichCelebrate(false), 1600);
    }
  };

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <div className={`toggle ${on ? 'on' : ''}`} onClick={onToggle}><div className="toggle-thumb" /></div>
  );

  const H = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginTop: 20, marginBottom: 8 }}>{children}</p>
  );
  const P = ({ children }: { children: React.ReactNode }) => (
    <p style={{ marginBottom: 12, color: 'var(--color-text-2)', lineHeight: 1.6 }}>{children}</p>
  );

  return (
    <div style={{ padding: '20px 20px 0' }}>
      <AnimatePresence mode="wait">

        {/* ── MAIN ─────────────────────────────────────────────── */}
        {screen === 'main' && (
          <motion.div key="main" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}>
            {/* User card — opens full info screen */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, background: 'var(--color-surface)', borderRadius: 'var(--card-radius)', padding: '18px 20px', border: '1px solid var(--color-divider)', cursor: 'pointer' }}
              onClick={() => setScreen('user-info')}
            >
              <div className="avatar" style={{ width: 56, height: 56, background: avatarUrl ? 'transparent' : avatarColor, fontSize: 18, color: 'var(--color-text)', overflow: 'hidden', border: avatarUrl ? '1px solid var(--color-border)' : 'none' }}>
                {avatarUrl ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <p style={{ fontWeight: 800, fontSize: 17 }}>{displayName}</p>
                  {vLevel > 0 && <VerificationBadge level={vLevel} size={15} />}
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontFamily: 'monospace' }}>
                  {walletAddress ? truncateAddress(walletAddress, 6) : 'Loading wallet...'}
                </p>
              </div>
              <ChevronRight size={18} color="var(--color-text-3)" />
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--card-radius)', padding: '16px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setScreen('rich-mode')}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(249,115,22,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                <span>$</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.6px' }}>I'M RICH, I LOVE TO DONATE</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 700 }}>{richMode ? 'Mode is active. Tap to manage.' : 'Tap to unlock rich mode controls.'}</p>
              </div>
              <ChevronRight size={16} color="var(--color-text-3)" />
            </div>

            {/* Verification CTA — Visible until Level 3 (Merchant) */}
            {vLevel < 3 && (
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--card-radius)', padding: '20px', marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(29,155,240,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={22} color="#1D9BF0" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{vLevel === 0 ? 'Get Verified' : `Level ${vLevel} Verified`}</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Build trust with a verified badge</p>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text-3)', marginBottom: 16, lineHeight: 1.6 }}>
                  {vLevel === 0 && 'Level 1 gives you a blue checkmark visible to everyone. Level 2 unlocks green verification on mainnet.'}
                  {vLevel === 1 && 'You have a blue checkmark! Upgrade to Level 2 (Green) by adding a Government ID when mainnet launches.'}
                  {vLevel === 2 && 'You have a green checkmark! Upgrade to Level 3 (Orange) to unlock Merchant Tools.'}
                </p>
                <button className="btn-primary" onClick={handleStartVerification} disabled={vLevel >= 1} style={{ width: '100%', height: 50, borderRadius: 16, fontSize: 15, opacity: vLevel >= 1 ? 0.5 : 1 }}>
                  {vLevel >= 1 ? 'Verification Pending Mainnet' : 'Start Verification'}
                </button>
              </div>
            )}

            {[
              {
                label: 'Account', items: [
                  { icon: Shield,  label: 'Security',       screen: 'security'      as SettingsScreen, color: '#7C3AED' },
                  { icon: Bell,    label: 'Notifications',  screen: 'notifications' as SettingsScreen, color: '#0EA5E9' },
                  { icon: Globe,   label: 'Privacy',        screen: 'privacy'       as SettingsScreen, color: '#22C55E' },
                ]
              },
              {
                label: 'Community', items: [
                  { icon: Trophy,  label: 'Leaderboard',    screen: 'leaderboard'   as SettingsScreen, color: '#F97316' },
                ]
              },
              {
                label: 'App', items: [
                  { icon: Moon,    label: 'Appearance',     screen: 'appearance'    as SettingsScreen, color: '#7C3AED' },
                  { icon: Globe,   label: 'Language',       screen: 'language'      as SettingsScreen, color: '#0EA5E9' },
                  { icon: Key,     label: 'Legal',          screen: 'legal'         as SettingsScreen, color: '#64748B' },
                  { icon: Headphones, label: 'Help & Support', screen: 'support' as any, color: '#F97316' },
                ]
              }
            ].map(group => (
              <div key={group.label} style={{ marginBottom: 20 }}>
                <p className="section-header" style={{ marginBottom: 8 }}>{group.label}</p>
                <div style={{ background: 'var(--color-surface)', borderRadius: 20, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
                  {group.items.map(({ icon: Icon, label, screen: toScreen, color }, i) => (
                    <div key={label}>
                      <div className="row-item" style={{ padding: '14px 18px' }} onClick={() => {
                        if (label === 'Help & Support') setShowSupport(true);
                        else setScreen(toScreen);
                      }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={17} color={color} />
                        </div>
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{label}</span>
                        <ChevronRight size={16} color="var(--color-text-4)" />
                      </div>
                      {i < group.items.length - 1 && <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <p className="section-header" style={{ marginBottom: 8, marginTop: 24 }}>Danger Zone</p>
            <div style={{ background: 'var(--color-surface)', borderRadius: 20, border: '1px solid var(--color-border)', overflow: 'hidden', marginBottom: 20 }}>
              <div className="row-item" style={{ padding: '14px 18px' }} onClick={() => {
                setDeleteConfirmInput('');
                setDeleteError('');
                setShowDeleteDialog(true);
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Delete size={17} color="#EF4444" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: '#EF4444' }}>Delete Account</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Permanently erase your data</p>
                </div>
              </div>
            </div>

            <button onClick={async () => {
              try {
                await signOut();
              } catch (e) {
                console.error(e);
              }
              // Force clear session/navigation logic
              goTo('welcome');
            }} style={{ width: '100%', height: 52, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: '#EF4444', fontWeight: 600, fontSize: 15, marginBottom: 20 }}>
              <LogOut size={17} /> Sign Out
            </button>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--color-text-4)', marginBottom: 8 }}>PayMe Protocol · Beta v0.1.0 · Solana Devnet</p>
          </motion.div>
        )}

        {/* ── VERIFICATION ────────────────────────────────────────── */}
        {screen === 'verification' && (
          <VerificationScreen 
            onBack={() => setScreen('main')} 
            onEditProfile={openProfileModal || (() => {})}
            mode={mode}
            profile={profile}
          />
        )}

        {screen === 'rich-mode' && (
          <motion.div key="rich-mode" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <AppleBackButton onBack={() => setScreen('main')} />
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>Rich Mode</h2>
            </div>
            <div style={{ position: 'relative', background: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--card-radius)', padding: '26px 20px 22px', overflow: 'hidden' }}>
              <div style={{ width: 84, height: 84, borderRadius: 24, background: 'rgba(249,115,22,0.22)', border: '1px solid rgba(249,115,22,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', fontSize: 40 }}>
                <span role="img" aria-label="salute">🫡</span>
              </div>
              <p style={{ textAlign: 'center', fontWeight: 900, fontSize: 22, marginBottom: 8, color: 'var(--color-text)', textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}>I SALUTE YOU</p>
              <p style={{ textAlign: 'center', color: 'var(--color-text)', fontSize: 14, lineHeight: 1.65, marginBottom: 20, fontWeight: 800, textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                Now we know you are rich unless you go undercover again.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <button
                  onClick={() => handleRichModeToggle(!richMode)}
                  style={{
                    width: 124,
                    height: 64,
                    borderRadius: 999,
                    border: richMode ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(120,120,128,0.35)',
                    background: richMode ? 'linear-gradient(135deg, rgba(34,197,94,0.95), rgba(16,185,129,0.95))' : 'rgba(120,120,128,0.22)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.22s ease',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 6,
                      left: richMode ? 66 : 6,
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
                      transition: 'left 0.22s ease',
                    }}
                  />
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 800, letterSpacing: '0.5px', color: richMode ? '#22C55E' : 'var(--color-text-3)', marginBottom: 16 }}>
                {richMode ? 'RICH MODE ACTIVE' : 'RICH MODE OFF'}
              </p>
              <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-divider)', borderRadius: 'var(--card-radius)', padding: '12px 14px' }}>
                <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
                  Head back to Home or Dashboard to exercise your new powers.
                </p>
              </div>
              <AnimatePresence>
                {richCelebrate && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {Array.from({ length: 20 }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                        animate={{
                          x: Math.cos((i / 20) * Math.PI * 2) * (90 + (i % 5) * 12),
                          y: Math.sin((i / 20) * Math.PI * 2) * (50 + (i % 4) * 10) - 70,
                          opacity: 0,
                          scale: 1.1,
                        }}
                        transition={{ duration: 1.05, ease: 'easeOut' }}
                        style={{
                          position: 'absolute',
                          left: '50%',
                          top: '54%',
                          width: 8,
                          height: 8,
                          borderRadius: 999,
                          background: i % 3 === 0 ? '#F97316' : i % 3 === 1 ? '#22C55E' : '#0EA5E9',
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* ── USER INFO ─────────────────────────────────────────── */}
        {screen === 'user-info' && (
          <UserInfoScreen
            onBack={() => setScreen('main')}
            walletAddress={walletAddress || ''}
            displayName={displayName}
            email={email}
          />
        )}

        {/* ── SECURITY ──────────────────────────────────────────── */}
        {screen === 'security' && (
          <motion.div key="security" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <AppleBackButton onBack={() => setScreen('main')} />
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>Security</h2>
            </div>

            {/* PIN setup button — iOS style */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
              <div className="row-item" style={{ padding: '14px 18px' }} onClick={() => setScreen('pin-setup')}>
                <div style={{ width: 36, height: 36, background: 'rgba(124,58,237,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={17} color="#7C3AED" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>App Lock PIN</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                    {hasPin() ? 'PIN is set — tap to change' : 'Set a 4-digit PIN to unlock the app'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {hasPin() && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E' }} />}
                  <ChevronRight size={16} color="var(--color-text-4)" />
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />

              <div className="row-item" style={{ padding: '14px 18px' }}>
                <div style={{ width: 36, height: 36, background: 'rgba(34,197,94,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Fingerprint size={17} color="#22C55E" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>Biometric Auth</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Face ID or Touch ID to unlock the app</p>
                </div>
                <Toggle on={biometrics} onToggle={handleBiometricsToggle} />
              </div>

              <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />

              <div className="row-item" style={{ padding: '14px 18px' }} onClick={() => setScreen('security-question')}>
                <div style={{ width: 36, height: 36, background: 'rgba(56,189,248,0.12)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Edit2 size={17} color="#38BDF8" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>Security Question</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Recover your account if you forget password</p>
                </div>
                <ChevronRight size={16} color="var(--color-text-4)" />
              </div>
            </div>

            <p className="section-header" style={{ marginBottom: 8, marginTop: 24 }}>Advanced</p>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
              <div className="row-item" style={{ padding: '14px 18px' }} onClick={() => setShowExportModal(true)}>
                <div style={{ width: 36, height: 36, background: 'rgba(249,115,22,0.15)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={17} color="#F97316" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>Export Private Key</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Securely export your wallet phrase</p>
                </div>
                <ChevronRight size={16} color="var(--color-text-4)" />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PIN SETUP ─────────────────────────────────────────── */}
        {screen === 'pin-setup' && (
          <motion.div key="pin-setup" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <AppleBackButton onBack={() => setScreen('security')} />
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>Set PIN</h2>
            </div>
            <PinSetup
              onBack={() => setScreen('security')}
              onPinSet={() => {
                if (mode === 'live' && user?.userId && notifications.security) {
                  void db.createNotification({
                    userId: user?.userId,
                    type: 'security',
                    title: 'PIN Updated',
                    content: 'Your transaction PIN was set or changed successfully.',
                  });
                }
              }}
            />
          </motion.div>
        )}

        {/* ── NOTIFICATIONS ─────────────────────────────────────── */}
        {screen === 'notifications' && (
          <motion.div key="notifications" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <AppleBackButton onBack={() => setScreen('main')} />
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>Notifications</h2>
            </div>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, overflow: 'hidden' }}>
              {[
                { key: 'payments' as const, label: 'Payment Alerts', desc: 'When you send or receive money' },
                { key: 'security' as const, label: 'Security Alerts', desc: 'Login activity and suspicious actions' },
                { key: 'network'  as const, label: 'Network Updates', desc: 'Solana status and downtime notices' },
              ].map(({ key, label, desc }, i) => (
                <div key={key}>
                  <div className="row-item" style={{ padding: '14px 18px' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14 }}>{label}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>{desc}</p>
                    </div>
                    <Toggle on={notifications[key]} onToggle={() => {
                      const next = !notifications[key];
                      setNotificationPrefs({ [key]: next });
                      if (mode === 'live') {
                        db.updateNotificationPrefs(notifications);
                      }
                    }} />
                  </div>
                  {i < 2 && <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── PRIVACY ───────────────────────────────────────────── */}
        {screen === 'privacy' && (
          <motion.div key="privacy" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <AppleBackButton onBack={() => setScreen('main')} />
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>Privacy</h2>
            </div>

            <AnimatePresence>
              {!discoverable && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 16, padding: '12px 16px', display: 'flex', gap: 10 }}>
                    <div style={{ marginTop: 2 }}><EyeOff size={22} color="#EF4444" /></div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: '#EF4444', marginBottom: 3 }}>You are invisible</p>
                      <p style={{ fontSize: 12, color: 'rgba(239,68,68,0.7)' }}>While this is off, no one can search your username or send you money through your PayMe handle.</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, overflow: 'hidden' }}>
              <div className="row-item" style={{ padding: '14px 18px' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>Discoverable by Username</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Let others find and pay you via your username</p>
                </div>
                <Toggle on={discoverable} onToggle={handleDiscoverableToggle} />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── APPEARANCE ────────────────────────────────────────── */}
        {screen === 'appearance' && (
          <motion.div key="appearance" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <AppleBackButton onBack={() => setScreen('main')} />
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>Appearance</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {([['dark', <Moon size={28} />, 'Dark'], ['light', <Sun size={28} />, 'Light']] as const).map(([val, icon, label]) => (
                <button key={val} onClick={() => setGlobalTheme(val)}
                  style={{ background: theme === val ? 'rgba(249,115,22,0.12)' : 'var(--color-border)', border: `2px solid ${theme === val ? '#F97316' : 'var(--color-border)'}`, borderRadius: 20, padding: '22px 16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ marginBottom: 4 }}>{icon}</div>
                  <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>{label}</span>
                  {theme === val && <Check size={14} color="#F97316" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── LANGUAGE ──────────────────────────────────────────── */}
        {screen === 'language' && (
          <motion.div key="language" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <AppleBackButton onBack={() => setScreen('main')} />
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>Language</h2>
            </div>
            <p style={{ fontSize: 14, color: 'var(--color-text-3)', textAlign: 'center', marginTop: 32 }}>Additional languages coming soon.</p>
          </motion.div>
        )}

        {/* ── LEGAL INDEX ───────────────────────────────────────── */}
        {screen === 'legal' && (
          <motion.div key="legal" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <AppleBackButton onBack={() => setScreen('main')} />
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>Legal</h2>
            </div>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, overflow: 'hidden' }}>
              {[
                { label: 'Terms of Service',        screen: 'legal-terms'      as SettingsScreen },
                { label: 'Privacy Policy',           screen: 'legal-privacy'    as SettingsScreen },
                { label: 'Trust & Safety',           screen: 'legal-aml'        as SettingsScreen },
                { label: 'Disclaimer',               screen: 'legal-disclaimer' as SettingsScreen },
              ].map(({ label, screen: toScreen }, i) => (
                <div key={label}>
                  <div className="row-item" style={{ padding: '14px 18px' }} onClick={() => setScreen(toScreen)}>
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{label}</span>
                    <ChevronRight size={16} color="var(--color-text-4)" />
                  </div>
                  {i < 3 && <div style={{ height: 1, background: 'var(--color-border)', margin: '0 18px' }} />}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── LEGAL TERMS ───────────────────────────────────────── */}
        {screen === 'legal-terms' && (
          <motion.div key="legal-terms" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <AppleBackButton onBack={() => setScreen('legal')} label="Legal" />
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Terms of Service</h2>
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.85 }}>
              <H>Who We Are</H>
              <P>PayMe Protocol is a payment application built on the Solana blockchain. We make it possible to send and receive money across borders quickly, cheaply, and without needing to understand crypto. When you use PayMe, you are trusting us with something important, and we take that seriously.</P>
              <H>What You Are Agreeing To</H>
              <P>By creating an account, you confirm that you are at least 18 years old and that the information you provide is accurate. You are responsible for keeping your account credentials safe. PayMe is not responsible for losses caused by unauthorized access that results from your own actions or negligence.</P>
              <H>Your Wallet</H>
              <P>Your wallet is generated automatically when you sign up and encrypted with your password. Your private key never leaves your device. There is no seed phrase stored on our servers. PayMe cannot access your funds.</P>
              <H>What Gets You Suspended</H>
              <P>Using PayMe for money laundering, fraud, funding of illegal activities, or circumventing sanctions will get your account permanently closed and may be reported to relevant authorities. We cooperate fully with law enforcement when required.</P>
              <H>Changes to These Terms</H>
              <P>We will give you at least 14 days notice before material changes take effect. Continuing to use the app after that point means you accept the updated terms. If you do not accept, you can close your account before the effective date.</P>
              <H>Last Updated</H>
              <P>March 2026</P>
            </div>
          </motion.div>
        )}

        {/* ── LEGAL PRIVACY ─────────────────────────────────────── */}
        {screen === 'legal-privacy' && (
          <motion.div key="legal-privacy" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <AppleBackButton onBack={() => setScreen('legal')} label="Legal" />
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Privacy Policy</h2>
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.85 }}>
              <H>What We Collect</H>
              <P>We collect your email address or Google account details when you sign in. We store your username, profile information you choose to add, and a record of your transactions. We do not collect your location, contacts, or any information beyond what you explicitly provide.</P>
              <H>What We Do Not Do</H>
              <P>We do not sell your data. We do not serve you ads. We do not share your information with third parties unless you ask us to, or unless we are legally required to do so.</P>
              <H>Third Parties We Work With</H>
              <P>Your authentication and wallet are handled entirely by PayMe's own backend on Cloudflare. Your profile and transaction data are stored securely in our database. We do not use any third-party auth providers. You can review our privacy policy for full details.</P>
              <H>Your Rights</H>
              <P>You can ask us to delete your account and all associated data at any time by contacting support. On-chain transaction records are permanent by the nature of blockchain technology and cannot be erased, but your personal details are fully removable from our systems.</P>
              <H>Last Updated</H>
              <P>March 2026</P>
            </div>
          </motion.div>
        )}

        {/* ── LEGAL AML ─────────────────────────────────────────── */}
        {screen === 'legal-aml' && (
          <motion.div key="legal-aml" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <AppleBackButton onBack={() => setScreen('legal')} label="Legal" />
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Trust & Safety</h2>
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.85 }}>
              <H>Our Promise</H>
              <P>PayMe is built to be safe, reliable, and trusted. We use smart monitoring and modern security practices behind the scenes so everyday users can send and receive money with confidence.</P>
              <H>Verification Tiers</H>
              <P>Verification helps protect your account and unlocks higher limits over time. Level 1 is quick and simple. Higher levels are available as more features roll out on mainnet.</P>
              <H>Fair Use</H>
              <P>We ask everyone to use PayMe honestly and respectfully. This helps keep the platform fast, secure, and enjoyable for all users.</P>
              <H>Behind-the-Scenes Protection</H>
              <P>Most safety checks happen automatically in the background. In rare cases where unusual activity is detected, our team may review the account to protect users and the platform.</P>
              <H>Last Updated</H>
              <P>March 2026</P>
            </div>
          </motion.div>
        )}

        {/* ── DISCLAIMER ────────────────────────────────────────── */}
        {screen === 'legal-disclaimer' && (
          <motion.div key="legal-disclaimer" initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <AppleBackButton onBack={() => setScreen('legal')} label="Legal" />
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Disclaimer</h2>
            </div>
            <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.85 }}>
              <H>Beta Mode</H>
              <P>PayMe is currently in beta on Solana Devnet so users can explore the experience safely while we continue improving performance and features.</P>
              <H>Built for Reliability</H>
              <P>Our team continuously works on stability, speed, and uptime. If maintenance is needed, we aim to keep it short and communicate clearly.</P>
              <H>Security First</H>
              <P>We prioritize account protection, secure authentication, and transaction integrity at every layer of the product.</P>
              <H>User Friendly by Design</H>
              <P>PayMe is designed to make digital payments simple. We focus on clarity, transparency, and a smooth experience for every user.</P>
              <H>Last Updated</H>
              <P>March 2026</P>
            </div>
          </motion.div>
        )}

        {/* ── LEADERBOARD ────────────────────────────────────────── */}
        {screen === 'leaderboard' && (
          <LeaderboardScreen onBack={() => setScreen('main')} />
        )}

        {/* ── SECURITY QUESTION ─────────────────────────────────── */}
        {screen === 'security-question' && (
          <SecurityQuestionScreen onBack={() => setScreen('security')} />
        )}

      </AnimatePresence>

      <AnimatePresence>
        {showSupport && <UserSupportModal onClose={() => setShowSupport(false)} />}
        {showExportModal && <ExportKeyModal onClose={() => setShowExportModal(false)} />}
        {showDeleteDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => !deletingAccount && setShowDeleteDialog(false)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 450, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 360, borderRadius: 20, background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 18px 42px rgba(0,0,0,0.32)', overflow: 'hidden' }}
            >
              <div style={{ padding: '18px 18px 14px', textAlign: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Delete size={20} color="#EF4444" />
                </div>
                <p style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Delete Account?</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.45, marginBottom: 12 }}>
                  This action is permanent and cannot be undone. Type <strong style={{ color: '#EF4444' }}>DELETE</strong> to confirm.
                </p>
                <input
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  placeholder="Type DELETE"
                  autoFocus
                  style={{ width: '100%', height: 42, borderRadius: 12, border: '1px solid var(--color-border-strong)', background: 'var(--color-surface-2)', color: 'var(--color-text)', fontSize: 13, fontFamily: 'inherit', textAlign: 'center', outline: 'none' }}
                />
                {deleteError && (
                  <p style={{ color: '#EF4444', fontSize: 12, marginTop: 8 }}>{deleteError}</p>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={deletingAccount}
                  style={{ height: 50, border: 'none', background: 'transparent', color: 'var(--color-text-2)', fontWeight: 600, cursor: deletingAccount ? 'not-allowed' : 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount}
                  style={{ height: 50, border: 'none', borderLeft: '1px solid var(--color-border)', background: 'transparent', color: '#EF4444', fontWeight: 700, cursor: deletingAccount ? 'not-allowed' : 'pointer' }}
                >
                  {deletingAccount ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
