import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Check, AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import AppleBackButton from '../common/AppleBackButton';
import VerificationBadge from '../common/VerificationBadge';
import { demoProfile, updateDemoProfile } from '../../lib/appState';
import { useAuth } from '../../providers/AuthProvider';
import * as db from '../../lib/db';

export default function VerificationScreen({
  onBack,
  onEditProfile,
  mode,
  profile,
}: {
  onBack: () => void,
  onEditProfile: () => void,
  mode: 'demo' | 'live',
  profile?: any,
}) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [stepDates, setStepDates] = useState([false, false, false]);
  const [done, setDone] = useState((mode === 'live' ? (profile?.verificationLevel || 0) : demoProfile.verificationLevel) >= 1);

  useEffect(() => {
    const level = mode === 'live' ? (profile?.verificationLevel || 0) : demoProfile.verificationLevel;
    setDone(level >= 1);
  }, [mode, profile?.verificationLevel]);

  const reqs = [
    { label: 'Profile Picture Added', met: mode === 'live' ? !!profile?.avatarBase64 : !!demoProfile.avatarBase64 },
    { label: 'Full Name Provided', met: mode === 'live' ? !!profile?.name : !!demoProfile.name },
    { label: 'Occupation Listed', met: mode === 'live' ? !!profile?.occupation : !!demoProfile.occupation },
  ];

  const allMet = reqs.every(r => r.met);

  const startCheck = async () => {
    setChecking(true);
    setStepDates([false, false, false]);
    let current = 0;
    
    const tick = setInterval(() => {
      setStepDates(prev => {
        const next = [...prev];
        next[current] = true;
        return next;
      });
      current++;
      
      if (current >= 3) {
        clearInterval(tick);
        setTimeout(async () => {
          setChecking(false);
          if (allMet) {
            setDone(true);
            if (mode === 'live' && user?.userId) {
              await db.updateProfile({
                externalUserId: user?.userId,
                name: profile?.name || undefined,
                occupation: profile?.occupation || undefined,
                avatarBase64: profile?.avatarBase64 || undefined,
              });
            } else {
              updateDemoProfile({ verificationLevel: 1 });
            }
          }
        }, 600);
      }
    }, 400);
  };

  return (
    <motion.div initial={{ x: 30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -30, opacity: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <AppleBackButton onBack={onBack} />
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>Verification</h2>
      </div>

      <div style={{ background: 'rgba(29,155,240,0.08)', border: '1px solid rgba(29,155,240,0.2)', borderRadius: 24, padding: '24px', marginBottom: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: 'rgba(29,155,240,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={40} color="#1D9BF0" />
          </div>
          {done && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ position: 'absolute', bottom: -6, right: -6 }}>
              <VerificationBadge level={1} size={32} />
            </motion.div>
          )}
        </div>
        
        <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
          {done ? 'Level 1 Verified' : 'Get Verified'}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--color-text-3)', lineHeight: 1.5, maxWidth: 260 }}>
          {done ? 'You have successfully verified your basic identity. Your blue checkmark is now visible to everyone.' : 'Complete your basic profile details to earn a blue checkmark and build trust on the network.'}
        </p>
      </div>

      {!done && (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '20px', marginBottom: 24 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-3)', marginBottom: 16, letterSpacing: '0.5px' }}>REQUIREMENTS</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reqs.map((req, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ 
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: checking && stepDates[i] ? (req.met ? '#22C55E' : '#EF4444') : 'var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.3s'
                }}>
                  {checking && stepDates[i] ? (
                    req.met ? <Check size={14} color="var(--color-text)" strokeWidth={3} /> : <AlertCircle size={14} color="var(--color-text)" />
                  ) : (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-text-4)' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: checking && stepDates[i] && !req.met ? '#EF4444' : 'var(--color-text)' }}>
                    {req.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {done ? (
        <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <CheckCircle2 size={20} color="#22C55E" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#22C55E', marginBottom: 4 }}>Verification Complete</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Level 2 (Green Checkmark) requiring Government ID will unlock when we launch on Solana Mainnet.
            </p>
          </div>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {!checking && !allMet && stepDates[2] && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: '#EF4444', textAlign: 'center', marginBottom: 12, background: 'rgba(239,68,68,0.1)', padding: 12, borderRadius: 12 }}>
                You are missing some requirements. Please update your profile.
              </p>
              <button className="btn-secondary" onClick={onEditProfile} style={{ width: '100%', height: 50, borderRadius: 16 }}>
                Edit Profile <ChevronRight size={16} />
              </button>
            </motion.div>
          )}

          <button 
            className="btn-primary" 
            onClick={startCheck} 
            disabled={checking}
            style={{ width: '100%', height: 54, borderRadius: 16, fontSize: 16 }}
          >
            {checking ? 'Checking Profile...' : (stepDates[2] && !allMet ? 'Check Again' : 'Verify Now')}
          </button>
        </AnimatePresence>
      )}
    </motion.div>
  );
}
