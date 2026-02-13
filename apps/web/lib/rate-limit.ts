type Bucket = {
  count: number;
  resetAt: number;
};

const MAX_BUCKETS = 10_000;
const buckets = new Map<string, Bucket>();

function pruneExpired() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) {
      buckets.delete(key);
    }
  }
}

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) {
    pruneExpired();
  }

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

  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt
  };
}