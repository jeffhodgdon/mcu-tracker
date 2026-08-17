/**
 * Fixed-window rate limiter for the auth endpoints.
 *
 * Deliberately in-memory: state lives in a single Worker isolate, so the real
 * ceiling is "10 attempts per IP per window, per isolate" and the counter
 * resets whenever an isolate is recycled. That is a weaker guarantee than it
 * looks — it slows down casual brute force but is not a security boundary.
 * Moving to KV or a Durable Object would make it global; for a small user base
 * this is the agreed trade-off.
 */

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

/** ip -> { count, windowStart } */
const buckets = new Map();

// Bound the map so a flood of distinct IPs cannot grow it without limit.
const MAX_TRACKED_IPS = 10_000;

function prune(now) {
  for (const [ip, b] of buckets) {
    if (now - b.windowStart >= WINDOW_MS) buckets.delete(ip);
  }
}

export function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

/**
 * Records an attempt and reports whether it should be allowed.
 * Returns { allowed, remaining, retryAfterSeconds }.
 */
export function checkRateLimit(ip) {
  const now = Date.now();

  if (buckets.size > MAX_TRACKED_IPS) prune(now);

  let bucket = buckets.get(ip);
  if (!bucket || now - bucket.windowStart >= WINDOW_MS) {
    bucket = { count: 0, windowStart: now };
    buckets.set(ip, bucket);
  }

  bucket.count++;

  if (bucket.count > MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((bucket.windowStart + WINDOW_MS - now) / 1000)
    );
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - bucket.count, retryAfterSeconds: 0 };
}
