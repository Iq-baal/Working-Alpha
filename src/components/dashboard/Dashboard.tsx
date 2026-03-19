import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Shield } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import BottomNav from '../common/BottomNav';
import PayMeLogo from '../common/PayMeLogo';
import WalletTab from './WalletTab';
import HistoryTab from '../history/HistoryTab';
import MerchantTab from '../tabs/MerchantTab';
import NetworkTab from '../tabs/NetworkTab';
import SettingsTab from '../settings/SettingsTab';
import NotificationsDrawer from '../notifications/NotificationsDrawer';
import ProfileModal from '../profile/ProfileModal';
import VerificationBadge from '../common/VerificationBadge';
import AdminDashboard from '../admin/AdminDashboard';

import { useAppState } from '../../App';
import * as db from '../../lib/db';
import { useAsyncQuery } from '../../hooks/useAsyncQuery';
import { useLiveProfileRefreshKey } from '../../hooks/useLiveProfileRefresh';
import { useLiveNotifications } from '../../hooks/useLiveNotifications';
import { demoProfile, onProfileChange, demoNotifications, onNotificationsChange, filterNotificationsByPrefs, getNotificationPrefs, onNotificationPrefsChange } from '../../lib/appState';
import { registerPush, updatePushPrefs } from '../../lib/push';
import type { Tab } from '../../types';
import { getInitials, getAvatarColor } from '../../lib/utils';

const slideVariants = {
  enter: (dir: number) => ({ 
    x: dir * 20, 
    opacity: 0, 
    scale: 0.99,
  }),
  center: { 
    x: 0, 
    opacity: 1, 
    scale: 1,
  },
  exit: (dir: number) => ({ 
    x: -dir * 20, 
    opacity: 0, 
    scale: 0.99,
  }),
};

const TAB_ORDER: Tab[] = ['wallet', 'history', 'merchant', 'network', 'settings'];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Demo verification level is now purely tracked in `appState.ts` via `demoProfile.verificationLevel`

