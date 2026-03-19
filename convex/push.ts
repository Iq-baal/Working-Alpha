import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { requireUser } from './lib/auth';

export const upsert = mutation({
  args: {
    userId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    prefs: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (user.externalId !== args.userId && !user.isAdmin) throw new Error('Forbidden');

    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q: any) => q.eq('endpoint', args.endpoint))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: args.userId,
        p256dh: args.p256dh,
        auth: args.auth,
        prefs: args.prefs,
        userAgent: args.userAgent,
      });
      return { ok: true };
    }

    await ctx.db.insert('pushSubscriptions', {
      userId: args.userId,
      endpoint: args.endpoint,
      p256dh: args.p256dh,
      auth: args.auth,
      prefs: args.prefs,
      userAgent: args.userAgent,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});

export const updatePrefs = mutation({
  args: { userId: v.string(), endpoint: v.string(), prefs: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (user.externalId !== args.userId && !user.isAdmin) throw new Error('Forbidden');
    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q: any) => q.eq('endpoint', args.endpoint))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { prefs: args.prefs });
    }
    return { ok: true };
  },
});

export const remove = mutation({
  args: { userId: v.string(), endpoint: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    if (user.externalId !== args.userId && !user.isAdmin) throw new Error('Forbidden');
    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q: any) => q.eq('endpoint', args.endpoint))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return { ok: true };
  },
});
