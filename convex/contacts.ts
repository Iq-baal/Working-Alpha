import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireUser } from './lib/auth';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    return await ctx.db
      .query('contacts')
      .withIndex('by_user', (q: any) => q.eq('userId', user.externalId))
      .collect();
  },
});

export const addByHandle = mutation({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const normalized = args.handle.trim().toLowerCase().replace(/^@+/, '');
    if (!normalized) throw new Error('Enter a username or wallet address.');

    const byUsername = await ctx.db
      .query('users')
      .withIndex('by_username', (q: any) => q.eq('username', normalized))
      .unique();

    const byWallet = !byUsername
      ? await ctx.db
        .query('users')
        .withIndex('by_wallet', (q: any) => q.eq('walletAddress', normalized))
        .unique()
      : null;

    const target = byUsername || byWallet;
    if (!target) throw new Error('User not found');

    await ctx.db.insert('contacts', {
      userId: user.externalId,
      contactUserId: target.externalId,
      contactWallet: target.walletAddress,
      contactUsername: target.username,
      contactName: target.name,
      contactAvatarBase64: target.avatarBase64,
      contactVerificationLevel: target.verificationLevel,
      createdAt: Date.now(),
    });

    return { ok: true, contactType: byUsername ? 'username' : 'wallet' };
  },
});

export const remove = mutation({
  args: { contactId: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const record = await ctx.db.get(args.contactId as any);
    if (!record) return { ok: true };
    if (record.userId !== user.externalId) throw new Error('Forbidden');
    await ctx.db.delete(record._id);
    return { ok: true };
  },
});
