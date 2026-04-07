import { NextResponse } from "next/server";

type RateLimitOptions = {
  bucket: string;
  limit: number;
  windowMs: number;
  request: Request;
  userId?: string | null;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type GlobalStore = Map<string, RateLimitEntry>;

declare global {
  var __aiEasyLifeRateLimitStore: GlobalStore | undefined;
}

const getStore = () => {
  if (!globalThis.__aiEasyLifeRateLimitStore) {
    globalThis.__aiEasyLifeRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalThis.__aiEasyLifeRateLimitStore;
};

const getClientIp = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
};

const getIdentity = ({ request, userId }: Pick<RateLimitOptions, "request" | "userId">) => {
  if (userId) {
    return `user:${userId}`;
  }

  return `ip:${getClientIp(request)}`;
};

const cleanupExpiredEntries = (store: GlobalStore, now: number) => {
  if (store.size < 500) {
    return;
  }

  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
};

const buildRateLimitResponse = ({
  limit,
  remaining,
  resetAt,
}: {
  limit: number;
  remaining: number;
  resetAt: number;
}) => {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  const response = NextResponse.json(
    {
      error: "Слишком много запросов. Подождите немного и попробуйте снова.",
    },
    { status: 429 },
  );

  response.headers.set("Retry-After", String(retryAfterSeconds));
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  response.headers.set("X-RateLimit-Reset", new Date(resetAt).toISOString());
  return response;
};

export const enforceRateLimit = ({
  bucket,
  limit,
  windowMs,
  request,
  userId,
}: RateLimitOptions) => {
  const store = getStore();
  const now = Date.now();
  cleanupExpiredEntries(store, now);

  const identity = getIdentity({ request, userId });
  const key = `${bucket}:${identity}`;
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return null;
  }

  if (existing.count >= limit) {
    return buildRateLimitResponse({
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
    });
  }

  existing.count += 1;
  store.set(key, existing);
  return null;
};
