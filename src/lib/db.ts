/**
 * PayMe data service — backed by Cloudflare Worker API.
 * Replaces the old Convex layer entirely.
 */
import { bumpLiveProfileRefresh } from './appState';
import * as apiClient from './api';

const API_BASE = (import.meta.env.VITE_API_URL || 'https://api.payme-protocol.cc').replace(/\/$/, '') + '/api';
const SOLANA_API = (import.meta.env.VITE_API_URL || 'https://api.payme-protocol.cc').replace(/\/$/, '').replace(/\/api$/, '') + '/api/solana';

function sessionHeaders(): Record<string, string> {
  const token = localStorage.getItem('payme_session_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...sessionHeaders(), ...(options.headers as Record<string, string> || {}) },
  });
  return res.json();
}

// ─── USER / PROFILE ──────────────────────────────────────────────────────────

export async function getProfile(args: {
  userId?: string;
  email?: string;
  walletAddress?: string;
}) {
  if (!args.userId) return null;
  try {
    const res = await apiFetch<any>('/auth/me');
    if (!res.success || !res.user) return null;
    const u = res.user;
    return {
      id: u.userId,
      _id: u.userId,
      userId: u.userId,
      $id: u.userId,
      recordId: u.userId,
      email: u.email,
      username: u.username,
      walletAddress: u.solanaPublicKey,
      solanaPublicKey: u.solanaPublicKey,
      usernameClaimed: u.usernameClaimed ?? (!!u.username && u.username.length >= 3),
      isGated: false,
      bonusClaimed: u.bonusClaimed ?? false,
      name: u.name || u.username,
      occupation: u.occupation || null,
      avatarBase64: u.avatarUrl || u.avatarBase64 || null,
      verificationLevel: u.verificationLevel ?? 0,
      isAdmin: false,
    };
  } catch {
    return null;
  }
}

export async function getOrCreateUser(args: {
  email?: string;
  username?: string;
  walletAddress?: string;
  externalUserId?: string;
}) {
  const userId = args.externalUserId?.trim();
  if (!userId) throw new Error('Cannot resolve user identity');
  return userId;
}

export async function checkUsernameAvailability(args: { username: string }) {
  try {
    const res = await apiFetch<any>(`/users/search?q=${encodeURIComponent(args.username)}`);
    const exactMatch = (res.users || []).some(
      (u: any) => u.username?.toLowerCase() === args.username.toLowerCase()
    );
    return { available: !exactMatch };
  } catch {
    return { available: true };
  }
}

export async function claimUsername(args: {
  username: string;
  externalUserId?: string;
  email?: string;
  walletAddress?: string;
}) {
  const res = await apiFetch<any>('/users/claim-username', {
    method: 'POST',
    body: JSON.stringify({ username: args.username }),
  });
  if (!res.success) throw new Error(res.error || 'Failed to claim username');
  bumpLiveProfileRefresh();
  return { userId: res.user?.userId, username: res.user?.username };
}

export async function updateProfile(args: {
  name?: string;
  occupation?: string;
  avatarBase64?: string;
  username?: string;
  externalUserId?: string;
  avatarUrl?: string;
}) {
  const res = await apiFetch<any>('/users/profile', {
    method: 'PATCH',
    body: JSON.stringify({
      name: args.name,
      occupation: args.occupation,
      avatarBase64: args.avatarBase64,
      username: args.username,
      avatarUrl: args.avatarUrl,
    }),
  });
  if (!res.success) throw new Error(res.error || 'Profile update failed.');
  bumpLiveProfileRefresh();
  return res.user;
}

