import type { RequestHandler } from "express";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

/**
 * Lightweight in-memory rate limiter without external dependencies.
 * Automatically cleans up stale entries to prevent memory leaks.
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}): RequestHandler {
  const store = new Map<string, RateLimitRecord>();
  const { windowMs, max, message = "Too many requests. Please try again later." } = options;

  // Cleanup expired entries periodically (every 5 minutes)
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  timer.unref();

  return (req, res, next) => {
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const key = `${clientIp}:${req.baseUrl}${req.path}`;
    const now = Date.now();
    const record = store.get(key);

    if (!record || now > record.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      res.status(429).json({
        error: {
          code: "TOO_MANY_REQUESTS",
          message,
          retryAfter: retryAfterSeconds,
        },
      });
      return;
    }

    next();
  };
}

