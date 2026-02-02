
import { NextResponse } from "next/server";
import { RateLimitMiddleware } from "./utils/rate-limit";

export function middleware(req: Request) {
  // Only limit API routes
  if (req.url.includes("/api/")) {
    const res = RateLimitMiddleware(req);
    if (res) return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
