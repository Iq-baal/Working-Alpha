import { Context } from 'hono';
import type { Env, User } from '../index';

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { user: User } }>, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const sessionKey = `session:${token}`;
  
  const sessionData = await c.env.SESSIONS.get(sessionKey);
  if (!sessionData) {
    return c.json({ success: false, error: 'Invalid or expired session' }, 401);
  }
  
  try {
    const session = JSON.parse(sessionData) as User;
    c.set('user', session);
    await next();
  } catch (e) {
    return c.json({ success: false, error: 'Invalid session data' }, 401);
  }
}
