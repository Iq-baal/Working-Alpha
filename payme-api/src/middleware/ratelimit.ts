import { Context } from 'hono';
import type { Env } from '../index';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  signup: { maxRequests: 5, windowSeconds: 3600 }, // 5 per hour
  signin: { maxRequests: 10, windowSeconds: 900 }, // 10 per 15 minutes
};

export async function rateLimit(c: Context<{ Bindings: Env; Variables: Record<string, unknown> }>, endpoint: string) {
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0] || 'unknown';
  const key = `rl:${ip}:${endpoint}`;
  
  const config = RATE_LIMITS[endpoint];
  if (!config) return true; // No limit for this endpoint

  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSeconds;
  
  const existing = await c.env.RATELIMIT.get(key);
  let attempts: number[] = existing ? JSON.parse(existing) : [];
  
  // Filter to only attempts within the window
  attempts = attempts.filter(t => t > windowStart);
  
  if (attempts.length >= config.maxRequests) {
    return false; // Rate limited
  }
  
  // Add current attempt and store
  attempts.push(now);
  await c.env.RATELIMIT.put(key, JSON.stringify(attempts), { expirationTtl: config.windowSeconds });
  
  return true;
}

export function createRateLimitMiddleware(endpoint: string) {
  return async (c: Context<{ Bindings: Env; Variables: Record<string, unknown> }>, next: () => Promise<void>) => {
    const allowed = await rateLimit(c, endpoint);
    if (!allowed) {
      return c.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        429
      );
    }
    await next();
  };
}
