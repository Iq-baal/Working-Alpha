import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { requireUser } from './lib/auth';

export const startAirdrop = mutation({
  args: {
    mode: v.union(v.literal('random'), v.literal('specific')),
    amount: v.number(),
    recipientsCount: v.number(),
    recipients: v.optional(v.array(v.string())),
    maxEligibleBalance: v.optional(v.number()),
    durationValue: v.number(),
    durationUnit: v.union(v.literal('minutes'), v.literal('hours'), v.literal('days')),
    perDayAmount: v.optional(v.number()),
    anonymous: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return { ok: true };
  },
});
