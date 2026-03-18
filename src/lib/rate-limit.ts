import "server-only";
import type { NextRequest } from "next/server";

const store = new Map<string, { count: number; expiresAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 30; // 30 requests per minute per IP

/**
 * Returns false if the request should be rate limited.
 * Periodically cleans up the store to prevent memory leaks.
 */
export function checkRateLimit(req: NextRequest): boolean {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  
  const now = Date.now();
  
  // Occasional cleanup of expired records (probabilistic, ~1% of requests)
  if (Math.random() < 0.01) {
    for (const [key, record] of store.entries()) {
      if (record.expiresAt < now) store.delete(key);
    }
  }

  const record = store.get(ip);
  if (!record || record.expiresAt < now) {
    store.set(ip, { count: 1, expiresAt: now + WINDOW_MS });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
}
