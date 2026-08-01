/**
 * In-memory per-key sliding-window rate limiter.
 *
 * Used to cap how often a single user can trigger expensive AI analysis jobs —
 * each trigger costs an OpenAI call, so without this a client could loop the
 * trigger mutation and drain the API budget / flood the Inngest queue.
 *
 * DEPLOYMENT NOTE: state lives in a single process's memory. On a multi-instance
 * or serverless deploy each instance keeps its own counter, so the effective
 * global limit becomes `limit * instanceCount`. For a hard global limit, swap
 * the `hits` store for a shared backend (e.g. Upstash Redis / `@upstash/ratelimit`)
 * behind the same `rateLimit()` signature — call sites don't change.
 */

export type RateLimitOptions = {
  /** Maximum number of allowed hits within the window. */
  limit: number;
  /** Rolling window length in milliseconds. */
  windowMs: number;
  /** Injectable clock for deterministic tests. Defaults to `Date.now()`. */
  now?: number;
};

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  /** Milliseconds until the caller may retry (0 while under the limit). */
  retryAfterMs: number;
};

// key -> ascending list of hit timestamps still inside the current window.
const hits = new Map<string, number[]>();

/**
 * Records a hit for `key` and reports whether it is allowed under the window.
 * A blocked hit is NOT recorded, so the window can drain and recover.
 */
export function rateLimit(
  key: string,
  { limit, windowMs, now = Date.now() }: RateLimitOptions,
): RateLimitResult {
  const windowStart = now - windowMs;
  const recent = (hits.get(key) ?? []).filter(
    (timestamp) => timestamp > windowStart,
  );

  if (recent.length >= limit) {
    // Keep the pruned list so a blocked key's memory stays bounded.
    hits.set(key, recent);
    const oldest = recent[0];
    return {
      success: false,
      limit,
      remaining: 0,
      retryAfterMs: Math.max(0, oldest + windowMs - now),
    };
  }

  recent.push(now);
  hits.set(key, recent);
  return {
    success: true,
    limit,
    remaining: limit - recent.length,
    retryAfterMs: 0,
  };
}

/**
 * Clears rate-limit state. Pass a `key` to reset a single bucket, or omit it to
 * clear everything (used to isolate tests).
 */
export function resetRateLimit(key?: string) {
  if (key === undefined) {
    hits.clear();
  } else {
    hits.delete(key);
  }
}
