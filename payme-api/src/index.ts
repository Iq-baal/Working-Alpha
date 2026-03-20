import { Buffer } from 'buffer';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import bcrypt from 'bcryptjs';
import {
  PublicKey,
  Transaction,
  Keypair,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { createRateLimitMiddleware } from './middleware/ratelimit';
import { authMiddleware } from './middleware/auth';

const globalScope = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
if (!globalScope.Buffer) {
  globalScope.Buffer = Buffer;
}

export type Env = {
  DB: D1Database;
  SESSIONS: KVNamespace;
  RATELIMIT: KVNamespace;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  FRONTEND_URL: string;
  SPONSOR_PRIVATE_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_PUBLIC_KEY: string;
  S3_ENDPOINT: string;
  S3_ACCESS_KEY: string;
  S3_SECRET_KEY: string;
  S3_BUCKET: string;
  ALCHEMY_RPC_URL: string;
};

export type User = {
  id: string;
  email: string;
  username: string;
  solanaPublicKey: string;
};

export type UserWithFlags = User & {
  usernameClaimed: boolean;
  bonusClaimed: boolean;
  inviteValidated: boolean;
  discoverable: boolean;
  notificationPrefs?: { payments: boolean; security: boolean; network: boolean } | null;
  payPoints: number;
  referralCode?: string | null;
  securityQuestion?: string | null;
};

type SessionData = User & {
  sessionToken: string;
};

const USDC_MINT = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
const USDC_DECIMALS = 6;
const TREASURY_WALLET = '5U4Jmc2N4ah7pv8xTsSRVyX5VxNRt1B4ugM3YS4wnbhS';
const WELCOME_BONUS_USDC = 10_000;
const PLATFORM_FEE_RATE = 0.00005; // 0.005%

// ─── RAW RPC HELPERS ─────────────────────────────────────────────────────────
// Bypass @solana/web3.js struct validation entirely — use raw fetch for all
// network calls. The Connection class validates RPC responses against strict
// structs that fail on some RPCs (Ankr devnet returns slightly different shapes).

async function solanaRpc(url: string, method: string, params: any[] = []): Promise<any> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status}: ${method}`);
  const data = await res.json() as any;
  if (data.error) throw new Error(`RPC error [${method}]: ${data.error.message || JSON.stringify(data.error)}`);
  return data.result;
}

async function rpcGetLatestBlockhash(
  url: string,
  commitment: 'processed' | 'confirmed' | 'finalized' = 'finalized'
): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
  const r = await solanaRpc(url, 'getLatestBlockhash', [{ commitment }]);
  return { blockhash: r.value.blockhash, lastValidBlockHeight: r.value.lastValidBlockHeight };
}

async function rpcAccountExists(url: string, address: string): Promise<boolean> {
  const r = await solanaRpc(url, 'getAccountInfo', [address, { encoding: 'base64' }]);
  return r.value !== null;
}

async function rpcGetTokenBalance(url: string, ata: string): Promise<{ amount: string; decimals: number; uiAmount: number }> {
  const r = await solanaRpc(url, 'getTokenAccountBalance', [ata]);
  return r.value;
}

async function rpcGetBalance(url: string, address: string): Promise<number> {
  const r = await solanaRpc(url, 'getBalance', [address, { commitment: 'confirmed' }]);
  return r.value ?? 0;
}

async function rpcSendAndConfirm(url: string, serialized: Uint8Array): Promise<string> {
  const base64Tx = btoa(String.fromCharCode(...Array.from(serialized)));
  const signature: string = await solanaRpc(url, 'sendTransaction', [base64Tx, { encoding: 'base64', skipPreflight: false }]);
  // Poll for confirmation (max 60 s)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statuses = await solanaRpc(url, 'getSignatureStatuses', [[signature], { searchTransactionHistory: true }]);
    const status = statuses?.value?.[0];
    if (status?.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
    if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') return signature;
  }
  throw new Error('Transaction confirmation timeout');
}

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// CORS middleware
app.use('/*', cors({
  origin: (origin, c) => {
    const frontendUrl = c.env.FRONTEND_URL?.replace(/\/$/, '');
    const fallbackOrigin = frontendUrl || 'https://payme-protocol.cc';
    if (!origin) return fallbackOrigin;
    const allowed = [
      'https://payme-protocol.cc',
      'https://www.payme-protocol.cc',
      'https://payme-protocol-el5.pages.dev',
      'http://localhost:5173',
      'http://localhost:5174',
    ];
    if (frontendUrl && !allowed.includes(frontendUrl)) {
      allowed.push(frontendUrl);
    }
    if (allowed.includes(origin)) return origin;
    if (/^https:\/\/([a-z0-9-]+\.)?payme-protocol-el5\.pages\.dev$/.test(origin)) return origin;
    return fallbackOrigin;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// ─── AUTH ─────────────────────────────────────────────────────────────────────

// POST /api/auth/signup
app.post('/api/auth/signup',
  createRateLimitMiddleware('signup'),
  async (c) => {
    try {
      const body = await c.req.json();
      const { email, username, password, solanaPublicKey } = body;

      if (!email || !username || !password || !solanaPublicKey) {
        return c.json({ success: false, error: 'Missing required fields' }, 400);
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return c.json({ success: false, error: 'Invalid email format' }, 400);
      }

      const usernameRegex = /^[a-z0-9_]{3,20}$/;
      if (!usernameRegex.test(username)) {
        return c.json({ success: false, error: 'Username must be 3-20 characters (lowercase letters, numbers, underscores only)' }, 400);
      }

      if (password.length < 8) {
        return c.json({ success: false, error: 'Password must be at least 8 characters' }, 400);
      }

      try {
        new PublicKey(solanaPublicKey);
      } catch {
        return c.json({ success: false, error: 'Invalid Solana public key' }, 400);
      }

      const existingEmail = await c.env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(email.toLowerCase()).first();

      if (existingEmail) {
        return c.json({ success: false, error: 'Email already registered' }, 409);
      }

      // For signup we use a temp username; user will claim real one later
      // But we still check the temp username isn't taken
      const existingUsername = await c.env.DB.prepare(
        'SELECT id FROM users WHERE username = ?'
      ).bind(username.toLowerCase()).first();

      if (existingUsername) {
        return c.json({ success: false, error: 'Username already taken' }, 409);
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const userId = crypto.randomUUID().replace(/-/g, '');
      const now = Date.now();

      // username_claimed = 0: user still needs to claim a real username
      await c.env.DB.prepare(`
        INSERT INTO users (id, email, username, password_hash, solana_public_key, is_active, bonus_claimed, username_claimed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, 0, 0, ?, ?)
      `).bind(userId, email.toLowerCase(), username.toLowerCase(), passwordHash, solanaPublicKey, now, now).run();

      const sessionToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const sessionData: SessionData = {
        sessionToken,
        id: userId,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        solanaPublicKey,
      };

      await c.env.SESSIONS.put(`session:${sessionToken}`, JSON.stringify(sessionData), {
        expirationTtl: 2592000,
      });

      // Send welcome notification
      const welcomeId = crypto.randomUUID().replace(/-/g, '');
      await c.env.DB.prepare(`
        INSERT INTO notifications (id, user_id, type, title, content, data, created_at)
        VALUES (?, ?, 'system', ?, ?, ?, ?)
      `).bind(
        welcomeId, userId,
        'Welcome to PayMe!',
        'Your account is ready. Claim your username, then claim your $10,000 USDC welcome bonus to get started.',
        null, now
      ).run();

      return c.json({
        success: true,
        sessionToken,
        needsClaim: true,
        user: {
          userId,
          username: username.toLowerCase(),
          email: email.toLowerCase(),
          solanaPublicKey,
          usernameClaimed: false,
          bonusClaimed: false,
        },
      });
    } catch (error) {
      console.error('Signup error:', error);
      return c.json({ success: false, error: 'Internal server error' }, 500);
    }
  }
);

// POST /api/auth/signin
app.post('/api/auth/signin',
  createRateLimitMiddleware('signin'),
  async (c) => {
    try {
      const body = await c.req.json();
      const { email, password } = body;

      if (!email || !password) {
        return c.json({ success: false, error: 'Missing email or password' }, 400);
      }

      const user = await c.env.DB.prepare(
        'SELECT id, email, username, password_hash, solana_public_key, bonus_claimed, username_claimed, invite_validated FROM users WHERE email = ? AND is_active = 1'
      ).bind(email.toLowerCase()).first<{
        id: string;
        email: string;
        username: string;
        password_hash: string;
        solana_public_key: string;
        bonus_claimed: number;
        username_claimed: number;
        invite_validated: number;
      }>();

      if (!user) {
        return c.json({ success: false, error: 'Invalid email or password' }, 401);
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return c.json({ success: false, error: 'Invalid email or password' }, 401);
      }

      const sessionToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      const sessionData: SessionData = {
        sessionToken,
        id: user.id,
        email: user.email,
        username: user.username,
        solanaPublicKey: user.solana_public_key,
      };

      await c.env.SESSIONS.put(`session:${sessionToken}`, JSON.stringify(sessionData), {
        expirationTtl: 2592000,
      });

      const usernameClaimed = !!user.username_claimed;
      const inviteValidated = !!user.invite_validated;
      return c.json({
        success: true,
        sessionToken,
        needsClaim: !usernameClaimed,
        user: {
          userId: user.id,
          username: user.username,
          email: user.email,
          solanaPublicKey: user.solana_public_key,
          usernameClaimed,
          bonusClaimed: !!user.bonus_claimed,
          inviteValidated,
        },
      });
    } catch (error) {
      console.error('Signin error:', error);
      return c.json({ success: false, error: 'Internal server error' }, 500);
    }
  }
);

// POST /api/auth/signout
app.post('/api/auth/signout', authMiddleware, async (c) => {
  const authHeader = c.req.header('Authorization')!;
  const token = authHeader.substring(7);
  await c.env.SESSIONS.delete(`session:${token}`);
  return c.json({ success: true });
});

// GET /api/auth/me — returns full user with DB flags
app.get('/api/auth/me', authMiddleware, async (c) => {
  const sessionUser = c.get('user') as User;

  const dbUser = await c.env.DB.prepare(`
    SELECT id, email, username, solana_public_key, bonus_claimed, username_claimed,
           invite_validated, discoverable, notification_prefs, pay_points, referral_code,
           security_question, name, occupation, avatar_base64, verification_level
    FROM users WHERE id = ? AND is_active = 1
  `).bind(sessionUser.id).first<{
    id: string;
    email: string;
    username: string;
    solana_public_key: string;
    bonus_claimed: number;
    username_claimed: number;
    invite_validated: number;
    discoverable: number;
    notification_prefs: string | null;
    pay_points: number;
    referral_code: string | null;
    security_question: string | null;
    name: string | null;
    occupation: string | null;
    avatar_base64: string | null;
    verification_level: number;
  }>();

  if (!dbUser) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  let notificationPrefs = null;
  if (dbUser.notification_prefs) {
    try {
      notificationPrefs = JSON.parse(dbUser.notification_prefs);
    } catch (e) {
      // ignore parse errors
    }
  }

  return c.json({
    success: true,
    user: {
      userId: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      solanaPublicKey: dbUser.solana_public_key,
      usernameClaimed: !!dbUser.username_claimed,
      bonusClaimed: !!dbUser.bonus_claimed,
      inviteValidated: !!dbUser.invite_validated,
      discoverable: !!dbUser.discoverable,
      notificationPrefs,
      payPoints: dbUser.pay_points,
      referralCode: dbUser.referral_code,
      securityQuestion: dbUser.security_question,
      name: dbUser.name || null,
      occupation: dbUser.occupation || null,
      avatarBase64: dbUser.avatar_base64 || null,
      verificationLevel: dbUser.verification_level || 0,
    },
  });
});

// ─── USERS ────────────────────────────────────────────────────────────────────

// GET /api/users/search?q=  — MUST be before /:username
app.get('/api/users/search', authMiddleware, async (c) => {
  const q = (c.req.query('q') || '').toLowerCase().trim();
  if (q.length < 2) {
    return c.json({ success: true, users: [] });
  }
  const results = await c.env.DB.prepare(`
    SELECT id, username, solana_public_key, name, avatar_base64, verification_level FROM users
     WHERE username LIKE ? AND is_active = 1 AND discoverable = 1
     LIMIT 10
  `).bind(`${q}%`).all<{ id: string; username: string; solana_public_key: string; name: string | null; avatar_base64: string | null; verification_level: number }>();

  return c.json({
    success: true,
    users: results.results.map(u => ({
      userId: u.id,
      username: u.username,
      solanaPublicKey: u.solana_public_key,
      name: u.name || null,
      avatarBase64: u.avatar_base64 || null,
      verificationLevel: u.verification_level || 0,
    })),
  });
});

// POST /api/users/claim-username — MUST be before /:username
app.post('/api/users/claim-username', authMiddleware, async (c) => {
  try {
    const sessionUser = c.get('user') as User;
    const body = await c.req.json();
    const { username } = body;

    if (!username) {
      return c.json({ success: false, error: 'Username is required' }, 400);
    }

    const normalized = username.toString().toLowerCase().trim();
    const usernameRegex = /^[a-z0-9_]{3,20}$/;
    if (!usernameRegex.test(normalized)) {
      return c.json({ success: false, error: 'Username must be 3-20 characters (lowercase letters, numbers, underscores only)' }, 400);
    }

    // Check if already claimed
    const currentUser = await c.env.DB.prepare(
      'SELECT username_claimed FROM users WHERE id = ?'
    ).bind(sessionUser.id).first<{ username_claimed: number }>();

    if (currentUser?.username_claimed) {
      return c.json({ success: false, error: 'Username already claimed' }, 409);
    }

    // Check uniqueness
    const taken = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? AND id != ?'
    ).bind(normalized, sessionUser.id).first();

    if (taken) {
      return c.json({ success: false, error: 'Username already taken' }, 409);
    }

    const now = Date.now();
    const referralCode = normalized.toUpperCase();
    await c.env.DB.prepare(
      'UPDATE users SET username = ?, username_claimed = 1, referral_code = ?, updated_at = ? WHERE id = ?'
    ).bind(normalized, referralCode, now, sessionUser.id).run();

    return c.json({
      success: true,
      user: {
        userId: sessionUser.id,
        username: normalized,
        email: sessionUser.email,
        solanaPublicKey: sessionUser.solanaPublicKey,
        usernameClaimed: true,
      },
    });
  } catch (error) {
    console.error('Claim username error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// PATCH /api/users/profile — MUST be before /:username
app.patch('/api/users/profile', authMiddleware, async (c) => {
  try {
    const sessionUser = c.get('user') as User;
    const body = await c.req.json();
    const {
      name,
      occupation,
      avatarBase64,
      avatarUrl,
      discoverable,
      notificationPrefs,
      securityQuestion,
      securityAnswer,
    } = body;

    const now = Date.now();

    // Build dynamic UPDATE based on provided fields
    const updates: string[] = ['updated_at = ?'];
    const updateParams: any[] = [now];

    if (name !== undefined) {
      updates.push('name = ?');
      updateParams.push(name || null);
    }
    if (occupation !== undefined) {
      updates.push('occupation = ?');
      updateParams.push(occupation || null);
    }
    if (avatarBase64 !== undefined) {
      updates.push('avatar_base64 = ?');
      updateParams.push(avatarBase64);
    }
    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      updateParams.push(avatarUrl);
    }
    if (discoverable !== undefined) {
      updates.push('discoverable = ?');
      updateParams.push(discoverable ? 1 : 0);
    }
    if (notificationPrefs !== undefined) {
      updates.push('notification_prefs = ?');
      updateParams.push(JSON.stringify(notificationPrefs));
    }
    if (securityQuestion !== undefined && securityAnswer !== undefined) {
      const answerHash = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10);
      updates.push('security_question = ?');
      updates.push('security_answer_hash = ?');
      updateParams.push(securityQuestion);
      updateParams.push(answerHash);
    }

    updateParams.push(sessionUser.id);
    const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

    await c.env.DB.prepare(sql).bind(...updateParams).run();

    // Auto-compute verification_level: 1 if name, occupation, and avatar_base64 are all set
    const updated = await c.env.DB.prepare(
      'SELECT name, occupation, avatar_base64 FROM users WHERE id = ?'
    ).bind(sessionUser.id).first<{ name: string | null; occupation: string | null; avatar_base64: string | null }>();

    if (updated) {
      const verified = !!(updated.name && updated.occupation && updated.avatar_base64);
      await c.env.DB.prepare(
        'UPDATE users SET verification_level = ? WHERE id = ?'
      ).bind(verified ? 1 : 0, sessionUser.id).run();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// DELETE /api/users/account — MUST be before /:username
app.delete('/api/users/account', authMiddleware, async (c) => {
  try {
    const sessionUser = c.get('user') as User;
    const now = Date.now();
    await c.env.DB.prepare(
      'UPDATE users SET is_active = 0, updated_at = ? WHERE id = ?'
    ).bind(now, sessionUser.id).run();

    const authHeader = c.req.header('Authorization')!;
    const token = authHeader.substring(7);
    await c.env.SESSIONS.delete(`session:${token}`);

    return c.json({ success: true });
  } catch (error) {
    console.error('Delete account error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /api/users/:username — Public profile lookup (AFTER static routes)
app.get('/api/users/:username', authMiddleware, async (c) => {
  const username = c.req.param('username') ?? '';

  const user = await c.env.DB.prepare(
    'SELECT id, username, solana_public_key FROM users WHERE username = ? AND is_active = 1'
  ).bind(username.toLowerCase()).first<{ id: string; username: string; solana_public_key: string }>();

  if (!user) {
    return c.json({ success: false, error: 'User not found' }, 404);
  }

  return c.json({
    success: true,
    user: {
      userId: user.id,
      username: user.username,
      solanaPublicKey: user.solana_public_key,
    },
  });
});

// ─── TRANSACTIONS ────────────────────────────────────────────────────────────

// POST /api/transactions/record
app.post('/api/transactions/record', authMiddleware, async (c) => {
  try {
    const sender = c.get('user') as User;
    const body = await c.req.json();
    const {
      receiverAddress, amount, currency = 'USDC', type = 'send',
      signature, fee = 0, memo, category, narration, clientRef,
      displayAmount, displayCurrency, displaySymbol, receiverId,
    } = body;

    const txId = crypto.randomUUID().replace(/-/g, '');
    const now = Date.now();

    await c.env.DB.prepare(`
      INSERT INTO transactions
        (id, sender_id, receiver_id, amount_usdc, status, solana_signature,
         type, currency, fee, category, narration, memo, client_ref,
         display_amount, display_currency, display_symbol, created_at)
      VALUES (?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      txId, sender.id, receiverId || '',
      amount, signature || '', type, currency, fee,
      category || null, narration || null, memo || null,
      clientRef || null, displayAmount || amount, displayCurrency || currency,
      displaySymbol || 'USDC', now
    ).run();

    // Format amount for notification using display fields if available
    const dispAmt = displayAmount || amount;
    const dispSym = displaySymbol || '$';
    const dispCur = displayCurrency || 'USDC';
    const amountStr = `${dispSym}${Number(dispAmt).toFixed(2)} ${dispCur}`;

    // Notify sender
    const senderNotifId = crypto.randomUUID().replace(/-/g, '');
    await c.env.DB.prepare(`
      INSERT INTO notifications (id, user_id, type, title, content, data, created_at)
      VALUES (?, ?, 'payment', ?, ?, ?, ?)
    `).bind(senderNotifId, sender.id, 'Payment sent', `You sent ${amountStr}`, null, now).run();

    // Notify receiver if they are a platform user
    if (receiverId) {
      const receiverNotifId = crypto.randomUUID().replace(/-/g, '');
      await c.env.DB.prepare(`
        INSERT INTO notifications (id, user_id, type, title, content, data, created_at)
        VALUES (?, ?, 'payment', ?, ?, ?, ?)
      `).bind(receiverNotifId, receiverId, 'Payment received', `You received ${amountStr}`, null, now).run();
    }

    return c.json({ success: true, transactionId: txId });
  } catch (error) {
    console.error('Record transaction error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/transactions/initiate
app.post('/api/transactions/initiate', authMiddleware, async (c) => {
  try {
    const sender = c.get('user') as User;
    const body = await c.req.json();
    const { recipientUsername, amountUsdc } = body;

    if (!recipientUsername || !amountUsdc) {
      return c.json({ success: false, error: 'Missing recipient or amount' }, 400);
    }

    if (amountUsdc <= 0) {
      return c.json({ success: false, error: 'Amount must be positive' }, 400);
    }

    const recipient = await c.env.DB.prepare(
      'SELECT id, username, solana_public_key FROM users WHERE (username = ? OR solana_public_key = ?) AND is_active = 1'
    ).bind(recipientUsername.toLowerCase(), recipientUsername).first<{ id: string; username: string; solana_public_key: string }>();

    if (!recipient) {
      return c.json({ success: false, error: 'Recipient not found' }, 404);
    }

    if (recipient.id === sender.id) {
      return c.json({ success: false, error: 'Cannot send to yourself' }, 400);
    }

    return c.json({
      success: true,
      recipientPublicKey: recipient.solana_public_key,
      recipientUsername: recipient.username,
      amountUsdc,
    });
  } catch (error) {
    console.error('Initiate transaction error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// POST /api/transactions/submit
app.post('/api/transactions/submit', authMiddleware, async (c) => {
  try {
    const sender = c.get('user') as User;
    const body = await c.req.json();
    const { signedTransaction, recipientUsername, amountUsdc } = body;

    if (!signedTransaction) {
      return c.json({ success: false, error: 'Missing signed transaction' }, 400);
    }

    const rpcUrlSubmit = c.env.ALCHEMY_RPC_URL;
    const txBuffer = Uint8Array.from(atob(signedTransaction), c => c.charCodeAt(0));
    const signature = await rpcSendAndConfirm(rpcUrlSubmit, txBuffer);

    const recipient = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ? AND is_active = 1'
    ).bind(recipientUsername?.toLowerCase() || '').first<{ id: string }>();

    const txId = crypto.randomUUID().replace(/-/g, '');
    const now = Date.now();
    await c.env.DB.prepare(`
      INSERT INTO transactions (id, sender_id, receiver_id, amount_usdc, status, solana_signature, type, currency, created_at)
      VALUES (?, ?, ?, ?, 'confirmed', ?, 'send', 'USDC', ?)
    `).bind(txId, sender.id, recipient?.id || '', amountUsdc, signature, now).run();

    // Award points: +5 to sender for outgoing transfer
    await awardPoints(c.env.DB, sender.id, 5, 'Outgoing transfer');

    // Check if sender has a referrer and award them +2
    const senderData = await c.env.DB.prepare(
      'SELECT referred_by FROM users WHERE id = ?'
    ).bind(sender.id).first<{ referred_by: string | null }>();

    if (senderData?.referred_by) {
      await awardPoints(c.env.DB, senderData.referred_by, 2, 'Referee made a transfer');
    }

    // Payment notifications
    const amountStr = `$${Number(amountUsdc).toFixed(2)} USDC`;
    const senderNotifId = crypto.randomUUID().replace(/-/g, '');
    await c.env.DB.prepare(`
      INSERT INTO notifications (id, user_id, type, title, content, data, created_at)
      VALUES (?, ?, 'payment', ?, ?, ?, ?)
    `).bind(senderNotifId, sender.id, 'Payment sent', `You sent ${amountStr} to @${recipientUsername || 'recipient'}`, null, now).run();

    if (recipient?.id) {
      const receiverNotifId = crypto.randomUUID().replace(/-/g, '');
      await c.env.DB.prepare(`
        INSERT INTO notifications (id, user_id, type, title, content, data, created_at)
        VALUES (?, ?, 'payment', ?, ?, ?, ?)
      `).bind(receiverNotifId, recipient.id, 'Payment received', `You received ${amountStr} from @${sender.username}`, null, now).run();
    }

    return c.json({ success: true, signature, transactionId: txId });
  } catch (error) {
    console.error('Submit transaction error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to broadcast transaction' }, 500);
  }
});

// GET /api/transactions/history
app.get('/api/transactions/history', authMiddleware, async (c) => {
  const user = c.get('user') as User;

  const results = await c.env.DB.prepare(`
    SELECT t.*,
           s.username as sender_username, s.avatar_base64 as sender_avatar,
           r.username as receiver_username, r.avatar_base64 as receiver_avatar
    FROM transactions t
    LEFT JOIN users s ON t.sender_id = s.id
    LEFT JOIN users r ON t.receiver_id = r.id
    WHERE t.sender_id = ? OR t.receiver_id = ?
    ORDER BY t.created_at DESC
    LIMIT 50
  `).bind(user.id, user.id).all();

  const transactions = results.results.map((row: any) => ({
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    senderUsername: row.sender_username,
    receiverUsername: row.receiver_username,
    fromAvatarBase64: row.sender_avatar,
    toAvatarBase64: row.receiver_avatar,
    amountUsdc: row.amount_usdc,
    status: row.status,
    signature: row.solana_signature,
    createdAt: new Date(row.created_at).toISOString(),
    type: row.sender_id === user.id ? 'send' : 'receive',
    currency: row.currency || 'USDC',
    fee: row.fee || 0,
    memo: row.memo,
    narration: row.narration,
    category: row.category,
    displayAmount: row.display_amount || row.amount_usdc,
    displayCurrency: row.display_currency || 'USDC',
    displaySymbol: row.display_symbol || 'USDC',
  }));

  return c.json({ success: true, transactions });
});

// ─── SOLANA / SPONSOR ────────────────────────────────────────────────────────

// POST /api/solana/claim-bonus
app.post('/api/solana/claim-bonus', authMiddleware, async (c) => {
  try {
    const sessionUser = c.get('user') as User;

    // Fetch fresh user data from DB
    const dbUser = await c.env.DB.prepare(
      'SELECT id, solana_public_key, bonus_claimed, username_claimed FROM users WHERE id = ? AND is_active = 1'
    ).bind(sessionUser.id).first<{
      id: string;
      solana_public_key: string;
      bonus_claimed: number;
      username_claimed: number;
    }>();

    if (!dbUser) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    if (dbUser.bonus_claimed) {
      return c.json({ success: false, error: 'Bonus already claimed' }, 409);
    }

    if (!dbUser.username_claimed) {
      return c.json({ success: false, error: 'Must claim a username before claiming bonus' }, 400);
    }

    if (!c.env.SPONSOR_PRIVATE_KEY) {
      return c.json({ success: false, error: 'Sponsor wallet not configured' }, 500);
    }
    if (!c.env.ALCHEMY_RPC_URL) {
      return c.json({ success: false, error: 'Solana RPC not configured' }, 500);
    }

    // Decode sponsor keypair from base58
    const bs58 = await import('bs58');
    const sponsorSecretBytes = bs58.default.decode(c.env.SPONSOR_PRIVATE_KEY);
    const sponsorKeypair = Keypair.fromSecretKey(sponsorSecretBytes);

    const recipientPubkey = new PublicKey(dbUser.solana_public_key);
    const usdcMintPubkey = new PublicKey(USDC_MINT);
    const rpcUrl = c.env.ALCHEMY_RPC_URL;

    const decimals = USDC_DECIMALS;
    const rawAmount = WELCOME_BONUS_USDC * Math.pow(10, decimals);

    // Get sponsor ATA
    const sponsorAta = getAssociatedTokenAddressSync(
      usdcMintPubkey,
      sponsorKeypair.publicKey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // Get or create recipient ATA
    const recipientAta = getAssociatedTokenAddressSync(
      usdcMintPubkey,
      recipientPubkey,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const tx = new Transaction();
    tx.feePayer = sponsorKeypair.publicKey;

    // Create recipient ATA if it doesn't exist
    const recipientAtaExists = await rpcAccountExists(rpcUrl, recipientAta.toBase58());
    if (!recipientAtaExists) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          sponsorKeypair.publicKey,
          recipientAta,
          recipientPubkey,
          usdcMintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Transfer USDC
    tx.add(
      createTransferInstruction(
        sponsorAta,
        recipientAta,
        sponsorKeypair.publicKey,
        BigInt(rawAmount),
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const sendWithFreshBlockhash = async () => {
      const { blockhash, lastValidBlockHeight } = await rpcGetLatestBlockhash(rpcUrl);
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      tx.sign(sponsorKeypair);
      return rpcSendAndConfirm(rpcUrl, tx.serialize());
    };

    // Sign and send (retry once on blockhash expiry)
    let signature: string;
    try {
      signature = await sendWithFreshBlockhash();
    } catch (error) {
      if (error instanceof Error && /Blockhash not found|BlockhashNotFound/i.test(error.message)) {
        signature = await sendWithFreshBlockhash();
      } else {
        throw error;
      }
    }

    // Mark bonus as claimed
    const now = Date.now();
    await c.env.DB.prepare(
      'UPDATE users SET bonus_claimed = 1, updated_at = ? WHERE id = ?'
    ).bind(now, sessionUser.id).run();

    // Record the bonus transaction
    const txId = crypto.randomUUID().replace(/-/g, '');
    await c.env.DB.prepare(`
      INSERT INTO transactions
        (id, sender_id, receiver_id, amount_usdc, status, solana_signature, type, currency, narration, created_at)
      VALUES (?, ?, ?, ?, 'confirmed', ?, 'receive', 'USDC', 'Welcome bonus', ?)
    `).bind(txId, sessionUser.id, sessionUser.id, WELCOME_BONUS_USDC, signature, now).run();

    return c.json({ success: true, signature, transactionId: txId });
  } catch (error) {
    console.error('Claim bonus error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to claim bonus' }, 500);
  }
});

// POST /api/solana — generic sponsor relay (for buildSponsoredTransaction / broadcastSponsoredTransaction)
app.post('/api/solana', authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const { action } = body;

    if (action === 'health') {
      const issues: string[] = [];
      const details: Record<string, unknown> = {};

      const rpcUrl = c.env.ALCHEMY_RPC_URL;
      if (!rpcUrl) {
        issues.push('Solana RPC not configured');
      }

      if (!c.env.SPONSOR_PRIVATE_KEY) {
        issues.push('Sponsor wallet not configured');
      }

      if (rpcUrl) {
        try {
          const { blockhash, lastValidBlockHeight } = await rpcGetLatestBlockhash(rpcUrl);
          details.blockhash = blockhash;
          details.lastValidBlockHeight = lastValidBlockHeight;
        } catch (error) {
          issues.push(`RPC unavailable: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }

      let sponsorPubkey: PublicKey | null = null;
      if (c.env.SPONSOR_PRIVATE_KEY) {
        try {
          const bs58 = await import('bs58');
          const sponsorSecretBytes = bs58.default.decode(c.env.SPONSOR_PRIVATE_KEY);
          const sponsorKeypair = Keypair.fromSecretKey(sponsorSecretBytes);
          sponsorPubkey = sponsorKeypair.publicKey;
          details.sponsor = sponsorPubkey.toBase58();
        } catch (error) {
          issues.push('Invalid sponsor private key');
        }
      }

      if (rpcUrl) {
        try {
          const mintExists = await rpcAccountExists(rpcUrl, USDC_MINT);
          if (!mintExists) {
            issues.push('USDC mint account not found on RPC');
          }
        } catch (error) {
          issues.push(`USDC mint check failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }

      if (rpcUrl && sponsorPubkey) {
        try {
          const lamports = await rpcGetBalance(rpcUrl, sponsorPubkey.toBase58());
          details.sponsorSol = lamports / 1_000_000_000;
          if (lamports === 0) {
            issues.push('Sponsor SOL balance is 0. Add SOL for fees.');
          }
        } catch (error) {
          issues.push(`Sponsor SOL balance check failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        }

        try {
          const usdcMintPubkey = new PublicKey(USDC_MINT);
          const sponsorAta = getAssociatedTokenAddressSync(
            usdcMintPubkey,
            sponsorPubkey,
            false,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          details.sponsorUsdcAta = sponsorAta.toBase58();

          const ataExists = await rpcAccountExists(rpcUrl, sponsorAta.toBase58());
          if (!ataExists) {
            issues.push('Sponsor USDC ATA missing');
          } else {
            const balance = await rpcGetTokenBalance(rpcUrl, sponsorAta.toBase58());
            details.sponsorUsdc = balance.uiAmount;
            if (!balance.uiAmount || balance.uiAmount <= 0) {
              issues.push('Sponsor USDC balance is 0');
            }
          }
        } catch (error) {
          issues.push(`Sponsor USDC balance check failed: ${error instanceof Error ? error.message : 'unknown error'}`);
        }
      }

      return c.json({ status: issues.length ? 'degraded' : 'ok', network: 'devnet', issues, details });
    }

    if (action === 'buildSponsoredTransaction') {
      const { senderAddress, receiverAddress, amount, recentBlockhash, lastValidBlockHeight } = body;

      if (!recentBlockhash) {
        return c.json({ error: 'recentBlockhash is required' }, 400);
      }
      if (lastValidBlockHeight === undefined || lastValidBlockHeight === null) {
        return c.json({ error: 'lastValidBlockHeight is required' }, 400);
      }

      if (!c.env.SPONSOR_PRIVATE_KEY) {
        return c.json({ error: 'Sponsor wallet not configured' }, 500);
      }

      const bs58 = await import('bs58');
      const sponsorSecretBytes = bs58.default.decode(c.env.SPONSOR_PRIVATE_KEY);
      const sponsorKeypair = Keypair.fromSecretKey(sponsorSecretBytes);

      const senderPubkey = new PublicKey(senderAddress);
      const receiverPubkey = new PublicKey(receiverAddress);
      const usdcMintPubkey = new PublicKey(USDC_MINT);
      const decimals = USDC_DECIMALS;

      // Calculate fee: 0.005% platform fee
      const platformFeeUsdc = amount * PLATFORM_FEE_RATE;
      const feeCharged = platformFeeUsdc;

      const senderAta = getAssociatedTokenAddressSync(usdcMintPubkey, senderPubkey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const receiverAta = getAssociatedTokenAddressSync(usdcMintPubkey, receiverPubkey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);
      const treasuryPubkey = new PublicKey(TREASURY_WALLET);
      const treasuryAta = getAssociatedTokenAddressSync(usdcMintPubkey, treasuryPubkey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      // Use client-supplied blockhash — no Solana RPC call needed on the backend
      const tx = new Transaction();
      tx.recentBlockhash = recentBlockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      tx.feePayer = sponsorKeypair.publicKey;

      // Idempotent ATA creation — no need to check existence via RPC
      tx.add(createAssociatedTokenAccountIdempotentInstruction(
        sponsorKeypair.publicKey, receiverAta, receiverPubkey, usdcMintPubkey,
        TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      ));

      // Main transfer
      const rawNet = Math.floor((amount - platformFeeUsdc) * Math.pow(10, decimals));
      const rawFee = Math.floor(platformFeeUsdc * Math.pow(10, decimals));

      tx.add(createTransferInstruction(senderAta, receiverAta, senderPubkey, BigInt(rawNet), [], TOKEN_PROGRAM_ID));

      // Platform fee to treasury if fee > 0
      if (rawFee > 0) {
        tx.add(createAssociatedTokenAccountIdempotentInstruction(
          sponsorKeypair.publicKey, treasuryAta, treasuryPubkey, usdcMintPubkey,
          TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
        ));
        tx.add(createTransferInstruction(senderAta, treasuryAta, senderPubkey, BigInt(rawFee), [], TOKEN_PROGRAM_ID));
      }

      // Sponsor co-signs for gas
      tx.partialSign(sponsorKeypair);

      const serializedTx = btoa(String.fromCharCode(...Array.from(tx.serialize({ requireAllSignatures: false }))));
      return c.json({ serializedTx, feeCharged });
    }

    if (action === 'broadcastSponsoredTransaction') {
      // Frontend broadcasts the transaction directly (no CF Worker → devnet RPC call needed).
      // We just accept the confirmed signature and return it.
      const { signature } = body;
      if (!signature) return c.json({ error: 'Missing signature' }, 400);
      return c.json({ signature });
    }

    return c.json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('Solana relay error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
  }
});

// ─── SUPPORT ──────────────────────────────────────────────────────────────────

// GET /api/support/messages
app.get('/api/support/messages', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const results = await c.env.DB.prepare(
    'SELECT id, role, content, created_at FROM support_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT 100'
  ).bind(user.id).all();

  return c.json({
    success: true,
    messages: results.results.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: new Date(m.created_at).toISOString(),
    })),
  });
});

// POST /api/support/messages
app.post('/api/support/messages', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as User;
    const body = await c.req.json();
    const { role, content } = body;

    if (!content?.trim()) {
      return c.json({ success: false, error: 'Content is required' }, 400);
    }

    const msgId = crypto.randomUUID().replace(/-/g, '');
    const now = Date.now();
    await c.env.DB.prepare(
      'INSERT INTO support_messages (id, user_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(msgId, user.id, role === 'admin' ? 'admin' : 'user', content.trim(), now).run();

    return c.json({ success: true, messageId: msgId });
  } catch (error) {
    console.error('Support message error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ─── CONTACTS ────────────────────────────────────────────────────────────────

// GET /api/contacts
app.get('/api/contacts', authMiddleware, async (c) => {
  const user = c.get('user') as User;
  const results = await c.env.DB.prepare(`
    SELECT c.id, c.contact_user_id, u.username, u.solana_public_key, u.name, u.avatar_base64, u.verification_level, c.created_at
    FROM contacts c
    JOIN users u ON c.contact_user_id = u.id
    WHERE c.user_id = ? AND u.is_active = 1
    ORDER BY c.created_at DESC
  `).bind(user.id).all();

  return c.json({
    success: true,
    contacts: results.results.map((row: any) => ({
      id: row.id,
      contactUserId: row.contact_user_id,
      username: row.username,
      solanaPublicKey: row.solana_public_key,
      name: row.name || null,
      avatarBase64: row.avatar_base64 || null,
      verificationLevel: row.verification_level || 0,
      createdAt: new Date(row.created_at).toISOString(),
    })),
  });
});

// POST /api/contacts
app.post('/api/contacts', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as User;
    const body = await c.req.json();
    const { contactUsername } = body;

    if (!contactUsername?.trim()) {
      return c.json({ success: false, error: 'Username is required' }, 400);
    }

    const normalized = contactUsername.toLowerCase().trim();

    // Find the contact user
    const contactUser = await c.env.DB.prepare(
      'SELECT id, username, solana_public_key FROM users WHERE username = ? AND is_active = 1'
    ).bind(normalized).first<{ id: string; username: string; solana_public_key: string }>();

    if (!contactUser) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    if (contactUser.id === user.id) {
      return c.json({ success: false, error: 'Cannot add yourself' }, 400);
    }

    // Check if already added
    const existing = await c.env.DB.prepare(
      'SELECT id FROM contacts WHERE user_id = ? AND contact_user_id = ?'
    ).bind(user.id, contactUser.id).first();

    if (existing) {
      return c.json({ success: false, error: 'Contact already exists' }, 409);
    }

    const contactId = crypto.randomUUID().replace(/-/g, '');
    const now = Date.now();
    await c.env.DB.prepare(
      'INSERT INTO contacts (id, user_id, contact_user_id, created_at) VALUES (?, ?, ?, ?)'
    ).bind(contactId, user.id, contactUser.id, now).run();

    return c.json({
      success: true,
      contact: {
        id: contactId,
        contactUserId: contactUser.id,
        username: contactUser.username,
        solanaPublicKey: contactUser.solana_public_key,
        createdAt: new Date(now).toISOString(),
      },
    });
  } catch (error) {
    console.error('Add contact error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// DELETE /api/contacts/:id
app.delete('/api/contacts/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user') as User;
    const contactId = c.req.param('id');

    const contact = await c.env.DB.prepare(
      'SELECT id FROM contacts WHERE id = ? AND user_id = ?'
    ).bind(contactId, user.id).first();

    if (!contact) {
      return c.json({ success: false, error: 'Contact not found' }, 404);
    }

    await c.env.DB.prepare(
      'DELETE FROM contacts WHERE id = ? AND user_id = ?'
    ).bind(contactId, user.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Remove contact error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ─── GIFTS ───────────────────────────────────────────────────────────────────

// POST /api/gifts/airdrop
app.post('/api/gifts/airdrop', authMiddleware, async (c) => {
  try {
    const sender = c.get('user') as User;
    const body = await c.req.json();
    const { mode, recipients, amountPerRecipient, isAnonymous, eligibilityTier } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return c.json({ success: false, error: 'Recipients required' }, 400);
    }

    if (recipients.length > 20) {
      return c.json({ success: false, error: 'Maximum 20 recipients per airdrop' }, 400);
    }

    if (!amountPerRecipient || amountPerRecipient <= 0) {
      return c.json({ success: false, error: 'Invalid amount' }, 400);
    }

    // Validate sender has enough balance (skip for now, let Solana fail if insufficient)
    
    if (!c.env.SPONSOR_PRIVATE_KEY) {
      return c.json({ success: false, error: 'Sponsor wallet not configured' }, 500);
    }

    const bs58 = await import('bs58');
    const sponsorSecretBytes = bs58.default.decode(c.env.SPONSOR_PRIVATE_KEY);
    const sponsorKeypair = Keypair.fromSecretKey(sponsorSecretBytes);

    const usdcMintPubkey = new PublicKey(USDC_MINT);
    const rpcUrlGift = c.env.ALCHEMY_RPC_URL;
    const decimals = USDC_DECIMALS;
    const rawAmount = Math.floor(amountPerRecipient * Math.pow(10, decimals));

    const senderAta = getAssociatedTokenAddressSync(usdcMintPubkey, new PublicKey(sender.solanaPublicKey), false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

    // Check sender ATA balance
    const senderBalance = await rpcGetTokenBalance(rpcUrlGift, senderAta.toBase58());
    const senderRawBalance = BigInt(Math.floor(Number(senderBalance.amount)));
    const totalNeeded = BigInt(rawAmount) * BigInt(recipients.length);

    if (senderRawBalance < totalNeeded) {
      return c.json({ success: false, error: `Insufficient USDC balance. Need ${Number(totalNeeded) / Math.pow(10, decimals)} USDC` }, 400);
    }

    const results = [];
    const failed = [];

    for (const recipientUsername of recipients) {
      try {
        const recipient = await c.env.DB.prepare(
          'SELECT id, username, solana_public_key FROM users WHERE username = ? AND is_active = 1'
        ).bind(recipientUsername.toLowerCase()).first<{ id: string; username: string; solana_public_key: string }>();

        if (!recipient) {
          failed.push({ username: recipientUsername, error: 'User not found' });
          continue;
        }

        const recipientPubkey = new PublicKey(recipient.solana_public_key);
        const recipientAta = getAssociatedTokenAddressSync(usdcMintPubkey, recipientPubkey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

        const tx = new Transaction();
        tx.feePayer = sponsorKeypair.publicKey;

        // Create recipient ATA if needed
        const recipientAtaExistsGift = await rpcAccountExists(rpcUrlGift, recipientAta.toBase58());
        if (!recipientAtaExistsGift) {
          tx.add(createAssociatedTokenAccountIdempotentInstruction(
            sponsorKeypair.publicKey, recipientAta, recipientPubkey, usdcMintPubkey,
            TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
          ));
        }

        // Transfer USDC
        tx.add(createTransferInstruction(
          senderAta, recipientAta, new PublicKey(sender.solanaPublicKey),
          BigInt(rawAmount), [], TOKEN_PROGRAM_ID
        ));

        // Fetch a fresh blockhash right before signing and sending
        const { blockhash, lastValidBlockHeight } = await rpcGetLatestBlockhash(rpcUrlGift);
        tx.recentBlockhash = blockhash;
        tx.lastValidBlockHeight = lastValidBlockHeight;

        // Sponsor co-signs for gas
        tx.partialSign(sponsorKeypair);

        const txBytes = tx.serialize({ requireAllSignatures: false });
        const signature = await rpcSendAndConfirm(rpcUrlGift, txBytes);

        // Record gift in DB
        const giftId = crypto.randomUUID().replace(/-/g, '');
        const now = Date.now();
        await c.env.DB.prepare(`
          INSERT INTO gifts (id, sender_id, recipient_id, amount_usdc, is_anonymous, acknowledged, solana_signature, created_at)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        `).bind(giftId, sender.id, recipient.id, amountPerRecipient, isAnonymous ? 1 : 0, signature, now).run();

        results.push({
          username: recipient.username,
          signature,
          giftId,
        });
      } catch (err) {
        console.error(`Gift to ${recipientUsername} failed:`, err);
        failed.push({ username: recipientUsername, error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    return c.json({
      success: true,
      results,
      failed,
      totalSent: results.length,
      totalFailed: failed.length,
    });
  } catch (error) {
    console.error('Gift airdrop error:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});

// ─── ADMIN ───────────────────────────────────────────────────────────────────

// GET /api/admin/users
app.get('/api/admin/users', authMiddleware, async (c) => {
  const results = await c.env.DB.prepare(
    'SELECT id, email, username, solana_public_key, bonus_claimed, username_claimed, is_active, created_at FROM users ORDER BY created_at DESC LIMIT 100'
  ).all();

  return c.json({
    success: true,
    users: results.results.map((u: any) => ({
      userId: u.id,
      email: u.email,
      username: u.username,
      solanaPublicKey: u.solana_public_key,
      bonusClaimed: !!u.bonus_claimed,
      usernameClaimed: !!u.username_claimed,
      isActive: !!u.is_active,
      createdAt: new Date(u.created_at).toISOString(),
    })),
  });
});

// GET /api/admin/support
app.get('/api/admin/support', authMiddleware, async (c) => {
  const results = await c.env.DB.prepare(`
    SELECT sm.*, u.username, u.email
    FROM support_messages sm
    JOIN users u ON sm.user_id = u.id
    ORDER BY sm.created_at DESC
    LIMIT 200
  `).all();

  return c.json({
    success: true,
    messages: results.results.map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      username: m.username,
      email: m.email,
      role: m.role,
      content: m.content,
      createdAt: new Date(m.created_at).toISOString(),
    })),
  });
});

// ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

// Award points to a user and create a notification
async function awardPoints(
  db: D1Database,
  userId: string,
  points: number,
  reason: string
) {
  // Update pay_points
  await db.prepare(
    'UPDATE users SET pay_points = pay_points + ? WHERE id = ?'
  ).bind(points, userId).run();

  // Create notification
  const notifId = crypto.randomUUID().replace(/-/g, '');
  await db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, content, data, created_at)
    VALUES (?, ?, 'points', ?, ?, ?, ?)
  `).bind(notifId, userId, `+${points} PayPoints earned`, reason, null, Date.now()).run();
}

// Send push notification to a user (VAPID-based Web Push)
async function sendPushToUser(
  env: Env,
  userId: string,
  title: string,
  body: string,
  url?: string
) {
  try {
    const subs = await env.DB.prepare(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?'
    ).bind(userId).all<{ endpoint: string; p256dh: string; auth: string }>();

    for (const sub of subs.results) {
      try {
        // Build VAPID JWT
        const header = { alg: 'ES256', typ: 'JWT' };
        const now = Math.floor(Date.now() / 1000);
        const payload = {
          aud: new URL(sub.endpoint).origin,
          exp: now + 86400,
          sub: 'mailto:support@payme-protocol.cc',
        };

        const headerBase64 = btoa(JSON.stringify(header)).replace(/=/g, '');
        const payloadBase64 = btoa(JSON.stringify(payload)).replace(/=/g, '');
        const signingInput = `${headerBase64}.${payloadBase64}`;

        // Import private key and sign
        const privateKeyDer = Uint8Array.from(atob(env.VAPID_PRIVATE_KEY), ch => ch.charCodeAt(0));
        const key = await crypto.subtle.importKey(
          'pkcs8',
          privateKeyDer,
          { name: 'ECDSA', namedCurve: 'P-256' },
          true,
          ['sign']
        );
        const signature = await crypto.subtle.sign(
          { name: 'ECDSA', hash: 'SHA-256' },
          key,
          new TextEncoder().encode(signingInput)
        );
        const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '');
        const vapidToken = `${signingInput}.${signatureBase64}`;

        // Send push
        const res = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/octet-stream',
            'Authorization': `vapid t=${vapidToken}, k=${env.VAPID_PUBLIC_KEY}`,
            'TTL': '86400',
          },
          body: JSON.stringify({ title, body, url }),
        });

        if (res.status === 410 || res.status === 404) {
          // Dead subscription - delete it
          await env.DB.prepare(
            'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?'
          ).bind(userId, sub.endpoint).run();
        }
      } catch (err) {
        console.error('Push send error:', err);
      }
    }
  } catch (err) {
    console.error('sendPushToUser error:', err);
  }
}

// ─── INVITE GATE ─────────────────────────────────────────────────────────────

// POST /api/auth/validate-invite — no auth required
app.post('/api/auth/validate-invite',
  createRateLimitMiddleware('invite'),
  async (c) => {
    try {
      const body = await c.req.json();
      const { code, userId } = body;

      if (!code || !userId) {
        return c.json({ success: false, error: 'Missing required fields' }, 400);
      }

      const normalizedCode = code.trim().toUpperCase();

      // Check if PRIVATE TESTER
      if (normalizedCode === 'PRIVATE TESTER') {
        await c.env.DB.prepare(
          'UPDATE users SET invite_validated = 1 WHERE id = ?'
        ).bind(userId).run();
        return c.json({ success: true, valid: true });
      }

      // Look up referrer by referral_code
      const referrer = await c.env.DB.prepare(
        'SELECT id FROM users WHERE referral_code = ? AND username_claimed = 1 AND is_active = 1'
      ).bind(normalizedCode).first<{ id: string }>();

      if (!referrer) {
        return c.json({ success: false, error: 'INVALID_CODE' }, 403);
      }

      // Prevent self-referral
      if (referrer.id === userId) {
        return c.json({ success: false, error: 'INVALID_CODE' }, 403);
      }

      // Check if referrer has reached 3-use limit
      const countResult = await c.env.DB.prepare(
        'SELECT COUNT(*) as cnt FROM users WHERE referred_by = ?'
      ).bind(referrer.id).first<{ cnt: number }>();

      if (!countResult || (countResult.cnt ?? 0) >= 3) {
        return c.json({ success: false, error: 'MAX_REACHED' }, 403);
      }

      // Update user: set invite_validated and referred_by
      await c.env.DB.prepare(
        'UPDATE users SET invite_validated = 1, referred_by = ? WHERE id = ?'
      ).bind(referrer.id, userId).run();

      // Award referrer 10 points for signup
      await awardPoints(c.env.DB, referrer.id, 10, 'New referral signup');

      // Send push notification to referrer
      await sendPushToUser(c.env, referrer.id, '🎉 New Referral!', 'Someone signed up with your invite code.');

      return c.json({ success: true, valid: true });
    } catch (error) {
      console.error('Validate invite error:', error);
      return c.json({ success: false, error: 'Internal server error' }, 500);
    }
  }
);

// ─── REFERRALS ───────────────────────────────────────────────────────────────

// GET /api/referrals/my
app.get('/api/referrals/my', authMiddleware, async (c) => {
  const sessionUser = c.get('user') as User;

  const userData = await c.env.DB.prepare(
    'SELECT pay_points, referral_code FROM users WHERE id = ?'
  ).bind(sessionUser.id).first<{ pay_points: number; referral_code: string | null }>();

  const referrals = await c.env.DB.prepare(
    'SELECT username, created_at FROM users WHERE referred_by = ? AND is_active = 1 ORDER BY created_at DESC'
  ).bind(sessionUser.id).all<{ username: string; created_at: number }>();

  return c.json({
    success: true,
    payPoints: userData?.pay_points ?? 0,
    referralCode: userData?.referral_code ?? null,
    referrals: referrals.results.map(r => ({
      username: r.username,
      joinedAt: new Date(r.created_at).toISOString(),
    })),
  });
});

// GET /api/referrals/leaderboard
app.get('/api/referrals/leaderboard', authMiddleware, async (c) => {
  const sessionUser = c.get('user') as User;

  // Get full leaderboard
  const leaderboard = await c.env.DB.prepare(`
    SELECT id, username, pay_points
    FROM users
    WHERE is_active = 1 AND pay_points > 0
    ORDER BY pay_points DESC
    LIMIT 50
  `).all<{ id: string; username: string; pay_points: number }>();

  // Get user's own rank
  const rankResult = await c.env.DB.prepare(`
    SELECT COUNT(*) + 1 as rank FROM users
    WHERE is_active = 1 AND pay_points > (SELECT pay_points FROM users WHERE id = ?)
  `).bind(sessionUser.id).first<{ rank: number }>();

  const myData = await c.env.DB.prepare(
    'SELECT pay_points FROM users WHERE id = ?'
  ).bind(sessionUser.id).first<{ pay_points: number }>();

  return c.json({
    success: true,
    leaderboard: leaderboard.results.map((u, idx) => ({
      rank: idx + 1,
      username: u.username,
      payPoints: u.pay_points,
    })),
    myRank: rankResult?.rank ?? 999,
    myPoints: myData?.pay_points ?? 0,
  });
});

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

// GET /api/notifications
app.get('/api/notifications', authMiddleware, async (c) => {
  const sessionUser = c.get('user') as User;

  const notifs = await c.env.DB.prepare(`
    SELECT id, type, title, content, data, read, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).bind(sessionUser.id).all();

  return c.json({
    success: true,
    notifications: notifs.results.map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.content,
      data: n.data ? JSON.parse(n.data) : null,
      read: !!n.read,
      createdAt: new Date(n.created_at).toISOString(),
    })),
  });
});

// PATCH /api/notifications/:id/read
app.patch('/api/notifications/:id/read', authMiddleware, async (c) => {
  const sessionUser = c.get('user') as User;
  const notifId = c.req.param('id');

  await c.env.DB.prepare(
    'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?'
  ).bind(notifId, sessionUser.id).run();

  return c.json({ success: true });
});

// POST /api/notifications/broadcast (admin only)
app.post('/api/notifications/broadcast', authMiddleware, async (c) => {
  // Simple admin check - in production use a proper admin flag
  const ADMIN_USER_ID = c.env.JWT_SECRET; // placeholder - replace with actual admin ID env var
  const sessionUser = c.get('user') as User;

  if (sessionUser.id !== ADMIN_USER_ID && ADMIN_USER_ID) {
    return c.json({ success: false, error: 'Unauthorized' }, 403);
  }

  const body = await c.req.json();
  const { title, content, type = 'system', data } = body;

  // Get all active users
  const users = await c.env.DB.prepare(
    'SELECT id FROM users WHERE is_active = 1'
  ).all<{ id: string }>();

  // Insert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < users.results.length; i += batchSize) {
    const batch = users.results.slice(i, i + batchSize);
    for (const user of batch) {
      const notifId = crypto.randomUUID().replace(/-/g, '');
      await c.env.DB.prepare(`
        INSERT INTO notifications (id, user_id, type, title, content, data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(notifId, user.id, type, title, content, data ? JSON.stringify(data) : null, Date.now()).run();
    }
  }

  return c.json({ success: true, sent: users.results.length });
});

// ─── PUSH SUBSCRIPTIONS ──────────────────────────────────────────────────────

// GET /api/push/vapid-public-key
app.get('/api/push/vapid-public-key', async (c) => {
  return c.json({ publicKey: c.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe
app.post('/api/push/subscribe', authMiddleware, async (c) => {
  const sessionUser = c.get('user') as User;
  const body = await c.req.json();
  const { endpoint, p256dh, auth } = body;

  if (!endpoint || !p256dh || !auth) {
    return c.json({ success: false, error: 'Missing subscription data' }, 400);
  }

  const subId = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(subId, sessionUser.id, endpoint, p256dh, auth, Date.now()).run();

  return c.json({ success: true });
});

// DELETE /api/push/subscribe
app.delete('/api/push/subscribe', authMiddleware, async (c) => {
  const sessionUser = c.get('user') as User;
  const body = await c.req.json();
  const { endpoint } = body;

  await c.env.DB.prepare(
    'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?'
  ).bind(sessionUser.id, endpoint).run();

  return c.json({ success: true });
});

// ─── PASSWORD RESET ──────────────────────────────────────────────────────────

// POST /api/auth/reset-password/request
app.post('/api/auth/reset-password/request',
  createRateLimitMiddleware('reset_request'),
  async (c) => {
    try {
      const body = await c.req.json();
      const { email } = body;

      const user = await c.env.DB.prepare(
        'SELECT security_question FROM users WHERE email = ? AND is_active = 1'
      ).bind(email.toLowerCase().trim()).first<{ security_question: string | null }>();

      if (user && user.security_question) {
        return c.json({
          success: true,
          hasSecurityQuestion: true,
          securityQuestion: user.security_question,
        });
      }

      return c.json({
        success: true,
        hasSecurityQuestion: false,
        securityQuestion: null,
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      return c.json({ success: false, error: 'Internal server error' }, 500);
    }
  }
);

// POST /api/auth/reset-password/verify-question
app.post('/api/auth/reset-password/verify-question',
  createRateLimitMiddleware('reset_question'),
  async (c) => {
    try {
      const body = await c.req.json();
      const { email, answer, newPassword } = body;

      if (!email || !answer || !newPassword) {
        return c.json({ success: false, error: 'Missing required fields' }, 400);
      }

      const user = await c.env.DB.prepare(
        'SELECT id, security_answer_hash FROM users WHERE email = ? AND is_active = 1'
      ).bind(email.toLowerCase().trim()).first<{ id: string; security_answer_hash: string }>();

      if (!user || !user.security_answer_hash) {
        return c.json({ success: false, error: 'No recovery method on file' }, 404);
      }

      // Verify answer
      const match = await bcrypt.compare(answer.toLowerCase().trim(), user.security_answer_hash);
      if (!match) {
        return c.json({ success: false, error: 'Incorrect answer' }, 401);
      }

      // Hash new password and update
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await c.env.DB.prepare(`
        UPDATE users
        SET password_hash = ?, password_version = password_version + 1
        WHERE id = ?
      `).bind(passwordHash, user.id).run();

      return c.json({ success: true });
    } catch (error) {
      console.error('Password reset verify error:', error);
      return c.json({ success: false, error: 'Internal server error' }, 500);
    }
  }
);

// POST /api/auth/change-password
app.post('/api/auth/change-password', authMiddleware, async (c) => {
  try {
    const sessionUser = c.get('user') as User;
    const body = await c.req.json();
    const { currentPassword, newPassword } = body;

    // Get current password hash
    const userData = await c.env.DB.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(sessionUser.id).first<{ password_hash: string }>();

    if (!userData) {
      return c.json({ success: false, error: 'User not found' }, 404);
    }

    // Verify current password
    const match = await bcrypt.compare(currentPassword, userData.password_hash);
    if (!match) {
      return c.json({ success: false, error: 'Incorrect password' }, 401);
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await c.env.DB.prepare(`
      UPDATE users
      SET password_hash = ?, password_version = password_version + 1
      WHERE id = ?
    `).bind(passwordHash, sessionUser.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ─── FX RATES ────────────────────────────────────────────────────────────────

// GET /api/fx/rates
app.get('/api/fx/rates', async (c) => {
  try {
    // Fetch fresh rates from external API
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    if (!response.ok) {
      return c.json({ success: false, rates: null });
    }

    const data: any = await response.json();

    return c.json({ success: true, rates: data.rates, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('FX rates error:', error);
    return c.json({ success: false, rates: null });
  }
});

// ─── FILE UPLOAD ─────────────────────────────────────────────────────────────

// POST /api/upload
app.post('/api/upload', authMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'avatar' | 'receipt';

    if (!file || !type) {
      return c.json({ success: false, error: 'Missing file or type' }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ success: false, error: 'Invalid file type. Only JPEG, PNG, and WebP allowed.' }, 400);
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return c.json({ success: false, error: 'File too large. Max 2MB.' }, 400);
    }

    const sessionUser = c.get('user') as User;
    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    // Generate object key
    const ext = file.type.split('/')[1];
    const timestamp = Date.now();
    const objectKey = `${type}/${sessionUser.id}/${timestamp}.${ext}`;

    // Build S3 PutObject request with AWS Signature V4
    const endpoint = c.env.S3_ENDPOINT.replace(/\/$/, '');
    const bucket = c.env.S3_BUCKET;
    const accessKey = c.env.S3_ACCESS_KEY;
    const secretKey = c.env.S3_SECRET_KEY;
    const region = 'auto'; // Contabo uses 'auto' region

    const host = new URL(endpoint).host;
    const service = 's3';
    const algorithm = 'AWS4-HMAC-SHA256';
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const dateStamp = amzDate.slice(0, 8);

    // Canonical request
    const canonicalUri = `/${bucket}/${objectKey}`;
    const canonicalQueryString = '';
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:UNSIGNED-PAYLOAD\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

    // Payload hash (for unsigned payload)
    const payloadHash = 'UNSIGNED-PAYLOAD';

    const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    // String to sign
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const hashedRequest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(canonicalRequest)
    );
    const hashedRequestHex = Array.from(new Uint8Array(hashedRequest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${hashedRequestHex}`;

    // Sign the string
    const kSecret = new TextEncoder().encode('AWS4' + secretKey);
    const kDate = await crypto.subtle.sign(
      { name: 'HMAC' },
      await crypto.subtle.importKey('raw', kSecret, 'HMAC', false, ['sign']),
      new TextEncoder().encode(dateStamp)
    );
    const kRegion = await crypto.subtle.sign(
      { name: 'HMAC' },
      await crypto.subtle.importKey('raw', new Uint8Array(kDate), 'HMAC', false, ['sign']),
      new TextEncoder().encode(region)
    );
    const kService = await crypto.subtle.sign(
      { name: 'HMAC' },
      await crypto.subtle.importKey('raw', new Uint8Array(kRegion), 'HMAC', false, ['sign']),
      new TextEncoder().encode(service)
    );
    const kSigning = await crypto.subtle.sign(
      { name: 'HMAC' },
      await crypto.subtle.importKey('raw', new Uint8Array(kService), 'HMAC', false, ['sign']),
      new TextEncoder().encode('aws4_request')
    );

    const signatureBytes = await crypto.subtle.sign(
      { name: 'HMAC' },
      await crypto.subtle.importKey('raw', new Uint8Array(kSigning), 'HMAC', false, ['sign']),
      new TextEncoder().encode(stringToSign)
    );
    const signature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Authorization header
    const authorization = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Upload to S3
    const uploadUrl = `${endpoint}/${bucket}/${objectKey}`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authorization,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Content-Type': file.type,
      },
      body: fileBytes,
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error('S3 upload error:', errorText);
      return c.json({ success: false, error: 'Upload failed' }, 500);
    }

    const publicUrl = `${endpoint}/${bucket}/${objectKey}`;
    return c.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ─── MONEY REQUESTS ──────────────────────────────────────────────────────────

// POST /api/money-requests
app.post('/api/money-requests', authMiddleware, async (c) => {
  try {
    const requester = c.get('user') as User;
    const body = await c.req.json();
    const { target, amountUsdc, note } = body;

    if (!target || typeof target !== 'string' || !target.trim()) {
      return c.json({ success: false, error: 'target is required' }, 400);
    }
    if (!amountUsdc || typeof amountUsdc !== 'number' || amountUsdc <= 0) {
      return c.json({ success: false, error: 'amountUsdc must be a positive number' }, 400);
    }

    // Resolve target by username or wallet address
    const targetUser = await c.env.DB.prepare(
      'SELECT id, username FROM users WHERE (username = ? OR solana_public_key = ?) AND is_active = 1'
    ).bind(target.trim().toLowerCase(), target.trim()).first<{ id: string; username: string }>();

    if (!targetUser) {
      return c.json({ success: false, error: 'User not found on PayMe.' }, 404);
    }

    if (targetUser.id === requester.id) {
      return c.json({ success: false, error: 'You cannot request money from yourself.' }, 400);
    }

    // Contact guard: target must have saved requester as a contact
    const contactRow = await c.env.DB.prepare(
      'SELECT id FROM contacts WHERE user_id = ? AND contact_user_id = ?'
    ).bind(targetUser.id, requester.id).first();

    if (!contactRow) {
      return c.json({
        success: false,
        error: `@${targetUser.username} has not saved you as a contact. They need to add you on PayMe before you can request money from them.`,
      }, 403);
    }

    const now = Date.now();
    const requestId = crypto.randomUUID().replace(/-/g, '');

    await c.env.DB.prepare(
      'INSERT INTO money_requests (id, requester_id, target_id, amount_usdc, note, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, \'pending\', ?, ?)'
    ).bind(requestId, requester.id, targetUser.id, amountUsdc, note?.trim() || null, now, now).run();

    // Notify the target
    const amountStr = `$${Number(amountUsdc).toFixed(2)} USDC`;
    const notifId = crypto.randomUUID().replace(/-/g, '');
    const notifContent = note?.trim()
      ? `${requester.username} is requesting ${amountStr} — "${note.trim()}"`
      : `${requester.username} is requesting ${amountStr}`;
    await c.env.DB.prepare(
      'INSERT INTO notifications (id, user_id, type, title, content, data, created_at) VALUES (?, ?, \'money_request\', ?, ?, ?, ?)'
    ).bind(notifId, targetUser.id, `Money request from @${requester.username}`, notifContent, JSON.stringify({ requestId, amountUsdc, requesterUsername: requester.username }), now).run();

    return c.json({ success: true, requestId });
  } catch (error) {
    console.error('Money request error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// GET /api/money-requests — incoming pending requests for the current user
app.get('/api/money-requests', authMiddleware, async (c) => {
  try {
    const sessionUser = c.get('user') as User;
    const rows = await c.env.DB.prepare(`
      SELECT mr.id, mr.amount_usdc, mr.note, mr.status, mr.created_at,
             u.username AS requester_username, u.id AS requester_id
      FROM money_requests mr
      JOIN users u ON u.id = mr.requester_id
      WHERE mr.target_id = ? AND mr.status = 'pending'
      ORDER BY mr.created_at DESC
      LIMIT 50
    `).bind(sessionUser.id).all();

    return c.json({
      success: true,
      requests: rows.results.map((r: any) => ({
        id: r.id,
        amountUsdc: r.amount_usdc,
        note: r.note,
        status: r.status,
        requesterUsername: r.requester_username,
        requesterId: r.requester_id,
        createdAt: new Date(r.created_at).toISOString(),
      })),
    });
  } catch (error) {
    console.error('List money requests error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// PATCH /api/money-requests/:id/respond — accept or decline
app.patch('/api/money-requests/:id/respond', authMiddleware, async (c) => {
  try {
    const sessionUser = c.get('user') as User;
    const requestId = c.req.param('id');
    const { action } = await c.req.json(); // 'accept' | 'decline'

    if (action !== 'accept' && action !== 'decline') {
      return c.json({ success: false, error: 'action must be accept or decline' }, 400);
    }

    const row = await c.env.DB.prepare(
      'SELECT id, requester_id, amount_usdc, status FROM money_requests WHERE id = ? AND target_id = ?'
    ).bind(requestId, sessionUser.id).first<{ id: string; requester_id: string; amount_usdc: number; status: string }>();

    if (!row) return c.json({ success: false, error: 'Request not found' }, 404);
    if (row.status !== 'pending') return c.json({ success: false, error: 'Request already resolved' }, 409);

    const now = Date.now();
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    await c.env.DB.prepare(
      'UPDATE money_requests SET status = ?, updated_at = ? WHERE id = ?'
    ).bind(newStatus, now, requestId).run();

    // Notify the requester
    const notifId = crypto.randomUUID().replace(/-/g, '');
    const title = action === 'accept' ? 'Money request accepted' : 'Money request declined';
    const content = action === 'accept'
      ? `@${sessionUser.username} accepted your request for $${Number(row.amount_usdc).toFixed(2)} USDC`
      : `@${sessionUser.username} declined your request for $${Number(row.amount_usdc).toFixed(2)} USDC`;
    await c.env.DB.prepare(
      'INSERT INTO notifications (id, user_id, type, title, content, data, created_at) VALUES (?, ?, \'money_request\', ?, ?, ?, ?)'
    ).bind(notifId, row.requester_id, title, content, null, now).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Respond to money request error:', error);
    return c.json({ success: false, error: 'Internal server error' }, 500);
  }
});

// ─── PROFILE EXTENSIONS ──────────────────────────────────────────────────────

// Extend PATCH /api/users/profile to accept new fields
// Note: The existing route at line ~361 needs to be modified to handle these fields
// We'll do that by reading and updating the existing route

export default app;
