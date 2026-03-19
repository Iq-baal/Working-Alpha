import { useEffect, useState } from 'react';
import * as db from '../lib/db';

type LiveNotificationsState = {
  notifications: any[];
  loading: boolean;
};

type NotificationAuth = {
  userId: string;
} | null;

const listeners: Array<(state: LiveNotificationsState) => void> = [];
let liveUserId: string | null = null;
let liveNotifications: any[] = [];
let liveLoading = false;
let liveUnsub: (() => void) | null = null;
let livePollId: number | null = null;
let liveSubscribers = 0;
let liveInitPromise: Promise<void> | null = null;

const notifyListeners = () => {
  const state = { notifications: liveNotifications, loading: liveLoading };
  listeners.forEach((fn) => fn(state));
};

const getSortTime = (notif: any) => {
  const raw = notif?.timestamp ?? notif?.created ?? notif?.updated ?? 0;
  if (typeof raw === 'number') return raw;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortNotifications = (items: any[]) =>
  [...items].sort((a, b) => getSortTime(b) - getSortTime(a));

export const markLiveNotificationRead = (id: string) => {
  if (!id) return;
  const next = liveNotifications.map((notif) => {
    const notifId = notif?.id || notif?._id;
    if (notifId !== id) return notif;
    return { ...notif, read: true };
  });
  liveNotifications = sortNotifications(next);
  notifyListeners();
};

const upsertNotification = (record: any) => {
  if (!record) return;
  const id = record.id || record._id;
  if (!id) return;
  const next = new Map(liveNotifications.map((n) => [n.id || n._id, n]));
  next.set(id, record);
  liveNotifications = sortNotifications(Array.from(next.values()));
  notifyListeners();
};

// Stub — notifications are not live-subscribed via websocket

const stopLive = () => {
  if (liveUnsub) {
    try {
      liveUnsub();
    } catch {
      // ignore
    }
  }
  liveUnsub = null;
  if (livePollId !== null) {
    window.clearInterval(livePollId);
    livePollId = null;
  }
  liveUserId = null;
  liveNotifications = [];
  liveLoading = false;
  liveInitPromise = null;
};

const startPolling = (auth: NotificationAuth) => {
  if (!auth?.userId) return;
  if (livePollId !== null) return;
  livePollId = window.setInterval(async () => {
    try {
      const refreshed = await db.listNotifications({
        externalUserId: auth.userId,
      });
      liveNotifications = sortNotifications(refreshed);
      notifyListeners();
    } catch {
      // ignore polling errors
    }
  }, 30_000);
};

const startLive = async (auth: NotificationAuth) => {
  const userId = auth?.userId || null;
  if (!userId) return;
  if (liveInitPromise && liveUserId === userId) return liveInitPromise;

  liveUserId = userId;
  liveLoading = true;
  notifyListeners();

  liveInitPromise = (async () => {
    try {
      const initial = await db.listNotifications({
        externalUserId: userId,
      });
      liveNotifications = sortNotifications(initial);
      liveLoading = false;
      notifyListeners();

      if (liveUnsub) {
        try {
          liveUnsub();
        } catch {
          // ignore
        }
      }

      if (livePollId !== null) {
        window.clearInterval(livePollId);
        livePollId = null;
      }

      startPolling(auth);
    } catch (error) {
      console.error('Failed to subscribe to notifications:', error);
      liveLoading = false;
      notifyListeners();
      startPolling(auth);
    }
  })();

  return liveInitPromise;
};

export function useLiveNotifications(auth?: NotificationAuth): LiveNotificationsState {
  const [state, setState] = useState<LiveNotificationsState>({
    notifications: liveNotifications,
    loading: liveLoading,
  });

  useEffect(() => {
    if (!auth?.userId) {
      setState({ notifications: [], loading: false });
      return;
    }

    const listener = (next: LiveNotificationsState) => setState(next);
    listeners.push(listener);
    liveSubscribers += 1;

    void startLive(auth);
    notifyListeners();

    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
      liveSubscribers = Math.max(0, liveSubscribers - 1);
      if (liveSubscribers === 0) {
        stopLive();
      }
    };
  }, [auth?.userId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent;
      const record = custom?.detail;
      if (!record) return;
      if (liveUserId && record.userId && record.userId !== liveUserId) return;
      upsertNotification(record);
    };
    window.addEventListener('payme:notification', handler as EventListener);
    return () => {
      window.removeEventListener('payme:notification', handler as EventListener);
    };
  }, []);

  return state;
}
