
import { LRUCache } from "lru-cache";
import { NextResponse } from "next/server";

// Simple in-memory rate limiter using LRU Cache
// In a serverless environment like Vercel, this cache might reset frequently
// For production, use Redis (e.g., Upstash) to persist state across lambdas.
const rateLimit = new LRUCache({
  max: 500, // Max 500 unique IPs
  ttl: 60 * 1000, // 1 minute window
  allowStale: false,
});

export function checkRateLimit(ip: string) {
  const tokenCount = (rateLimit.get(ip) as number) || 0;
  const limit = 10; // 10 requests per minute

  if (tokenCount >= limit) {
    return false;
  }

  rateLimit.set(ip, tokenCount + 1);
  return true;
}

export function RateLimitMiddleware(req: Request) {
  // In Next.js middleware, obtaining IP can be tricky locally vs prod
  // Fallback to "unknown" if headers missing (local dev)
  const ip = req.headers.get("x-forwarded-for") || "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
  return null; // No error
}
