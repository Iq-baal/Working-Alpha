/**
 * Global App State — currency, PIN, theme
 * Single source of truth so WalletTab and SendModal share the same selected currency
 */

import type { Currency, Transaction } from '../types';
import { CURRENCIES } from './utils';

// ── Currency ─────────────────────────────────────────────────────────────────
const CURRENCY_STORAGE_KEY = 'payme_currency_code';
const savedCurrencyCode =
  typeof window !== 'undefined' ? localStorage.getItem(CURRENCY_STORAGE_KEY) : null;
let _currency: Currency = CURRENCIES.find((c) => c.code === savedCurrencyCode) ?? CURRENCIES[0];
const _currencyListeners: Array<(c: Currency) => void> = [];

export const getGlobalCurrency = () => _currency;

export const setGlobalCurrency = (c: Currency) => {
  _currency = c;
  if (typeof window !== 'undefined') {
    localStorage.setItem(CURRENCY_STORAGE_KEY, c.code);
  }
  _currencyListeners.forEach(fn => fn(c));
};

export const onCurrencyChange = (fn: (c: Currency) => void) => {
  _currencyListeners.push(fn);
  return () => {
    const idx = _currencyListeners.indexOf(fn);
    if (idx !== -1) _currencyListeners.splice(idx, 1);
  };
};

// ── PIN ───────────────────────────────────────────────────────────────────────
const PIN_STORAGE_KEY = 'payme_tx_pin';
const BIOMETRICS_STORAGE_KEY = 'payme_biometrics_enabled';
const BIOMETRICS_CRED_ID_KEY = 'payme_bio_credential_id';

let _pin: string | null =
  typeof window !== 'undefined' ? localStorage.getItem(PIN_STORAGE_KEY) : null;
let _biometrics =
  typeof window !== 'undefined' ? localStorage.getItem(BIOMETRICS_STORAGE_KEY) === '1' : false;

const toBase64Url = (input: ArrayBuffer | Uint8Array): string => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

// -- Rich mode --
const RICH_MODE_STORAGE_KEY = 'payme_rich_mode';
let _richMode =
  typeof window !== 'undefined' ? localStorage.getItem(RICH_MODE_STORAGE_KEY) === '1' : false;
const _richModeListeners: Array<(value: boolean) => void> = [];

export const getRichMode = () => _richMode;

export const setRichMode = (value: boolean) => {
  _richMode = value;
  if (typeof window !== 'undefined') {
    localStorage.setItem(RICH_MODE_STORAGE_KEY, value ? '1' : '0');
  }
  _richModeListeners.forEach((fn) => fn(value));
};

export const onRichModeChange = (fn: (value: boolean) => void) => {
  _richModeListeners.push(fn);
  return () => {
    const idx = _richModeListeners.indexOf(fn);
    if (idx !== -1) _richModeListeners.splice(idx, 1);
  };
};

const fromBase64Url = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const randomBytes = (len = 32) => {
  const out = new Uint8Array(len);
  crypto.getRandomValues(out);
  return out;
};

const supportsWebAuthn = () =>
  typeof window !== 'undefined' &&
  window.isSecureContext &&
  typeof PublicKeyCredential !== 'undefined' &&
  !!navigator.credentials;

export const hasPin = () => _pin !== null;
export const getBiometrics = () => _biometrics;
export const canUseBiometrics = () => supportsWebAuthn();

export const setPin = (pin: string) => {
  _pin = pin;
  if (typeof window !== 'undefined') localStorage.setItem(PIN_STORAGE_KEY, pin);
};

export const clearPin = () => {
  _pin = null;
  if (typeof window !== 'undefined') localStorage.removeItem(PIN_STORAGE_KEY);
};

export const setBiometrics = (on: boolean) => {
  _biometrics = on;
  if (typeof window !== 'undefined') localStorage.setItem(BIOMETRICS_STORAGE_KEY, on ? '1' : '0');
  if (!on && typeof window !== 'undefined') {
    localStorage.removeItem(BIOMETRICS_CRED_ID_KEY);
  }
};

export const verifyPin = (input: string) => _pin === input;

export const registerBiometricCredential = async () => {
  if (!supportsWebAuthn()) return false;
  const userId = randomBytes(32);
  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: randomBytes(32),
    rp: { name: 'PayMe Protocol' },
    user: {
      id: userId,
      name: 'payme-user',
      displayName: 'PayMe User',
    },
    pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
    timeout: 60000,
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    attestation: 'none',
  };

  try {
    const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
    if (!credential) return false;
    const rawId = new Uint8Array(credential.rawId);
    // Keep raw credential id as provided by browser.
    if (typeof window !== 'undefined') {
      localStorage.setItem(BIOMETRICS_CRED_ID_KEY, toBase64Url(rawId));
    }
    return true;
  } catch (e) {
    console.error('Biometric registration failed:', e);
    return false;
  }
};

