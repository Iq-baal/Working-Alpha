import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAdmin, requireUser } from './lib/auth';

export const send = mutation({
  args: {
    userId: v.optional(v.string()),
    role: v.union(v.literal('user'), v.literal('admin')),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (args.role === 'admin') {
      if (!user.isAdmin) throw new Error('Forbidden');
      if (!args.userId) throw new Error('Missing userId');
    }
    const targetUserId = args.userId || user.externalId;
    const id = await ctx.db.insert('supportMessages', {
      userId: targetUserId,
      role: args.role,
      content: args.content,
      read: args.role === 'admin',
      timestamp: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const listForUser = query({
  args: { userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const targetUserId = args.userId || user.externalId;
    if (targetUserId !== user.externalId && !user.isAdmin) throw new Error('Forbidden');
    return await ctx.db
      .query('supportMessages')
      .withIndex('by_user', (q: any) => q.eq('userId', targetUserId))
      .order('asc')
      .collect();
  },
});

export const adminInbox = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const messages = await ctx.db.query('supportMessages').collect();
    const threads = new Map<string, { userId: string; lastMessage: string; timestamp: number; unreadCount: number }>();

    for (const message of messages) {
      const existing = threads.get(message.userId);
      const unread = message.role === 'user' && !message.read ? 1 : 0;
      if (!existing || message.timestamp > existing.timestamp) {
        threads.set(message.userId, {
          userId: message.userId,
          lastMessage: message.content,
          timestamp: message.timestamp,
          unreadCount: (existing?.unreadCount || 0) + unread,
        });
      } else if (unread) {
        existing.unreadCount += unread;
      }
    }

    return Array.from(threads.values()).sort((a, b) => b.timestamp - a.timestamp);
  },
});

export const markRead = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const messages = await ctx.db
      .query('supportMessages')
      .withIndex('by_user', (q: any) => q.eq('userId', args.userId))
      .collect();
    for (const message of messages) {
      if (!message.read) {
        await ctx.db.patch(message._id, { read: true });
      }
    }
    return { ok: true };
  },
});