export async function searchUsers(args: {
  query: string;
  externalUserId?: string;
}) {
  const normalized = args.query.trim().toLowerCase().replace(/^@+/, '');
  if (normalized.length < 2) return [];
  try {
    const res = await apiFetch<any>(`/users/search?q=${encodeURIComponent(normalized)}`);
    return (res.users || []).map((u: any) => ({
      userId: u.userId,
      username: u.username,
      name: u.name || u.username,
      avatarBase64: u.avatarBase64 || null,
      verificationLevel: u.verificationLevel || 0,
      walletAddress: u.solanaPublicKey,
      isSelf: u.userId === args.externalUserId,
      canSend: !!u.solanaPublicKey && u.userId !== args.externalUserId,
    }));
  } catch {
    return [];
  }
}

export async function listAllUsers() {
  try {
    const res = await apiFetch<any>('/admin/users');
    return res.users || [];
  } catch {
    return [];
  }
}

export async function validateInviteCode(args: { code: string; externalUserId?: string }) {
  if (!args.externalUserId) throw new Error('User ID required');
  
  const res = await apiFetch<any>('/auth/validate-invite', {
    method: 'POST',
    body: JSON.stringify({ code: args.code, userId: args.externalUserId }),
  });
  
  if (!res.success || !res.valid) {
    const error = res.error || 'Invalid invite code';
    throw new Error(error);
  }
  
  return { valid: true };
}

export async function getMyReferrals(_args: { userId: string }) {
  try {
    const res = await apiFetch<any>('/referrals/my');
    if (!res.success) return { payPoints: 0, referralCode: null, referrals: [] };
    return {
      payPoints: res.payPoints || 0,
      referralCode: res.referralCode,
      referrals: res.referrals || [],
    };
  } catch {
    return { payPoints: 0, referralCode: null, referrals: [] };
  }
}

export async function getLeaderboard() {
  try {
    const res = await apiFetch<any>('/referrals/leaderboard');
    if (!res.success) return { leaderboard: [], myRank: 999, myPoints: 0 };
    return {
      leaderboard: res.leaderboard || [],
      myRank: res.myRank || 999,
      myPoints: res.myPoints || 0,
    };
  } catch {
    return { leaderboard: [], myRank: 999, myPoints: 0 };
  }
}

export async function listNotifications(_args: { externalUserId?: string }) {
  try {
    const res = await apiFetch<any>('/notifications');
    if (!res.success) return [];
    return res.notifications || [];
  } catch {
    return [];
  }
}

