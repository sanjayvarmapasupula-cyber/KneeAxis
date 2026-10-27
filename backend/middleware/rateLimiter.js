import { sendError } from "../utils/response.js";

const memoryStore = new Map();

// Periodic cleanup of expired rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Creates an in-memory rate limiter middleware.
 * @param {object} options
 * @param {number} options.windowMs - Time window in milliseconds (e.g. 15 * 60 * 1000)
 * @param {number} options.max - Maximum allowed requests in window
 * @param {string} options.message - Error message when rate limited
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 10,
  message = "Too many requests. Please try again later.",
}) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const key = `${req.baseUrl || ""}${req.path}_${ip}`;
    const now = Date.now();

    let record = memoryStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      memoryStore.set(key, record);
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      const remainingSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", remainingSec);
      return sendError(
        res,
        `${message} Please try again in ${remainingSec} seconds.`,
        null,
        429
      );
    }

    next();
  };
};

export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: "Too many sign-in attempts from this location.",
});

export const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: "Too many password reset inquiries.",
});