export default function Dashboard() {
  const { user, walletPublicKey: walletAddress } = useAuth();
  const { mode, isAdmin } = useAppState();
  const profileRefreshKey = useLiveProfileRefreshKey();
  const profile = useAsyncQuery(
    mode === 'live' && user
      ? () => db.getProfile({ userId: user?.userId })
      : null,
    [mode, user?.userId, walletAddress, profileRefreshKey]
  );

  const { notifications: liveNotifications } = useLiveNotifications(
    mode === 'live' && user
      ? { userId: user?.userId }
      : null
  );
  const [activeTab, setActiveTab] = useState<Tab>('wallet');
  const [prevTab, setPrevTab] = useState<Tab>('wallet');
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [greeting, setGreeting] = useState(getGreeting());
  const [showAdmin, setShowAdmin] = useState(false);
  const [reduceMotionOnPhone, setReduceMotionOnPhone] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );
  const pushedNotifIdsRef = useRef<Set<string>>(new Set());
  const [notificationPrefs, setNotificationPrefs] = useState(getNotificationPrefs());
  const notificationPrefsRef = useRef(getNotificationPrefs());
  const displayName =
    mode === 'live'
      ? (profile?.name || user?.email?.split('@')[0] || 'User')
      : (demoProfile.name || user?.email?.split('@')[0] || 'User');
  const firstName = displayName.split(' ')[0];
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);
  const avatarBase64 = mode === 'live' ? ((profile as any)?.avatarBase64 || null) : demoProfile.avatarBase64;
  const verificationLevel = mode === 'live' ? (profile?.verificationLevel || 0) : demoProfile.verificationLevel;

  // In Live mode, notifications are empty for now. In Demo mode, show mock notifications.
  const [unreadCount, setUnreadCount] = useState(
    mode === 'demo' ? filterNotificationsByPrefs(demoNotifications, getNotificationPrefs()).filter(n => !n.read).length : 0
  );

  // Re-render when profile name changes or notifications update
  const [, setProfileTick] = useState(0);
  useEffect(() => {
    const unsubProfile = onProfileChange(() => setProfileTick(n => n + 1));
    const unsubPrefs = onNotificationPrefsChange((prefs) => {
      notificationPrefsRef.current = prefs;
      setNotificationPrefs(prefs);
    });
    const unsubNotifs = onNotificationsChange((notifs) => {
      if (mode === 'demo') {
        const filtered = filterNotificationsByPrefs(notifs, notificationPrefsRef.current);
        setUnreadCount(filtered.filter(n => !n.read).length);
      }
    });
    return () => { unsubProfile(); unsubNotifs(); unsubPrefs(); };
  }, [mode]);

  useEffect(() => {
    if (mode === 'live') {
      const filtered = filterNotificationsByPrefs(liveNotifications, notificationPrefs);
      setUnreadCount(filtered.filter(n => !n.read).length);
    }
  }, [mode, liveNotifications, notificationPrefs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(pointer: coarse)');
    const updateMotionPreference = () => setReduceMotionOnPhone(media.matches);
    updateMotionPreference();

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', updateMotionPreference);
      return () => media.removeEventListener('change', updateMotionPreference);
    }

    media.addListener(updateMotionPreference);
    return () => media.removeListener(updateMotionPreference);
  }, []);

  useEffect(() => {
    if (mode !== 'live') return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => undefined);
    }
    if (Notification.permission !== 'granted') return;
    const filtered = filterNotificationsByPrefs(liveNotifications, notificationPrefs);
    filtered
      .filter((n: any) => !n.read)
      .forEach((n: any) => {
        if (pushedNotifIdsRef.current.has(n._id || n.id)) return;
        pushedNotifIdsRef.current.add(n._id || n.id);
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready
            .then((reg) => reg.showNotification(n.title || 'PayMe', { body: n.content || '' }))
            .catch(() => undefined);
        }
      });
  }, [mode, liveNotifications]);

  useEffect(() => {
    if (mode !== 'live' || !user?.userId) return;
    registerPush(user?.userId).catch((err) => console.error('Push registration failed:', err));
  }, [mode, user?.userId]);

  useEffect(() => {
    if (mode !== 'live' || !user?.userId) return;
    updatePushPrefs(user?.userId).catch((err) => console.error('Push prefs update failed:', err));
  }, [mode, user?.userId, notificationPrefs]);

  // Update greeting if user leaves app over midnight
  useEffect(() => {
    const id = setInterval(() => setGreeting(getGreeting()), 60000);
    return () => clearInterval(id);
  }, []);

  const handleTabChange = (tab: Tab) => {
    setPrevTab(activeTab);
    setActiveTab(tab);
  };

  const dir = TAB_ORDER.indexOf(activeTab) > TAB_ORDER.indexOf(prevTab) ? 1 : -1;
  const tabTransition = reduceMotionOnPhone
    ? { duration: 0.12, ease: 'linear' as const }
    : { type: 'spring' as const, stiffness: 1000, damping: 50, mass: 0.3 };
  const mobileSlideVariants = reduceMotionOnPhone
    ? {
        enter: { opacity: 0 },
        center: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : slideVariants;

  return (
    <motion.div
      className="app-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      <div className="app-header" style={{
        padding: 'max(52px, env(safe-area-inset-top, 0px) + 16px) var(--page-padding) 14px',
        background: 'var(--color-header-bg)',
        borderBottom: '1px solid var(--color-divider)',
        flexShrink: 0,
      }}>
        {/* Single aligned row: greeting left, logo center, actions right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, minWidth: 0 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-3)', fontWeight: 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {greeting}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <p style={{ fontSize: 18, color: 'var(--color-text)', fontWeight: 700, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {firstName}
              </p>
              {verificationLevel > 0 && (
                <VerificationBadge level={verificationLevel} size={15} />
              )}
            </div>
          </div>

          <div style={{ justifySelf: 'center' }}>
            <PayMeLogo size={34} showText={false} />
          </div>

          <div style={{ justifySelf: 'end', display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => setShowNotifs(true)}
              style={{
                position: 'relative', background: 'var(--color-border)',
                border: '1px solid var(--color-border)',
                borderRadius: 12, width: 38, height: 38,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--color-text)',
              }}
            >
              <Bell size={17} strokeWidth={1.8} />
              {unreadCount > 0 && (
                <div style={{ position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: '50%', background: '#F97316', border: '1.5px solid var(--color-bg)' }} />
              )}
            </button>

            <button
              onClick={() => setShowProfile(true)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <div className="avatar" style={{ width: 36, height: 36, background: avatarBase64 ? 'transparent' : avatarColor, color: 'var(--color-text)', fontSize: 12, overflow: 'hidden', border: avatarBase64 ? '1px solid var(--color-border)' : 'none' }}>
                {avatarBase64 ? <img src={avatarBase64} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
              </div>
            </button>

            {isAdmin && (
              <button
                onClick={() => setShowAdmin(true)}
                style={{
                  background: 'var(--color-orange-dim)',
                  border: '1px solid rgba(249,115,22,0.3)',
                  borderRadius: 12, width: 38, height: 38,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#F97316',
                }}
              >
                <Shield size={18} fill="currentColor" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence initial={false} custom={dir}>
          <motion.div
            key={activeTab}
            custom={dir}
            variants={mobileSlideVariants}
            initial={reduceMotionOnPhone ? false : "enter"}
            animate="center"
            exit={reduceMotionOnPhone ? undefined : "exit"}
            transition={tabTransition}
            style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden' }}
            className="scroll-content"
          >
            {activeTab === 'wallet'   && <WalletTab onSeeAll={() => handleTabChange('history')} />}
            {activeTab === 'history'  && <HistoryTab />}
            {activeTab === 'merchant' && <MerchantTab />}
            {activeTab === 'network'  && <NetworkTab />}
            {activeTab === 'settings' && <SettingsTab openProfileModal={() => setShowProfile(true)} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav active={activeTab} onChange={handleTabChange} />

      <AnimatePresence>
        {showNotifs && <NotificationsDrawer onClose={() => setShowNotifs(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showAdmin && <AdminDashboard onClose={() => setShowAdmin(false)} />}
      </AnimatePresence>

    </motion.div>
  );
}