export async function markRead(args: { notificationId: string }) {
  try {
    await apiFetch<any>(`/notifications/${args.notificationId}/read`, { method: 'PATCH' });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function getVapidPublicKey() {
  try {
    const res = await apiFetch<any>('/push/vapid-public-key');
    return res.publicKey || null;
  } catch {
    return null;
  }
}

export async function subscribePush(subscription: PushSubscription) {
  try {
    const keys = subscription.toJSON().keys!;
    const res = await apiFetch<any>('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      }),
    });
    return res.success || false;
  } catch {
    return false;
  }
}

export async function unsubscribePush(endpoint: string) {
  try {
    await apiFetch<any>('/push/subscribe', {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function requestPasswordReset(email: string) {
  try {
    const res = await apiFetch<any>('/auth/reset-password/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return {
      success: res.success || false,
      hasSecurityQuestion: res.hasSecurityQuestion || false,
      securityQuestion: res.securityQuestion || null,
    };
  } catch {
    return { success: false, hasSecurityQuestion: false, securityQuestion: null };
  }
}

export async function resetPasswordWithQuestion(email: string, answer: string, newPassword: string) {
  try {
    const res = await apiFetch<any>('/auth/reset-password/verify-question', {
      method: 'POST',
      body: JSON.stringify({ email, answer, newPassword }),
    });
    return res.success || false;
  } catch {
    return false;
  }
}

export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    const res = await apiFetch<any>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return res.success || false;
  } catch {
    return false;
  }
}

export async function updateDiscoverable(value: boolean) {
  try {
    await apiFetch<any>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify({ discoverable: value }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function updateNotificationPrefs(prefs: { payments: boolean; security: boolean; network: boolean }) {
  try {
    await apiFetch<any>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify({ notificationPrefs: prefs }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function setSecurityQuestion(question: string, answer: string) {
  try {
    await apiFetch<any>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify({ securityQuestion: question, securityAnswer: answer }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function getFxRates() {
  try {
    const res = await apiFetch<any>('/fx/rates');
    if (!res.success || !res.rates) return null;
    return { rates: res.rates, updatedAt: res.updatedAt };
  } catch {
    return null;
  }
}

export async function uploadFile(file: File, type: 'avatar' | 'receipt') {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const token = localStorage.getItem('payme_session_token');
    const res = await fetch(`${(import.meta.env.VITE_API_URL || 'https://api.payme-protocol.cc').replace(/\/$/, '')}/api/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    
    const data = await res.json();
    if (data.success) {
      return data.url;
    }
    return null;
  } catch {
    return null;
  }
}

export async function uploadReceipt(_args: any) {
  if (!_args.file) return null;
  return await uploadFile(_args.file, 'receipt');
}

export async function toggleUserPriority(_args: { userId: string; field: string; value: boolean }) {
  // Admin only — stub
}

export async function deleteAccount(_args: { externalUserId?: string }) {
  await apiFetch('/users/account', { method: 'DELETE' });
  return { deleted: true };
}

export async function claimBonus(_args: { externalUserId?: string; walletAddress?: string }) {
  return { success: true };
}

export async function rollbackBonusClaim(_args: { externalUserId?: string }) {
  throw new Error('Rollback is not available.');
}

// ─── TRANSACTIONS ────────────────────────────────────────────────────────────

export async function recordTransaction(args: {
  senderId: string; senderAddress: string; receiverId?: string; receiverAddress: string;
  amount: number; currency: string; type: string; signature: string; fee: number;
  memo?: string; category?: string; narration?: string; externalUserId?: string;
  clientRef?: string; displayAmount?: number; displayCurrency?: string; displaySymbol?: string;
}) {
  try {
    const res = await apiFetch<any>('/transactions/record', {
      method: 'POST',
      body: JSON.stringify(args),
    });
    return res.transactionId || `tx_${Date.now()}`;
  } catch {
    return `tx_${Date.now()}`;
  }
}

export async function getHistory(args: { externalUserId?: string }) {
  if (!args.externalUserId) return [];
  try {
    const res = await apiClient.getHistory();
    return (res.transactions || []).map((t: any) => ({
      id: t.id,
      _id: t.id,
      created_at: t.createdAt,
      type: t.type,
      senderAddress: t.senderUsername,
      receiverAddress: t.receiverUsername,
      amount: t.amountUsdc,
      currency: 'USDC',
      status: t.status,
      signature: t.signature,
      senderUsername: t.senderUsername,
      receiverUsername: t.receiverUsername,
      senderId: t.senderId,
      receiverId: t.receiverId,
      from_avatar_base64: t.fromAvatarBase64 || null,
      to_avatar_base64: t.toAvatarBase64 || null,
      category: t.category || null,
      displayAmount: t.amountUsdc,
      displayCurrency: 'USDC',
    }));
  } catch {
    return [];
  }
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
// (functions already defined above at lines 195-210)

export async function createNotification(_args: {
  userId: string; type: string; title: string; content: string; data?: any;
}) {
  // Client-side notifications are handled by the service worker
  // This is a stub for compatibility
  return null;
}

export async function broadcastNotification(args: {
  title: string; content: string; type?: string; data?: any;
}) {
  try {
    const res = await apiFetch<any>('/notifications/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        title: args.title,
        content: args.content,
        type: args.type || 'system',
        data: args.data,
      }),
    });
    return res.success ? { sent: res.sent, total: res.total } : { sent: 0, total: 0 };
  } catch {
    return { sent: 0, total: 0 };
  }
}

// ─── CONTACTS ────────────────────────────────────────────────────────────────

export async function listContacts(_args: { externalUserId?: string }) {
  try {
    const res = await apiFetch<any>('/contacts');
    return (res.contacts || []).map((c: any) => ({
      id: c.id,
      contactUserId: c.contactUserId,
      username: c.username,
      walletAddress: c.solanaPublicKey,
      name: c.name || c.username,
      avatarBase64: c.avatarBase64 || null,
      verificationLevel: c.verificationLevel || 0,
      canSend: !!c.solanaPublicKey,
    }));
  } catch {
    return [];
  }
}

export async function addContactByHandle(args: {
  handle: string; externalUserId?: string;
}) {
  if (!args.externalUserId?.trim()) throw new Error('Cannot resolve user identity');
  const handle = args.handle.trim().toLowerCase();
  if (!handle) throw new Error('Enter a valid username.');
  
  const res = await apiFetch<any>('/contacts', {
    method: 'POST',
    body: JSON.stringify({ contactUsername: handle }),
  });
  if (!res.success) throw new Error(res.error || 'Failed to add contact.');
  return { ok: true, contactType: 'user' };
}

export async function removeContact(args: { contactId: string; externalUserId?: string }) {
  if (!args.contactId) throw new Error('Missing contact ID');
  await apiFetch(`/contacts/${encodeURIComponent(args.contactId)}`, { method: 'DELETE' });
  return { ok: true };
}

// ─── MONEY REQUESTS ──────────────────────────────────────────────────────────

export async function requestMoney(args: {
  target: string; amount: number; note?: string; externalUserId?: string;
}) {
  if (!args.externalUserId?.trim()) throw new Error('Cannot resolve user identity');
  if (args.amount <= 0) throw new Error('Enter a valid amount.');
  const res = await apiFetch<any>('/money-requests', {
    method: 'POST',
    body: JSON.stringify({ target: args.target, amountUsdc: args.amount, note: args.note }),
  });
  if (!res.success) throw new Error(res.error || 'Request failed.');
  return res;
}

export async function listMoneyRequests() {
  const res = await apiFetch<any>('/money-requests');
  if (!res.success) throw new Error(res.error || 'Failed to load requests.');
  return res.requests as {
    id: string; amountUsdc: number; note: string | null; status: string;
    requesterUsername: string; requesterId: string; createdAt: string;
  }[];
}

export async function respondToMoneyRequest(args: { requestId: string; action: 'accept' | 'decline' }) {
  const res = await apiFetch<any>(`/money-requests/${args.requestId}/respond`, {
    method: 'PATCH',
    body: JSON.stringify({ action: args.action }),
  });
  if (!res.success) throw new Error(res.error || 'Failed to respond to request.');
  return res;
}

// ─── GIFTS ───────────────────────────────────────────────────────────────────

export async function startGiftAirdrop(args: {
  mode: 'random' | 'specific';
  recipients: string[];
  amountPerRecipient: number;
  isAnonymous: boolean;
  eligibilityTier?: number;
}) {
  const res = await apiFetch<any>('/gifts/airdrop', {
    method: 'POST',
    body: JSON.stringify({
      mode: args.mode,
      recipients: args.recipients,
      amountPerRecipient: args.amountPerRecipient,
      isAnonymous: args.isAnonymous,
      eligibilityTier: args.eligibilityTier,
    }),
  });
  if (!res.success) throw new Error(res.error || 'Gift airdrop failed');
  return { ok: true, results: res.results, failed: res.failed };
}

export async function acknowledgeGiftThanks(_args: any) {
  return { ok: true };
}

// ─── SUPPORT ────────────────────────────────────────────────────────────────

export async function sendSupportMessage(args: {
  userId?: string; externalUserId?: string; role: string; content: string;
}) {
  await apiFetch('/support/messages', {
    method: 'POST',
    body: JSON.stringify({ role: args.role, content: args.content }),
  });
}

export async function getMessagesForUser(_args: { userId?: string; externalUserId?: string }) {
  try {
    const res = await apiFetch<any>('/support/messages');
    return res.messages || [];
  } catch {
    return [];
  }
}

export async function getAdminInbox() {
  try {
    const res = await apiFetch<any>('/admin/support');
    return res.messages || [];
  } catch {
    return [];
  }
}

export async function markSupportAsRead(_args: { userId: string }) {}

// ─── SYSTEM ──────────────────────────────────────────────────────────────────

export async function getSystemConfig(_args: { key: string }) {
  return undefined;
}

export async function updateSystemConfig(_args: { key: string; value: any }) {}

// ─── MERCHANTS ───────────────────────────────────────────────────────────────

export async function joinWaitlist(args: {
  name: string; email: string; businessType: string; externalUserId?: string;
}) {
  if (!args.externalUserId?.trim()) throw new Error('Cannot resolve user identity');
  return { alreadyJoined: false };
}

export async function getMyWaitlistEntry(_args: { externalUserId?: string; email?: string }) {
  return null;
}

// ─── FILES ───────────────────────────────────────────────────────────────────
// uploadReceipt already defined above

export async function linkReceiptToTransaction(_args: any) {}

export async function getReceiptUrl(storageId: string) {
  // If storageId is a full URL, return it directly
  if (storageId.startsWith('http')) {
    return storageId;
  }
  return '';
}

// ─── SOLANA ACTIONS ──────────────────────────────────────────────────────────

async function callSolana(action: string, payload: any) {
  const token = localStorage.getItem('payme_session_token');
  const res = await fetch(SOLANA_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function claimWelcomeBonus(_args: { userWalletAddress: string; externalUserId?: string }) {
  const res = await apiFetch<any>('/solana/claim-bonus', { method: 'POST' });
  if (!res.success) throw new Error(res.error || 'Failed to claim bonus');
  return { signature: res.signature || 'pending' };
}

export async function buildSponsoredTransaction(args: {
  senderAddress: string;
  receiverAddress: string;
  amount: number;
  recentBlockhash: string;
  lastValidBlockHeight: number;
}): Promise<{ serializedTx: string; feeCharged: number }> {
  return await callSolana('buildSponsoredTransaction', {
    senderAddress: args.senderAddress,
    receiverAddress: args.receiverAddress,
    amount: args.amount,
    recentBlockhash: args.recentBlockhash,
    lastValidBlockHeight: args.lastValidBlockHeight,
  });
}

export async function broadcastSponsoredTransaction(args: {
  signature: string; senderAddress: string; receiverId?: string; receiverAddress: string;
  amount: number; currency: string; fee: number; category?: string; narration?: string;
  memo?: string; externalUserId?: string; clientRef?: string;
  displayAmount?: number; displayCurrency?: string; displaySymbol?: string;
}): Promise<{ signature: string; transactionId?: string | null }> {
  if (!args.signature) throw new Error('Missing transaction signature.');
  if (args.amount <= 0) throw new Error('Amount must be greater than zero.');

  const result = await callSolana('broadcastSponsoredTransaction', {
    signature: args.signature,
  });
  const signature = result.signature;

  let transactionId: string | null = null;
  try {
    transactionId = await recordTransaction({
      senderId: args.externalUserId || args.senderAddress,
      senderAddress: args.senderAddress,
      receiverId: args.receiverId,
      receiverAddress: args.receiverAddress,
      amount: args.amount,
      currency: args.currency,
      type: 'send',
      signature,
      clientRef: args.clientRef,
      fee: args.fee,
      memo: args.memo,
      category: args.category,
      narration: args.narration,
      externalUserId: args.externalUserId,
      displayAmount: args.displayAmount,
      displayCurrency: args.displayCurrency,
      displaySymbol: args.displaySymbol,
    });
  } catch (err) {
    console.warn('Failed to record transaction:', err);
  }

  return { signature, transactionId };
}

export async function treasuryHealthCheck() {
  return callSolana('health', {});
}