export const authenticateWithBiometrics = async () => {
  if (!supportsWebAuthn()) return false;
  const storedId = typeof window !== 'undefined' ? localStorage.getItem(BIOMETRICS_CRED_ID_KEY) : null;
  if (!storedId) return false;

  try {
    const credential = (await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{ id: fromBase64Url(storedId), type: 'public-key' }],
        timeout: 60000,
        userVerification: 'required',
      },
    })) as PublicKeyCredential | null;
    return !!credential;
  } catch (e) {
    console.error('Biometric auth failed:', e);
    return false;
  }
};

// ── Theme ─────────────────────────────────────────────────────────────────────
let _theme: 'light' | 'dark' = (localStorage.getItem('payme_theme') as 'light' | 'dark') || 
  (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

if (typeof document !== 'undefined') {
  document.documentElement.setAttribute('data-theme', _theme);
}

const _themeListeners: Array<(t: 'light' | 'dark') => void> = [];

export const getTheme = () => _theme;
export const setGlobalTheme = (t: 'light' | 'dark') => {
  _theme = t;
  localStorage.setItem('payme_theme', t);
  document.documentElement.setAttribute('data-theme', t);
  _themeListeners.forEach(fn => fn(t));
};
export const onThemeChange = (fn: (t: 'light' | 'dark') => void) => {
  _themeListeners.push(fn);
  return () => {
    const idx = _themeListeners.indexOf(fn);
    if (idx !== -1) _themeListeners.splice(idx, 1);
  };
};

// ── Notification Preferences ────────────────────────────────────────────────
export type NotificationPrefs = {
  payments: boolean;
  security: boolean;
  network: boolean;
};

const NOTIFICATION_PREFS_KEY = 'payme_notification_prefs';
const loadPrefs = (): NotificationPrefs => {
  if (typeof window === 'undefined') return { payments: true, security: true, network: false };
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return { payments: true, security: true, network: false };
    const parsed = JSON.parse(raw);
    return {
      payments: parsed.payments !== false,
      security: parsed.security !== false,
      network: parsed.network === true,
    };
  } catch {
    return { payments: true, security: true, network: false };
  }
};

let _notificationPrefs: NotificationPrefs = loadPrefs();
const _notificationPrefListeners: Array<(p: NotificationPrefs) => void> = [];

export const getNotificationPrefs = () => _notificationPrefs;

export const setNotificationPrefs = (patch: Partial<NotificationPrefs>) => {
  _notificationPrefs = { ..._notificationPrefs, ...patch };
  if (typeof window !== 'undefined') {
    localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(_notificationPrefs));
  }
  _notificationPrefListeners.forEach((fn) => fn(_notificationPrefs));
};

export const onNotificationPrefsChange = (fn: (p: NotificationPrefs) => void) => {
  _notificationPrefListeners.push(fn);
  return () => {
    const idx = _notificationPrefListeners.indexOf(fn);
    if (idx !== -1) _notificationPrefListeners.splice(idx, 1);
  };
};

const notificationCategory = (type?: string): keyof NotificationPrefs | null => {
  if (!type) return null;
  if (type === 'security') return 'security';
  if (type === 'network') return 'network';
  if (type === 'payment_received' || type === 'request' || type === 'payment_sent') return 'payments';
  return null;
};

export const filterNotificationsByPrefs = (notifications: any[], prefs = _notificationPrefs) =>
  notifications.filter((notif) => {
    const key = notificationCategory(notif?.type);
    if (!key) return true;
    return prefs[key];
  });

// ── Demo profile ──────────────────────────────────────────────────────────────
export interface DemoProfile {
  name: string;
  occupation: string;
  username: string;       // Immutable after first claim
  usernameClaimed: boolean;
  avatarBase64: string | null;
  verificationLevel: number;
}

export let demoProfile: DemoProfile = {
  name: '',
  occupation: '',
  username: '',
  usernameClaimed: false,
  avatarBase64: null,
  verificationLevel: 0,
};

const _profileListeners: Array<(p: DemoProfile) => void> = [];

export const onProfileChange = (fn: (p: DemoProfile) => void) => {
  _profileListeners.push(fn);
  return () => {
    const idx = _profileListeners.indexOf(fn);
    if (idx !== -1) _profileListeners.splice(idx, 1);
  };
};

export const updateDemoProfile = (patch: Partial<DemoProfile>) => {
  demoProfile = { ...demoProfile, ...patch };
  _profileListeners.forEach(fn => fn(demoProfile));
};

// ── Live profile refresh (Convex) ───────────────────────────────────────────
let _liveProfileRefreshKey = 0;
const _liveProfileRefreshListeners: Array<(key: number) => void> = [];

export const getLiveProfileRefreshKey = () => _liveProfileRefreshKey;

export const onLiveProfileRefresh = (fn: (key: number) => void) => {
  _liveProfileRefreshListeners.push(fn);
  return () => {
    const idx = _liveProfileRefreshListeners.indexOf(fn);
    if (idx !== -1) _liveProfileRefreshListeners.splice(idx, 1);
  };
};

