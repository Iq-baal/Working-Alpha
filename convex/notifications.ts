import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAdmin, requireUser } from './lib/auth';

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    return await ctx.db
      .query('notifications')
      .withIndex('by_user', (q: any) => q.eq('userId', user.externalId))
      .order('desc')
      .collect();
  },
});

export const markRead = mutation({
  args: { notificationId: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const record = await ctx.db.get(args.notificationId as any);
    if (!record) throw new Error('Notification not found');
    if (record.userId !== user.externalId && !user.isAdmin) throw new Error('Forbidden');
    await ctx.db.patch(record._id, { read: true });
    return { ok: true };
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    content: v.string(),
    type: v.string(),
    data: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (args.userId !== user.externalId && !user.isAdmin) throw new Error('Forbidden');
    const id = await ctx.db.insert('notifications', {
      userId: args.userId,
      title: args.title,
      content: args.content,
      type: args.type,
      data: args.data,
      read: false,
      created_at: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const broadcast = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query('users').collect();
    let sent = 0;
    for (const target of users) {
      await ctx.db.insert('notifications', {
        userId: target.externalId,
        title: args.title,
        content: args.content,
        type: args.type || 'system',
        data: undefined,
        read: false,
        created_at: Date.now(),
      });
      sent += 1;
    }
    return { sent, total: users.length };
  },
});

export const requestMoney = mutation({
  args: {
    target: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
    displayAmount: v.optional(v.number()),
    displayCurrency: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const normalized = args.target.trim().toLowerCase().replace(/^@+/, '');
    if (!normalized) throw new Error('Missing target');

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
    if (!target) throw new Error('Recipient not found');

    const title = 'Payment Request';
    const content = args.note
      ? `${args.note} · ${args.displayAmount ?? args.amount} ${args.displayCurrency ?? 'USDC'}`
      : `Requested ${args.displayAmount ?? args.amount} ${args.displayCurrency ?? 'USDC'}`;

    await ctx.db.insert('notifications', {
      userId: target.externalId,
      title,
      content,
      type: 'request',
      data: {
        requesterId: user.externalId,
        amount: args.amount,
        displayAmount: args.displayAmount ?? args.amount,
        displayCurrency: args.displayCurrency ?? 'USDC',
        note: args.note,
      },
      read: false,
      created_at: Date.now(),
    });

    return { ok: true };
  },
});
