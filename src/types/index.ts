// PayMe Protocol Types

export interface User {
  id: string;
  auth_user_id: string;
  privy_id?: string; // legacy key retained for compatibility
  email?: string;
  display_name: string;
  username: string;
  avatar_color: string;
  wallet_address: string;
  created_at: string;
  bonus_claimed: boolean;
  verified_level: 1 | 2 | 3;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive';
  from_address: string;
  to_address: string;
  from_user_id?: string | null;
  to_user_id?: string | null;
  from_name?: string;
  to_name?: string;
  from_username?: string | null;
  to_username?: string | null;
  amount_usdc: number;
  amount_display: number;
  currency: string;
  fee: number;
  status: 'pending' | 'confirmed' | 'failed';
  tx_hash?: string;
  note?: string;
  narration?: string;
  from_avatar_base64?: string | null;
  to_avatar_base64?: string | null;
  category: 'transfer' | 'payment' | 'bonus' | 'refund' | 'gift';
  gift_anonymous?: boolean;
  gift_acknowledged?: boolean;
  created_at: string;
  receipt_id?: string;
}

export interface Notification {
  id: string;
  type: 'payment_received' | 'security' | 'system' | 'request';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
  data?: Record<string, unknown>;
}

export interface Contact {
  id: string;
  name: string;
  username: string;
  wallet_address: string;
  avatar_color: string;
}

export type Currency = {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  rate: number; // vs USDC
};

export type Tab = 'wallet' | 'history' | 'merchant' | 'network' | 'settings';

export type SendStep = 'method' | 'recipient' | 'amount' | 'review' | 'sending' | 'success';