export const bumpLiveProfileRefresh = () => {
  _liveProfileRefreshKey += 1;
  _liveProfileRefreshListeners.forEach(fn => fn(_liveProfileRefreshKey));
};

// ── Mock Activity ─────────────────────────────────────────────────────────────
export let demoBalance = 185.50;
let _balanceListeners: Array<(b: number) => void> = [];

export const onBalanceChange = (fn: (b: number) => void) => {
  _balanceListeners.push(fn);
  return () => {
    const idx = _balanceListeners.indexOf(fn);
    if (idx !== -1) _balanceListeners.splice(idx, 1);
  };
};

export let demoTransactions: Transaction[] = [
  { id: '1', type: 'receive', from_address: '', to_address: '', from_name: 'Kwame O.', to_name: 'You', amount_usdc: 50, amount_display: 50, currency: 'USD', fee: 0.25, status: 'confirmed', category: 'transfer', created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', type: 'send', from_address: '', to_address: '', from_name: 'You', to_name: 'Amara D.', amount_usdc: 25, amount_display: 25, currency: 'USD', fee: 0.25, status: 'confirmed', category: 'payment', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '3', type: 'receive', from_address: '', to_address: '', from_name: 'Chidi N.', to_name: 'You', amount_usdc: 100, amount_display: 100, currency: 'USD', fee: 0.25, status: 'confirmed', category: 'transfer', created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: '4', type: 'receive', from_address: '', to_address: '', from_name: 'PayMe', to_name: 'You', amount_usdc: 10, amount_display: 10, currency: 'USD', fee: 0, status: 'confirmed', category: 'bonus', created_at: new Date(Date.now() - 259200000).toISOString() },
  { id: '5', type: 'send', from_address: '', to_address: '', from_name: 'You', to_name: 'Fatima K.', amount_usdc: 75, amount_display: 75, currency: 'USD', fee: 0.25, status: 'confirmed', category: 'transfer', created_at: new Date(Date.now() - 345600000).toISOString() },
];

let _txListeners: Array<(txs: Transaction[]) => void> = [];

export const onTransactionsChange = (fn: (txs: Transaction[]) => void) => {
  _txListeners.push(fn);
  return () => {
    const idx = _txListeners.indexOf(fn);
    if (idx !== -1) _txListeners.splice(idx, 1);
  };
};

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export let demoNotifications: NotificationItem[] = [
  { id: '1', type: 'payment_received', title: 'Payment Received', body: 'Kwame Osei sent you $50.00 (Food)', read: false, created_at: new Date(Date.now() - 600000).toISOString() },
  { id: '2', type: 'security', title: 'New Login Detected', body: 'A new login was detected from Chrome on Windows. If this was not you, secure your account.', read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', type: 'system', title: 'Welcome to PayMe', body: 'Your beta testnet wallet is active. You can send and receive USDC on Solana devnet instantly.', read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
];

let _notifListeners: Array<(ns: NotificationItem[]) => void> = [];

export const onNotificationsChange = (fn: (ns: NotificationItem[]) => void) => {
  _notifListeners.push(fn);
  return () => {
    const idx = _notifListeners.indexOf(fn);
    if (idx !== -1) _notifListeners.splice(idx, 1);
  };
};

export const markNotificationRead = (id: string) => {
  demoNotifications = demoNotifications.map(n => n.id === id ? { ...n, read: true } : n);
  _notifListeners.forEach(fn => fn(demoNotifications));
};

export const markAllNotificationsRead = () => {
  demoNotifications = demoNotifications.map(n => ({ ...n, read: true }));
  _notifListeners.forEach(fn => fn(demoNotifications));
};

export const pushNotification = (notif: Omit<NotificationItem, 'id' | 'read' | 'created_at'>) => {
  const newNotif: NotificationItem = {
    ...notif,
    id: `notif_${Date.now()}`,
    read: false,
    created_at: new Date().toISOString()
  };
  demoNotifications = [newNotif, ...demoNotifications];
  _notifListeners.forEach(fn => fn(demoNotifications));
};

export const claimWelcomeBonus = () => {
  const deposit = 10000;
  
  // 1. Update Balance
  demoBalance += deposit;
  _balanceListeners.forEach(fn => fn(demoBalance));

  // 2. Add Transaction
  const tx: Transaction = {
    id: `bonus_${Date.now()}`,
    type: 'receive',
    from_address: 'PayMeReserve',
    to_address: '',
    from_name: 'PayMe Protocol',
    to_name: 'You',
    amount_usdc: deposit,
    amount_display: deposit,
    currency: 'USDC',
    fee: 0,
    status: 'confirmed',
    category: 'bonus',
    created_at: new Date().toISOString()
  };
  
  demoTransactions = [tx, ...demoTransactions];
  _txListeners.forEach(fn => fn(demoTransactions));

  // 3. Push Notification
  pushNotification({
    type: 'payment_received',
    title: 'Bonus Credited',
    body: `Your ${deposit.toLocaleString()} USDC welcome bonus has been credited to your devnet wallet.`,
  });
};
