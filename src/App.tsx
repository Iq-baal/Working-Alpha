import { createContext, useContext, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './providers/AuthProvider';
import DebugOverlay from './components/common/DebugOverlay';
import DebugConsole from './components/common/DebugConsole';
import ErrorBoundary from './components/common/ErrorBoundary';
import WelcomeScreen from './components/auth/WelcomeScreen';
import UsernameClaim from './components/auth/UsernameClaim';
import InviteGate from './components/auth/InviteGate';
import Dashboard from './components/dashboard/Dashboard';
import { demoProfile, onProfileChange, DemoProfile, getBiometrics, hasPin } from './lib/appState';
import PinGate from './components/common/PinGate';

type AppStep = 'welcome' | 'invite' | 'claim' | 'app';
type AppMode = 'demo' | 'live';

interface AppState {
  mode: AppMode;
  isAdmin: boolean;
  setMode: (m: AppMode) => void;
  setAdmin: (a: boolean) => void;
}

export const AppStateContext = createContext<AppState>({
  mode: 'demo',
  isAdmin: false,
  setMode: () => {},
  setAdmin: () => {},
});

export const useAppState = () => useContext(AppStateContext);

// Navigation context — lets child components advance beyond welcome
export const NavContext = createContext<{ goTo: (s: AppStep) => void }>({ goTo: () => {} });
export const useNav = () => useContext(NavContext);

function AuthAwareApp() {
  const [step, setStep] = useState<AppStep>('welcome');
  const { user, isAuthenticated, isLoading, walletPublicKey } = useAuth();
  const { mode, setAdmin, setMode } = useAppState();
  const [localDemoProfile, setLocalDemoProfile] = useState<DemoProfile>(demoProfile);
  const [appUnlocked, setAppUnlocked] = useState(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem('payme_app_unlocked') === '1';
  });
  const lockRequired = isAuthenticated && (hasPin() || getBiometrics());

  // Extract stable primitive flags — avoids re-running the nav effect
  // every time a new user object is created (e.g. from polling/refreshUser)
  const inviteValidated = user?.inviteValidated ?? false;
  const usernameClaimed = user?.usernameClaimed ?? false;

  useEffect(() => {
    return onProfileChange(setLocalDemoProfile);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setAppUnlocked(true);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('payme_app_unlocked');
      }
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!lockRequired) {
      setAppUnlocked(true);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('payme_app_unlocked');
      }
    }
  }, [lockRequired]);

  // Use primitive flags (not the whole user object) so polling / refreshUser
  // creating a new user reference doesn't re-trigger this effect unnecessarily.
  useEffect(() => {
    if (isAuthenticated && user) {
      setMode('live');
      if (!inviteValidated) {
        if (step !== 'invite') setStep('invite');
      } else if (!usernameClaimed) {
        if (step !== 'claim') setStep('claim');
      } else {
        if (step !== 'app') setStep('app');
      }
    } else if (!isAuthenticated && !isLoading) {
      setMode('demo');
      setAdmin(false);
      if (localDemoProfile.usernameClaimed && step !== 'app') {
        setStep('app');
      } else if (step !== 'welcome') {
        setStep('welcome');
      }
    }
  }, [isAuthenticated, isLoading, inviteValidated, usernameClaimed, localDemoProfile.usernameClaimed, step, setMode, setAdmin]);

  const renderLoader = (label: string) => (
    <div className="app-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', margin: '0 auto 12px', border: '3px solid rgba(249,115,22,0.2)', borderTop: '3px solid #F97316' }} className="spinner" />
        <p style={{ fontSize: 13, color: 'var(--color-text-3)' }}>{label}</p>
      </div>
    </div>
  );

  const content = isLoading ? (
    renderLoader('Starting PayMe...')
  ) : (
    <NavContext.Provider value={{ goTo: setStep }}>
      <AnimatePresence initial={true}>
        {step === 'welcome' && <WelcomeScreen key="welcome" />}
        {step === 'invite' && <InviteGate key="invite" onAuthorized={() => setStep('claim')} />}
        {step === 'claim' && <UsernameClaim key="claim" onClaimed={() => setStep('app')} />}
        {step === 'app' && (
          <ErrorBoundary key="app-boundary">
            <Dashboard key="app" />
          </ErrorBoundary>
        )}
      </AnimatePresence>
    </NavContext.Provider>
  );

  return (
    <>
      {content}
      {lockRequired && !appUnlocked && isAuthenticated && (
        <PinGate
          onSuccess={() => {
            setAppUnlocked(true);
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('payme_app_unlocked', '1');
            }
          }}
          onClose={() => {}}
          allowClose={false}
        />
      )}
      <DebugConsole />
      <DebugOverlay
        snapshot={{
          authState: isAuthenticated ? 'AUTHENTICATED' : 'UNAUTHENTICATED',
          authError: null,
          sdkHasLoaded: true,
          isLoggedIn: isAuthenticated,
          authUserId: user?.userId || null,
          lastKnownUserId: user?.userId || null,
          walletId: null,
          walletAddress: walletPublicKey || null,
          tokenPresent: !!user,
          sessionPinned: lockRequired && appUnlocked,
          sessionKey: user?.userId || null,
          authStable: isAuthenticated,
          mode,
          step,
          isLoading,
          hasBoundLiveSession: isAuthenticated,
          hasResolvedLiveProfile: !!user,
          profileLoaded: !!user,
          bonusClaimed: null,
        }}
      />
    </>
  );
}

export default function App() {
  const [mode, setMode] = useState<AppMode>('demo');
  const [isAdmin, setAdmin] = useState(false);

  return (
    <AppStateContext.Provider value={{ mode, isAdmin, setMode, setAdmin }}>
      <AuthProvider>
        <ErrorBoundary>
          <AuthAwareApp />
        </ErrorBoundary>
      </AuthProvider>
    </AppStateContext.Provider>
  );
}
