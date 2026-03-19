import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAdmin, requireIdentity, requireUser } from './lib/auth';

const USERNAME_RE = /^[a-z0-9_]+$/;

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/^@+/, '');
}

function extractEmail(claims: Record<string, any>) {
  if (typeof claims.email === 'string') return claims.email;
  return undefined;
}

function extractWalletAddress(claims: Record<string, any>) {
  const creds = Array.isArray(claims.verified_credentials)
    ? claims.verified_credentials
    : Array.isArray(claims.verifiedCredentials)
      ? claims.verifiedCredentials
      : [];
  for (const cred of creds) {
    if (cred?.chain === 'solana' && typeof cred?.address === 'string') {
      return cred.address;
    }
  }
  return undefined;
}

async function getUserByExternalId(ctx: any, externalId: string) {
  return await ctx.db
    .query('users')
    .withIndex('by_externalId', (q: any) => q.eq('externalId', externalId))
    .unique();
}

export const ensureUser = mutation({
  args: {
    email: v.optional(v.string()),
    walletAddress: v.optional(v.string()),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const now = Date.now();
    const claims = (identity as any).claims || {};

    const email = args.email || extractEmail(claims);
    const walletAddress = args.walletAddress || extractWalletAddress(claims);
    const name = args.name || (typeof claims.name === 'string' ? claims.name : undefined);

    let user = await getUserByExternalId(ctx, identity.subject);
    if (!user) {
      const id = await ctx.db.insert('users', {
        externalId: identity.subject,
        email,
        name,
        username: undefined,
        usernameClaimed: false,
        walletAddress,
        avatarBase64: undefined,
        occupation: undefined,
        isAdmin: false,
        isGated: true,
        canRefer: false,
        bonusClaimed: false,
        verificationLevel: 0,
        invitedBy: undefined,
        inviteCount: 0,
        createdAt: now,
        lastSeen: now,
      });
      user = await ctx.db.get(id);
    } else {
      const patch: Record<string, any> = { lastSeen: now };
      if (email && !user.email) patch.email = email;
      if (name && !user.name) patch.name = name;
      if (walletAddress && !user.walletAddress) patch.walletAddress = walletAddress;
      await ctx.db.patch(user._id, patch);
      user = await ctx.db.get(user._id);
    }

    return { id: user?._id, externalId: identity.subject };
  },
});

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    return await getUserByExternalId(ctx, identity.subject);
  },
});

export const checkUsernameAvailability = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const normalized = normalizeUsername(args.username);
    if (!normalized || normalized.length < 3 || !USERNAME_RE.test(normalized)) {
      return { available: false, reason: 'invalid' } as const;
    }
    const existing = await ctx.db
      .query('users')
      .withIndex('by_username', (q: any) => q.eq('username', normalized))
      .unique();
    if (!existing) return { available: true } as const;
    if (existing.externalId === identity.subject) {
      return { available: true, ownedByUser: true } as const;
    }
    return { available: false } as const;
  },
});

export const claimUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const normalized = normalizeUsername(args.username);
    if (!normalized || normalized.length < 3) throw new Error('Username must be at least 3 characters.');
    if (!USERNAME_RE.test(normalized)) throw new Error('Username can only contain lowercase letters, numbers, and underscores.');
    if (normalized === user.externalId.toLowerCase()) throw new Error('Pick a different username.');

    const existing = await ctx.db
      .query('users')
      .withIndex('by_username', (q: any) => q.eq('username', normalized))
      .unique();
    if (existing && existing._id !== user._id) throw new Error('Username is already taken.');

    await ctx.db.patch(user._id, {
      username: normalized,
      usernameClaimed: true,
    });
    return await ctx.db.get(user._id);
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    occupation: v.optional(v.string()),
    avatarBase64: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const patch: Record<string, any> = {};

    if (args.name !== undefined) patch.name = args.name || undefined;
    if (args.occupation !== undefined) patch.occupation = args.occupation || undefined;
    if (args.avatarBase64 !== undefined) patch.avatarBase64 = args.avatarBase64 || undefined;

    if (args.username !== undefined) {
      const normalized = normalizeUsername(args.username);
      if (!normalized || normalized.length < 3) throw new Error('Username must be at least 3 characters.');
      if (!USERNAME_RE.test(normalized)) throw new Error('Username can only contain lowercase letters, numbers, and underscores.');
      const existing = await ctx.db
        .query('users')
        .withIndex('by_username', (q: any) => q.eq('username', normalized))
        .unique();
      if (existing && existing._id !== user._id) throw new Error('Username is already taken.');
      patch.username = normalized;
      patch.usernameClaimed = true;
    }

    if (Object.keys(patch).length === 0) return user;
    await ctx.db.patch(user._id, patch);
    return await ctx.db.get(user._id);
  },
});

export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    const normalized = args.query.trim().toLowerCase().replace(/^@+/, '');
    if (normalized.length < 2) return [];

    const all = await ctx.db.query('users').collect();
    return all.filter((user: any) => {
      const username = (user.username || '').toLowerCase();
      const name = (user.name || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const wallet = (user.walletAddress || '').toLowerCase();
      return username.includes(normalized) || name.includes(normalized) || email.includes(normalized) || wallet.includes(normalized);
    }).slice(0, 10);
  },
});

export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query('users').order('desc').collect();
  },
});

export const toggleUserPriority = mutation({
  args: { userId: v.string(), field: v.union(v.literal('isGated'), v.literal('canRefer')), value: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId as any);
    if (!user) throw new Error('User not found');
    await ctx.db.patch(user._id, { [args.field]: args.value });
  },
});

export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    await ctx.db.delete(user._id);
    return { deleted: true };
  },
});

export const claimBonus = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    await ctx.db.patch(user._id, { bonusClaimed: true });
    return { success: true };
  },
});

export const getMyReferrals = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    return await ctx.db
      .query('users')
      .withIndex('by_invitedBy', (q: any) => q.eq('invitedBy', user._id))
      .collect();
  },
});

export const validateInviteCode = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const code = args.code.trim().toUpperCase();

    if (!code) throw new Error('INVALID_CODE');

    if (code === 'PRIVATE TESTER') {
      await ctx.db.patch(user._id, { isGated: false, canRefer: true });
      return { success: true };
    }

    const inviter = await ctx.db
      .query('users')
      .withIndex('by_username', (q: any) => q.eq('username', code.toLowerCase()))
      .unique();

    if (!inviter) throw new Error('INVALID_CODE');

    const inviteCount = inviter.inviteCount || 0;
    if (inviteCount >= 3) throw new Error('MAX_REACHED');

    await ctx.db.patch(inviter._id, { inviteCount: inviteCount + 1 });
    await ctx.db.patch(user._id, { isGated: false, invitedBy: inviter._id, canRefer: true });

    return { success: true, inviterId: inviter._id };
  },
});
