export async function requireIdentity(ctx: { auth: { getUserIdentity: () => Promise<any> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error('Unauthenticated');
  if (!identity.subject) throw new Error('Missing auth subject');
  return identity;
}

export async function requireUser(ctx: { auth: { getUserIdentity: () => Promise<any> }; db: any }) {
  const identity = await requireIdentity(ctx);
  const user = await ctx.db
    .query('users')
    .withIndex('by_externalId', (q: any) => q.eq('externalId', identity.subject))
    .unique();
  if (!user) throw new Error('User not found');
  return { identity, user };
}

export async function requireAdmin(ctx: { auth: { getUserIdentity: () => Promise<any> }; db: any }) {
  const { user } = await requireUser(ctx);
  if (!user.isAdmin) throw new Error('Forbidden');
  return user;
}
