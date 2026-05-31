import { ApiError } from "@/lib/http";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function assertRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (bucket.count >= limit) {
    throw new ApiError(429, "Too many requests. Please wait and try again.", "RATE_LIMITED");
  }

  bucket.count += 1;
}
