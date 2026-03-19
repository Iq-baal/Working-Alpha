import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireAdmin } from './lib/auth';

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query('systemConfig')
      .withIndex('by_key', (q: any) => q.eq('key', args.key))
      .unique();
    return record || null;
  },
});

export const update = mutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query('systemConfig')
      .withIndex('by_key', (q: any) => q.eq('key', args.key))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.value, updatedAt: Date.now() });
      return existing._id;
    }
    return await ctx.db.insert('systemConfig', {
      key: args.key,
      value: args.value,
      updatedAt: Date.now(),
    });
  },
});
