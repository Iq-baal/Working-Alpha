import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireUser } from './lib/auth';

export const join = mutation({
  args: { name: v.string(), email: v.string(), businessType: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const existing = await ctx.db
      .query('waitlist')
      .withIndex('by_email', (q: any) => q.eq('email', args.email.toLowerCase()))
      .unique();
    if (existing) return { alreadyJoined: true };
    await ctx.db.insert('waitlist', {
      userId: user.externalId,
      name: args.name,
      email: args.email.toLowerCase(),
      businessType: args.businessType,
      createdAt: Date.now(),
    });
    return { alreadyJoined: false };
  },
});

export const getMine = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    if (!args.email) return null;
    return await ctx.db
      .query('waitlist')
      .withIndex('by_email', (q: any) => q.eq('email', args.email.toLowerCase()))
      .unique();
  },
});
