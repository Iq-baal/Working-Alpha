import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  users: defineTable({
    externalId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    username: v.optional(v.string()),
    usernameClaimed: v.boolean(),
    walletAddress: v.optional(v.string()),
    avatarBase64: v.optional(v.string()),
    occupation: v.optional(v.string()),
    isAdmin: v.boolean(),
    isGated: v.boolean(),
    canRefer: v.boolean(),
    bonusClaimed: v.boolean(),
    verificationLevel: v.number(),
    invitedBy: v.optional(v.string()),
    inviteCount: v.number(),
    createdAt: v.number(),
    lastSeen: v.number(),
  })
    .index('by_externalId', ['externalId'])
    .index('by_username', ['username'])
    .index('by_wallet', ['walletAddress'])
    .index('by_invitedBy', ['invitedBy']),

  transactions: defineTable({
    type: v.union(v.literal('send'), v.literal('receive'), v.literal('bonus')),
    from_user_id: v.optional(v.string()),
    to_user_id: v.optional(v.string()),
    from_address: v.string(),
    to_address: v.string(),
    from_name: v.optional(v.string()),
    to_name: v.optional(v.string()),
    from_username: v.optional(v.string()),
    to_username: v.optional(v.string()),
    from_avatar_base64: v.optional(v.string()),
    to_avatar_base64: v.optional(v.string()),
    amount_usdc: v.number(),
    amount_display: v.number(),
    currency: v.string(),
    fee: v.number(),
    status: v.union(v.literal('pending'), v.literal('confirmed'), v.literal('failed')),
    tx_hash: v.optional(v.string()),
    note: v.optional(v.string()),
    narration: v.optional(v.string()),
    category: v.string(),
    gift_anonymous: v.optional(v.boolean()),
    gift_acknowledged: v.optional(v.boolean()),
    created_at: v.number(),
    receipt_id: v.optional(v.string()),
    client_ref: v.optional(v.string()),
    display_symbol: v.optional(v.string()),
  })
    .index('by_from_user', ['from_user_id'])
    .index('by_to_user', ['to_user_id'])
    .index('by_tx_hash', ['tx_hash']),

  notifications: defineTable({
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    data: v.optional(v.any()),
    read: v.boolean(),
    created_at: v.number(),
  }).index('by_user', ['userId']),

  contacts: defineTable({
    userId: v.string(),
    contactUserId: v.optional(v.string()),
    contactWallet: v.optional(v.string()),
    contactUsername: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactAvatarBase64: v.optional(v.string()),
    contactVerificationLevel: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_contact_user', ['contactUserId']),

  supportMessages: defineTable({
    userId: v.string(),
    role: v.union(v.literal('user'), v.literal('admin')),
    content: v.string(),
    read: v.boolean(),
    timestamp: v.number(),
  }).index('by_user', ['userId']),

  systemConfig: defineTable({
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),

  waitlist: defineTable({
    userId: v.string(),
    name: v.string(),
    email: v.string(),
    businessType: v.string(),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_email', ['email']),

  receipts: defineTable({
    userId: v.string(),
    storageId: v.string(),
    createdAt: v.number(),
  })
    .index('by_storage', ['storageId'])
    .index('by_user', ['userId']),

  pushSubscriptions: defineTable({
    userId: v.string(),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    userAgent: v.optional(v.string()),
    prefs: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_endpoint', ['endpoint']),

});
