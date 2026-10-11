import { ObjectId } from 'mongodb';

export const clean = (v, max = 500) =>
  String(v ?? '')
    .replace(/\r/g, '')
    .trim()
    .slice(0, max);

export const toId = (id) => (id && ObjectId.isValid(id) ? new ObjectId(id) : null);

export const bad = (res, message, code = 400) => res.status(code).json({ error: message });

export const notAllowed = (res, allow) => {
  res.setHeader('Allow', allow);
  return bad(res, 'Method not allowed', 405);
};

// Best-effort, per-instance rate limiting (good enough to blunt casual spam).
const buckets = new Map();
export function rateLimit(req, res, key, max = 5, windowMs = 10 * 60 * 1000) {
  const ip =
    String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  const k = `${key}:${ip}`;
  const now = Date.now();
  const hits = (buckets.get(k) || []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    res.status(429).json({ error: 'Too many attempts. Please try again in a little while.' });
    return false;
  }
  hits.push(now);
  buckets.set(k, hits);
  if (buckets.size > 5000) buckets.clear();
  return true;
}
