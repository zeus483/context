type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return {
      ok: true,
      remaining: limit - 1,
      resetAt: now + windowMs
    };
  }

  existing.count += 1;
  buckets.set(key, existing);

  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt
  };
}
