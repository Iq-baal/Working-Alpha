import * as db from './db';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
};

export const registerPush = async (userId: string) => {
  if (!userId) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  // Get VAPID public key from Worker API
  let vapidPublicKey: string;
  try {
    const result = await db.getVapidPublicKey();
    if (!result) {
      console.warn('VAPID public key not available from server. Push notifications disabled.');
      return;
    }
    vapidPublicKey = result;
  } catch (err) {
    console.error('Failed to fetch VAPID public key:', err);
    return;
  }

  if (Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch { /* noop */ }
  }

  if (Notification.permission !== 'granted') return;

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }
    
    // Subscribe via Worker API - pass the full subscription object
    await db.subscribePush(subscription);
    
    console.log('Push notification subscription successful');
  } catch (err) {
    console.error('Push registration failed:', err);
  }
};

export const updatePushPrefs = async (_userId: string) => {
  // Notification prefs are now managed via db.updateNotificationPrefs()
  // This function is kept for backwards compatibility but does nothing
  // since prefs are already persisted when toggled in Settings
};

export const unregisterPush = async (_userId: string) => {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    // Unsubscribe via Worker API
    await db.unsubscribePush(subscription.endpoint).catch(() => undefined);
    await subscription.unsubscribe().catch(() => undefined);
    
    console.log('Push notification unsubscription successful');
  } catch (err) {
    console.error('Push unregistration failed:', err);
  }
};
