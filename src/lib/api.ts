const API_BASE = (import.meta.env.VITE_API_URL || 'https://api.payme-protocol.cc').replace(/\/$/, '') + '/api';

type User = {
  userId: string;
  username: string;
  email: string;
  solanaPublicKey: string;
  usernameClaimed: boolean;
  bonusClaimed: boolean;
  inviteValidated: boolean;
  discoverable?: boolean;
  notificationPrefs?: { payments: boolean; security: boolean; network: boolean } | null;
  payPoints?: number;
  referralCode?: string | null;
  securityQuestion?: string | null;
};

type AuthResponse = {
  success: boolean;
  sessionToken?: string;
  user?: User;
  error?: string;
};

type Transaction = {
  id: string;
  type: 'send' | 'receive';
  senderId: string;
  receiverId: string;
  senderUsername?: string;
  receiverUsername?: string;
  amountUsdc: number;
  status: string;
  signature?: string;
  createdAt: string;
};

async function fetchWithAuth<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const sessionToken = localStorage.getItem('payme_session_token');
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken && { Authorization: `Bearer ${sessionToken}` }),
      ...options.headers,
    },
  });
  
  return response.json();
}

export async function signUp(
  email: string,
  username: string,
  password: string,
  solanaPublicKey: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password, solanaPublicKey }),
  });
  
  const data = await response.json();
  
  if (data.success && data.sessionToken) {
    localStorage.setItem('payme_session_token', data.sessionToken);
    localStorage.setItem('payme_user', JSON.stringify(data.user));
  }
  
  return data;
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (data.success && data.sessionToken) {
    localStorage.setItem('payme_session_token', data.sessionToken);
    localStorage.setItem('payme_user', JSON.stringify(data.user));
  }
  
  return data;
}

export async function signOut(): Promise<void> {
  try {
    await fetchWithAuth('/auth/signout', { method: 'POST' });
  } catch {
    // Ignore errors on signout
  } finally {
    localStorage.removeItem('payme_session_token');
    localStorage.removeItem('payme_user');
    localStorage.removeItem('payme_wallet');
  }
}

export async function getMe(): Promise<AuthResponse> {
  return fetchWithAuth<AuthResponse>('/auth/me');
}

export async function getUser(username: string): Promise<{ success: boolean; user?: { username: string; solanaPublicKey: string }; error?: string }> {
  return fetchWithAuth(`/users/${encodeURIComponent(username)}`);
}

export async function initiateTransaction(
  recipientUsername: string,
  amountUsdc: number
): Promise<{
  success: boolean;
  unsignedTransaction?: string;
  recipientPublicKey?: string;
  amountUsdc?: number;
  error?: string;
}> {
  return fetchWithAuth('/transactions/initiate', {
    method: 'POST',
    body: JSON.stringify({ recipientUsername, amountUsdc }),
  });
}

export async function submitTransaction(
  signedTransaction: string,
  recipientUsername: string,
  amountUsdc: number
): Promise<{
  success: boolean;
  signature?: string;
  transactionId?: string;
  error?: string;
}> {
  return fetchWithAuth('/transactions/submit', {
    method: 'POST',
    body: JSON.stringify({ signedTransaction, recipientUsername, amountUsdc }),
  });
}

export async function getHistory(): Promise<{ success: boolean; transactions?: Transaction[]; error?: string }> {
  return fetchWithAuth('/transactions/history');
}

export function getSessionToken(): string | null {
  return localStorage.getItem('payme_session_token');
}

export function getStoredUser(): User | null {
  const userStr = localStorage.getItem('payme_user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}
