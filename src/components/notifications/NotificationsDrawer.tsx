import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../providers/AuthProvider';
import { ArrowLeft, DollarSign, Lock, Bell, UserPlus } from 'lucide-react';
import * as db from '../../lib/db';
import { useLiveNotifications, markLiveNotificationRead } from '../../hooks/useLiveNotifications';
import { formatDate } from '../../lib/utils';
import { useAppState } from '../../App';

import {
  demoNotifications,
  onNotificationsChange,
  markNotificationRead as globalMarkRead,
  markAllNotificationsRead as globalMarkAllRead,
  filterNotificationsByPrefs,
  getNotificationPrefs,
  onNotificationPrefsChange,
  type NotificationItem
} from '../../lib/appState';

const TYPE_ICONS: Record<string, any> = {
  payment_received: DollarSign,
  payment: DollarSign,
  security: Lock,
  system: Bell,
  request: UserPlus,
  money_request: UserPlus,
};

interface NotificationsDrawerProps {
  onClose: () => void;
}

export default function NotificationsDrawer({ onClose }: NotificationsDrawerProps) {
  const { mode } = useAppState();
  const { user } = useAuth();
  
  const [demoNotifs, setDemoNotifs] = useState<NotificationItem[]>(demoNotifications);
  const [selected, setSelected] = useState<any>(null);

  const { notifications: liveNotifs } = useLiveNotifications(
    mode === 'live' && user
      ? { userId: user?.userId }
      : null
  );
  const [notificationPrefs, setNotificationPrefs] = useState(getNotificationPrefs());

  useEffect(() => {
    return onNotificationsChange(setDemoNotifs);
  }, []);

  useEffect(() => onNotificationPrefsChange(setNotificationPrefs), []);

  const notifications = filterNotificationsByPrefs(
    mode === 'live' ? liveNotifs : demoNotifs,
    notificationPrefs
  );
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = async (notif: any) => {
    if (mode === 'live') {
      const notificationId = notif?.id || notif?._id;
      if (!notificationId) return;
      if (!notif.read) {
        markLiveNotificationRead(notificationId);
        try {
          await db.markRead({ notificationId });
        } catch (err) {
          console.error('Failed to persist notification read state:', err);
        }
      }
    } else {
      globalMarkRead(notif.id);
    }
  };

  const handleSelect = (notif: any) => {
    handleMarkRead(notif);
    setSelected(notif);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 350, background: 'var(--color-overlay)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 1000, damping: 50, mass: 0.3 }}
        drag="y"
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.22 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 140 || info.velocity.y > 900) onClose();
        }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'var(--color-surface)',
          borderRadius: 'var(--modal-radius) var(--modal-radius) 0 0',
          borderTop: '1px solid var(--color-divider)',
          padding: '0 0 52px',
          maxHeight: '80vh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-divider)', margin: '14px auto 0' }} />

        <AnimatePresence initial={false}>
          {/* LIST VIEW */}
          {!selected && (
            <motion.div key="list" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ type: 'spring', stiffness: 1000, damping: 50, mass: 0.3 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px' }}>
                <h2 style={{ fontSize: 22, fontWeight: 800 }}>
                  Notifications
                  {unreadCount > 0 && (
                    <span style={{ marginLeft: 8, background: '#F97316', color: 'var(--color-text)', fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 7px' }}>{unreadCount}</span>
                  )}
                </h2>
                {unreadCount > 0 && mode !== 'live' && (
                  <button
                    onClick={globalMarkAllRead}
                    style={{ background: 'none', border: 'none', color: '#F97316', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ padding: '0 24px' }}>
                {notifications.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-4)' }}>
                    <div style={{ marginBottom: 10 }}><Bell size={32} /></div>
                    <p>No notifications yet</p>
                  </div>
                )}
                {notifications.map((notif, i) => {
                  const date = (notif as any).createdAt || (notif as any)._creationTime || (notif as any).created_at || (notif as any).timestamp;
                  return (
                  <div key={(notif as any).id || (notif as any)._id}>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => handleSelect(notif)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                        padding: '14px 0', cursor: 'pointer',
                        opacity: notif.read ? 0.6 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <div style={{ width: 42, height: 42, borderRadius: 14, background: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                        {(() => {
                          const Icon = TYPE_ICONS[notif.type] || Bell;
                          return <Icon size={20} />;
                        })()}
                        {!notif.read && <div style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: '50%', background: '#F97316', border: '2px solid var(--color-surface-2)' }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{notif.title}</p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(notif as any).body || (notif as any).content || (notif as any).message}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-4)', marginTop: 4 }}>{formatDate(date)}</p>
                      </div>
                    </motion.div>
                    {i < notifications.length - 1 && <div style={{ height: 1, background: 'var(--color-border)' }} />}
                  </div>
                )})}
              </div>
            </motion.div>
          )}

          {/* DETAIL VIEW */}
          {selected && (
            <motion.div key="detail" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ type: 'spring', stiffness: 1000, damping: 50, mass: 0.3 }} style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <button
                  onClick={() => setSelected(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#F97316', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
                >
                  <ArrowLeft size={16} /> Notifications
                </button>
                <p style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
                  {formatDate((selected as any).createdAt || (selected as any)._creationTime || (selected as any).created_at || (selected as any).timestamp)}
                </p>
              </div>

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  {(() => {
                    const Icon = TYPE_ICONS[selected.type] || Bell;
                    return <Icon size={32} />;
                  })()}
                </div>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>{selected.title}</h2>
              </div>

              <div style={{ background: 'var(--color-border)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '20px' }}>
                <p style={{ fontSize: 15, color: 'var(--color-text-2)', lineHeight: 1.7 }}>{selected.body || selected.content || (selected as any).message}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
