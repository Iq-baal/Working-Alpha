import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Play, Zap, Shield, Globe, Mail, Lock, Eye, EyeOff, CheckCircle, Wallet } from 'lucide-react';
import LiquidBackground from '../common/LiquidBackground';
import PayMeLogo from '../common/PayMeLogo';
import { useNav } from '../../App';
import { useAuth } from '../../providers/AuthProvider';

const SUBTITLES = [
  'Fast global transfers',
  'Near-zero fees for Africa',
  'Payments at light speed',
  'Your money, your way',
  'Send home in 2 seconds',
];

// Wallet creation animation steps
const WALLET_STEPS = [
  'Generating secure keypair...',
  'Encrypting private key...',
  'Securing with your password...',
  'Wallet ready.',
];

export default function WelcomeScreen() {
  const { goTo } = useNav();
  const { signUp, signIn } = useAuth();

  const [subtitleIdx, setSubtitleIdx] = useState(0);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletStep, setWalletStep] = useState(-1); // -1 = not started
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setSubtitleIdx(i => (i + 1) % SUBTITLES.length), 2800);
    return () => clearInterval(t);
  }, []);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setError(null);
    setLoading(false);
    setWalletStep(-1);
  };

  const runWalletAnimation = (): Promise<void> => {
    return new Promise(resolve => {
      let step = 0;
      setWalletStep(0);
      const interval = setInterval(() => {
        step++;
        if (step < WALLET_STEPS.length) {
          setWalletStep(step);
        } else {
          clearInterval(interval);
          resolve();
        }
      }, 600);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'signup') {
        // Run wallet creation animation before calling API
        await runWalletAnimation();

        const result = await signUp(email, '', password);
        if (!result.success) {
          setError(result.error || 'Sign up failed');
          setLoading(false);
          setWalletStep(-1);
          return;
        }

        // Brief pause to show "Wallet ready" state
        await new Promise(r => setTimeout(r, 600));
        setShowAuth(false);
        resetForm();
        goTo('app');
      } else {
        const result = await signIn(email, password);
        if (!result.success) {
          setError(result.error || 'Sign in failed');
          setLoading(false);
          return;
        }
        setShowAuth(false);
        resetForm();
        goTo('app');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
      setWalletStep(-1);
    }
  };

  const isCreatingWallet = walletStep >= 0;

  return (
    <motion.div
      className="app-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      style={{ overflow: 'hidden' }}
    >
      <LiquidBackground />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 var(--page-padding)' }}>

        {/* Logo */}
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 400 }} style={{ marginBottom: 48 }}>
          <div className="float"><PayMeLogo size={64} showText={true} textSize="32px" /></div>
        </motion.div>

        {/* Headline */}
        <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} style={{ color: 'var(--color-text)', fontSize: 'clamp(28px, 7vw, 40px)', fontWeight: 800, textAlign: 'center', letterSpacing: '-1.2px', lineHeight: 1.15, marginBottom: 16, maxWidth: 360 }}>
          Crypto payments,<br /><span className="text-gradient">without the complexity.</span>
        </motion.h1>

        {/* Animated subtitle */}
        <div style={{ height: 28, marginBottom: 56, overflow: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.p key={subtitleIdx} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.15 }} style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-3)', textAlign: 'center', letterSpacing: '-0.2px' }}>
              {SUBTITLES[subtitleIdx]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Feature pills */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 52 }}>
          {[{ icon: Zap, label: '2-second transfers' }, { icon: Shield, label: 'Bank-grade security' }, { icon: Globe, label: '19 currencies' }].map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, padding: '7px 14px', fontSize: 12, fontWeight: 500, color: 'var(--color-text-2)' }}>
              <Icon size={13} color="#F97316" />{label}
            </div>
          ))}
        </motion.div>

        {/* CTAs */}
        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="btn-primary"
            onClick={() => { setAuthMode('signup'); setShowAuth(true); }}
            style={{ width: '100%', height: 56, fontSize: 16, borderRadius: 18, boxShadow: '0 8px 32px rgba(245,158,11,0.35)' }}
          >
            Get Started <ArrowRight size={18} />
          </button>
          <button
            onClick={() => { setAuthMode('signin'); setShowAuth(true); }}
            style={{ width: '100%', height: 50, borderRadius: 18, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)', color: 'var(--color-text)', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
          >
            Sign In
          </button>
          <button
            className="btn-ghost"
            onClick={() => setShowTrailer(true)}
            style={{ width: '100%', height: 44, fontSize: 14, borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent' }}
          >
            <Play size={14} fill="currentColor" /> Watch Trailer
          </button>
        </motion.div>

        {/* Testnet badge */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 999, padding: '6px 14px' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F97316', boxShadow: '0 0 8px rgba(249,115,22,0.6)' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#F97316', letterSpacing: '0.5px' }}>TESTNET BETA · Solana Devnet</span>
        </motion.div>
      </div>

      {/* ── Auth Modal ── */}
      <AnimatePresence>
        {showAuth && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { if (!loading) { setShowAuth(false); resetForm(); } }}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 480,
                background: 'rgba(28,28,30,0.92)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                borderRadius: '28px 28px 0 0',
                border: '1px solid rgba(255,255,255,0.12)',
                borderBottom: 'none',
                padding: '8px 24px calc(48px + env(safe-area-inset-bottom, 0px))',
                boxShadow: '0 -20px 60px rgba(0,0,0,0.4)',
              }}
            >
              {/* Handle */}
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '12px auto 28px' }} />

              {/* Logo + Title */}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <PayMeLogo size={44} showText={false} />
                <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.8px', marginTop: 14, marginBottom: 6, color: '#fff' }}>
                  {authMode === 'signup' ? 'Create Account' : 'Welcome Back'}
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                  {authMode === 'signup'
                    ? 'Your Solana wallet is created automatically.'
                    : 'Sign in to access your wallet.'}
                </p>
              </div>

              {/* iOS Style Toggle Slider */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    padding: 3,
                    width: 200,
                    height: 40,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {/* Sliding background pill */}
                  <motion.div
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: authMode === 'signup' ? 3 : '50%',
                      width: 'calc(50% - 3px)',
                      height: 34,
                      background: '#F97316',
                      borderRadius: 8,
                      boxShadow: '0 2px 8px rgba(249,115,22,0.4)',
                    }}
                  />
                  {/* Sign Up button */}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signup'); resetForm(); }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      color: authMode === 'signup' ? '#fff' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      zIndex: 1,
                      transition: 'color 0.2s',
                    }}
                  >
                    Sign Up
                  </button>
                  {/* Sign In button */}
                  <button
                    type="button"
                    onClick={() => { setAuthMode('signin'); resetForm(); }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      color: authMode === 'signin' ? '#fff' : 'rgba(255,255,255,0.5)',
                      cursor: 'pointer',
                      zIndex: 1,
                      transition: 'color 0.2s',
                    }}
                  >
                    Sign In
                  </button>
                </div>
              </div>

              {/* Wallet creation animation (signup only) */}
              <AnimatePresence>
                {isCreatingWallet && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: 'hidden', marginBottom: 20 }}
                  >
                    <div style={{
                      background: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.2)',
                      borderRadius: 16,
                      padding: '16px 18px',
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <Wallet size={16} color="#F59E0B" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.3px' }}>Creating your wallet</span>
                      </div>
                      {WALLET_STEPS.map((step, i) => (
                        <motion.div
                          key={step}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: walletStep >= i ? 1 : 0.25, x: 0 }}
                          transition={{ duration: 0.3 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
                        >
                          {walletStep > i ? (
                            <CheckCircle size={14} color="#22c55e" />
                          ) : walletStep === i ? (
                            <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(245,158,11,0.5)', borderTopColor: '#F59E0B', flexShrink: 0 }} className="spinner" />
                          ) : (
                            <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', flexShrink: 0 }} />
                          )}
                          <span style={{ fontSize: 13, color: walletStep >= i ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)', fontWeight: walletStep === i ? 600 : 400 }}>
                            {step}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <AnimatePresence>
                {!isCreatingWallet && (
                  <motion.form
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onSubmit={handleSubmit}
                    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                  >
                    {/* Email field */}
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                      <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        disabled={loading}
                        style={{
                          width: '100%', height: 54,
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 14,
                          paddingLeft: 46, paddingRight: 16,
                          fontSize: 16,
                          color: '#fff',
                          outline: 'none',
                          fontFamily: 'inherit',
                          transition: 'border-color 0.2s',
                          WebkitAppearance: 'none',
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                    </div>

                    {/* Password field */}
                    <div style={{ position: 'relative' }}>
                      <Lock size={16} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder={authMode === 'signup' ? 'Password — also encrypts your wallet' : 'Password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        disabled={loading}
                        style={{
                          width: '100%', height: 54,
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 14,
                          paddingLeft: 46, paddingRight: 50,
                          fontSize: 16,
                          color: '#fff',
                          outline: 'none',
                          fontFamily: 'inherit',
                          transition: 'border-color 0.2s',
                          WebkitAppearance: 'none',
                        }}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 4, display: 'flex' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* signup hint */}
                    {authMode === 'signup' && (
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', paddingLeft: 4, lineHeight: 1.5 }}>
                        You'll choose your @username after your wallet is created.
                      </p>
                    )}

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#f87171', textAlign: 'center' }}
                        >
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit button */}
                    <motion.button
                      type="submit"
                      disabled={loading}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        marginTop: 4,
                        width: '100%', height: 56,
                        borderRadius: 18,
                        border: 'none',
                        background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                        color: '#fff',
                        fontSize: 16, fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 8px 28px rgba(245,158,11,0.4)',
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {loading ? (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff' }} className="spinner" />
                      ) : (
                        <>{authMode === 'signup' ? 'Create Account' : 'Sign In'} <ArrowRight size={18} /></>
                      )}
                    </motion.button>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Toggle signin/signup */}
              {!isCreatingWallet && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
                    {authMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                  </span>
                  <button
                    onClick={() => { setAuthMode(m => m === 'signup' ? 'signin' : 'signup'); setError(null); }}
                    style={{ background: 'none', border: 'none', color: '#F59E0B', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    {authMode === 'signup' ? 'Sign In' : 'Sign Up'}
                  </button>
                </div>
              )}

              {/* Divider + Watch Trailer */}
              {!isCreatingWallet && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 0' }}>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.5px' }}>OR</span>
                    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  </div>
                  <button
                    onClick={() => setShowTrailer(true)}
                    style={{
                      marginTop: 14,
                      width: '100%', height: 48,
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: 14, fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <Play size={14} fill="currentColor" /> Watch Trailer
                  </button>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 16, lineHeight: 1.6 }}>
                    By continuing you agree to PayMe's{' '}
                    <span style={{ color: 'rgba(245,158,11,0.7)', cursor: 'pointer' }}>Terms</span>
                    {' '}and{' '}
                    <span style={{ color: 'rgba(245,158,11,0.7)', cursor: 'pointer' }}>Privacy Policy</span>
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trailer Modal ── */}
      <AnimatePresence>
        {showTrailer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTrailer(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 60,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.88, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 400 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 340,
                background: 'rgba(28,28,30,0.95)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                borderRadius: 28,
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '36px 28px 28px',
                textAlign: 'center',
                boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
              }}
            >
              <div style={{ marginBottom: 20 }}>
                <PayMeLogo size={56} showText={false} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 12, letterSpacing: '-0.4px' }}>
                Something special is coming
              </h3>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, marginBottom: 28 }}>
                We're cooking the trailer. You won't be disappointed, we promise!
              </p>
              <button
                onClick={() => setShowTrailer(false)}
                style={{
                  width: '100%', height: 52,
                  borderRadius: 16,
                  border: 'none',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontSize: 16, fontWeight: 700,
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.16)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
