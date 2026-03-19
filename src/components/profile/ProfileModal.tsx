import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import VerificationBadge from '../common/VerificationBadge';
import { getInitials, getAvatarColor } from '../../lib/utils';
import { demoProfile, updateDemoProfile } from '../../lib/appState';
import * as db from '../../lib/db';
import { useAsyncQuery } from '../../hooks/useAsyncQuery';
import { useLiveProfileRefreshKey } from '../../hooks/useLiveProfileRefresh';
import { useAppState } from '../../App';

interface ProfileModalProps {
  onClose: () => void;
}

export default function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, walletPublicKey: walletAddress } = useAuth();
  const { mode } = useAppState();
  const profileRefreshKey = useLiveProfileRefreshKey();
  const profile = useAsyncQuery(
    mode === 'live' && user
      ? () => db.getProfile({ userId: user?.userId })
      : null,
    [mode, user?.userId, walletAddress, profileRefreshKey]
  );

  const displayName = user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';

  const [name, setName] = useState(demoProfile.name || displayName);
  const [occupation, setOccupation] = useState(demoProfile.occupation);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(demoProfile.avatarBase64);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const maxAvatarBytes = 20 * 1024 * 1024;

  useEffect(() => {
    if (mode === 'live' && profile) {
      setName(profile.name || displayName);
      setOccupation((profile as any).occupation || '');
      if ((profile as any).avatarBase64) {
        setAvatarBase64((profile as any).avatarBase64);
      }
    }
  }, [mode, profile, displayName]);

  // Username is permanent once claimed — read-only after that
  const username =
    mode === 'live'
      ? (profile?.username || displayName.toLowerCase().replace(/\s/g, '_'))
      : (demoProfile.username || displayName.toLowerCase().replace(/\s/g, '_'));
  const normalizedUsername = username.toLowerCase();

  const localRequirementsMet = !!name && !!avatarBase64;
  const verificationLevel =
    mode === 'live'
      ? (profile?.verificationLevel || 0)
      : (localRequirementsMet ? 1 : 0);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxAvatarBytes) {
      setAvatarError('Profile picture must be 20MB or less.');
      e.target.value = '';
      return;
    }
    setAvatarError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarBase64(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === 'live' && user) {
        await db.updateProfile({
          name,
          occupation,
          avatarBase64: avatarBase64 || undefined,
          externalUserId: user.userId,
        });
      } else {
        updateDemoProfile({ name, occupation, avatarBase64, verificationLevel: localRequirementsMet ? 1 : 0 });
        await new Promise(r => setTimeout(r, 600));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const avatarColor = getAvatarColor(name);
  const initials = getInitials(name);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 1000, damping: 50, mass: 0.3 }}
        onClick={e => e.stopPropagation()}
        className="modal-sheet"
        style={{ width: '100%', maxWidth: 480, background: 'var(--color-surface)', maxHeight: '92vh', overflowY: 'auto' }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-divider)', margin: '14px auto 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0 24px' }}>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>Profile</h2>
          <button onClick={onClose} style={{ background: 'var(--color-border)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text)' }}>
            <X size={17} />
          </button>
        </div>

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <div style={{ width: 90, height: 90, borderRadius: '50%', background: avatarBase64 ? 'transparent' : avatarColor, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'var(--color-text)', border: '3px solid var(--color-border-strong)' }}>
              {avatarBase64 ? <img src={avatarBase64} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            <button onClick={() => fileRef.current?.click()}
              style={{ position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: '50%', background: '#F97316', border: '2px solid var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--color-text)' }}>
              <Camera size={14} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{name || displayName}</span>
            <VerificationBadge level={verificationLevel} size={18} />
          </div>
          {occupation && <span style={{ fontSize: 13, color: 'var(--color-text-3)', marginTop: 3 }}>{occupation}</span>}
          {email && <span style={{ fontSize: 12, color: 'var(--color-text-3)', marginTop: 2 }}>{email}</span>}
          {avatarError && <span style={{ fontSize: 12, color: '#EF4444', marginTop: 6 }}>{avatarError}</span>}
        </div>

        {/* Editable fields */}
        {[
          { key: 'name', label: 'Name', value: name, setter: setName, placeholder: 'Your full name', locked: false },
          { key: 'occupation', label: 'Occupation', value: occupation, setter: setOccupation, placeholder: 'e.g. Software Engineer', locked: false },
        ].map(({ key, label, value, setter, placeholder }) => (
          <div key={key} style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{label}</p>
            <div style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-divider)', borderRadius: 'var(--card-radius)', padding: '13px 16px' }}>
              <input value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: 'var(--color-text)', fontSize: 15, fontFamily: 'inherit' }} />
            </div>
          </div>
        ))}

        {/* Username — permanent, locked */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', marginBottom: 6, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Username</p>
          <div style={{ background: 'var(--color-surface-2)', border: '1.5px solid var(--color-border)', borderRadius: 14, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 15, color: 'var(--color-text-3)', fontFamily: 'monospace' }}>@{normalizedUsername}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--color-border)', borderRadius: 8, padding: '4px 9px' }}>
              <AlertCircle size={11} color="var(--color-text-3)" />
              <span style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 600 }}>PERMANENT</span>
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 5, paddingLeft: 4 }}>
            Username changes require contacting support. Your username is how others find and pay you.
          </p>
        </div>

        {/* Verification status */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ background: verificationLevel >= 1 ? 'rgba(29,155,240,0.08)' : 'var(--color-border)', border: `1px solid ${verificationLevel >= 1 ? 'rgba(29,155,240,0.25)' : 'var(--color-border)'}`, borderRadius: 16, padding: '14px 18px', marginBottom: 24, marginTop: 8 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <VerificationBadge level={verificationLevel >= 1 ? 1 : 0} size={16} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>{verificationLevel >= 1 ? 'Level 1 Verified' : 'Get Verified'}</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-3)', lineHeight: 1.5 }}>
            {verificationLevel >= 1
              ? 'You have a blue checkmark. Others can trust your identity.'
              : 'Add your name, occupation, and profile picture, then save to earn your blue checkmark.'}
          </p>
          {verificationLevel < 1 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { label: 'Profile picture', done: !!avatarBase64 },
                { label: 'Full name', done: !!name },
                { label: 'Occupation', done: !!occupation },
              ].map((item, i) => (
                <motion.div 
                  key={item.label}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.03 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: item.done ? '#1D9BF0' : 'var(--color-border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.done && <Check size={9} color="var(--color-text)" strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 12, color: item.done ? 'var(--color-text-2)' : 'var(--color-text-3)' }}>{item.label}</span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.button 
          whileHover={{ scale: saving ? 1 : 1.02 }}
          whileTap={{ scale: saving ? 1 : 0.98 }}
          className="btn-primary" 
          onClick={handleSave} 
          disabled={saving} 
          style={{ width: '100%', height: 54, borderRadius: 18, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <AnimatePresence mode="wait">
            {saving ? (
              <motion.div
                key="saving"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <div className="spinner-small" /> Saving...
              </motion.div>
            ) : saved ? (
              <motion.div
                key="saved"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Check size={18} /> Saved
              </motion.div>
            ) : (
              <motion.span
                key="save"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Save Changes
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
