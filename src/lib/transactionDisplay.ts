import type { Transaction } from '../types';

function clean(value?: string | null): string {
  return (value || '').trim();
}

export function firstNameFromDisplayName(name?: string | null): string | null {
  const full = clean(name);
  if (!full) return null;
  return full.split(/\s+/)[0] || null;
}

export function usernameLabel(username?: string | null): string | null {
  const normalized = clean(username).replace(/^@+/, '');
  return normalized || null;
}

export function resolvePersonLabel(
  name?: string | null,
  username?: string | null,
  fallback = 'Unknown',
): string {
  return firstNameFromDisplayName(name) || usernameLabel(username) || fallback;
}

const EXTERNAL_WALLET_LABEL = 'External Wallet';
const BONUS_LABEL = 'PayMe Bonus';
const GIFT_LABEL = 'Gift';

function isLikelyAddress(value?: string | null) {
  const v = clean(value);
  if (v.length < 20) return false;
  return /^[1-9A-HJ-NP-Za-km-z]+$/.test(v);
}

function isExternalWalletSide(args: {
  username?: string | null;
  name?: string | null;
  userId?: string | null;
  address?: string | null;
}) {
  const normalizedName = clean(args.name).toLowerCase();
  if (normalizedName === 'external address' || normalizedName === 'external wallet') return true;
  if (normalizedName === 'you') return false;
  if (usernameLabel(args.username)) return false;
  if (args.userId && !isLikelyAddress(args.userId)) return false;
  if (!args.address && !isLikelyAddress(args.userId)) return false;
  return true;
}

export function isExternalWalletTransfer(tx: Transaction): boolean {
  if (tx.category === 'bonus') return false;
  if (tx.type !== 'send') return false;
  return isExternalWalletSide({
    username: tx.to_username,
    name: tx.to_name,
    userId: tx.to_user_id,
    address: tx.to_address,
  });
}

export function transactionFromLabel(tx: Transaction): string {
  if (tx.category === 'bonus') return BONUS_LABEL;
  if (tx.category === 'gift') return GIFT_LABEL;
  if (isExternalWalletSide({
    username: tx.from_username,
    name: tx.from_name,
    userId: tx.from_user_id,
    address: tx.from_address,
  })) {
    return EXTERNAL_WALLET_LABEL;
  }
  return resolvePersonLabel(tx.from_name, tx.from_username, 'Unknown Sender');
}

export function transactionToLabel(tx: Transaction): string {
  if (tx.category === 'bonus') return BONUS_LABEL;
  if (tx.category === 'gift') return GIFT_LABEL;
  if (tx.type === 'receive') return 'You';
  if (isExternalWalletTransfer(tx)) return EXTERNAL_WALLET_LABEL;
  return resolvePersonLabel(tx.to_name, tx.to_username, 'Unknown Recipient');
}
