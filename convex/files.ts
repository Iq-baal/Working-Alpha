import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireUser } from './lib/auth';

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveReceipt = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    await ctx.db.insert('receipts', {
      userId: user.externalId,
      storageId: args.storageId,
      createdAt: Date.now(),
    });
    return { storageId: args.storageId };
  },
});

export const getUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.storage.getUrl(args.storageId as any);
  },
});
