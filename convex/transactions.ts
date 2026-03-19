import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { requireUser } from './lib/auth';

export const record = mutation({
  args: {
    senderId: v.string(),
    senderAddress: v.string(),
    receiverId: v.optional(v.string()),
    receiverAddress: v.string(),
    amount: v.number(),
    currency: v.string(),
    type: v.union(v.literal('send'), v.literal('receive'), v.literal('bonus')),
    signature: v.string(),
    fee: v.number(),
    memo: v.optional(v.string()),
    category: v.optional(v.string()),
    narration: v.optional(v.string()),
    clientRef: v.optional(v.string()),
    displayAmount: v.optional(v.number()),
    displayCurrency: v.optional(v.string()),
    displaySymbol: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const now = Date.now();

    const txId = await ctx.db.insert('transactions', {
      type: args.type,
      from_user_id: args.senderId,
      to_user_id: args.receiverId,
      from_address: args.senderAddress,
      to_address: args.receiverAddress,
      from_name: undefined,
      to_name: undefined,
      from_username: undefined,
      to_username: undefined,
      from_avatar_base64: undefined,
      to_avatar_base64: undefined,
      amount_usdc: args.amount,
      amount_display: args.displayAmount ?? args.amount,
      currency: args.displayCurrency ?? args.currency,
      fee: args.fee,
      status: 'confirmed',
      tx_hash: args.signature,
      note: args.memo,
      narration: args.narration,
      category: args.category || 'transfer',
      gift_anonymous: undefined,
      gift_acknowledged: false,
      created_at: now,
      receipt_id: undefined,
      client_ref: args.clientRef,
      display_symbol: args.displaySymbol,
    });

    return { transactionId: txId };
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    const from = await ctx.db
      .query('transactions')
      .withIndex('by_from_user', (q: any) => q.eq('from_user_id', user.externalId))
      .collect();
    const to = await ctx.db
      .query('transactions')
      .withIndex('by_to_user', (q: any) => q.eq('to_user_id', user.externalId))
      .collect();
    const merged = new Map<string, any>();
    for (const item of [...from, ...to]) {
      merged.set(item._id, item);
    }
    return Array.from(merged.values()).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  },
});

export const acknowledgeGift = mutation({
  args: { transactionId: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const record = await ctx.db.get(args.transactionId as any);
    if (!record) throw new Error('Transaction not found');
    await ctx.db.patch(record._id, { gift_acknowledged: true });
    return { ok: true };
  },
});

export const linkReceipt = mutation({
  args: { transactionId: v.string(), storageId: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const record = await ctx.db.get(args.transactionId as any);
    if (!record) throw new Error('Transaction not found');
    await ctx.db.patch(record._id, { receipt_id: args.storageId });
    return { ok: true };
  },
});
