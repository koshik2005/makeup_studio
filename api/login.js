import crypto from 'node:crypto';
import { signToken } from '../lib/auth.js';
import { bad, notAllowed, rateLimit } from '../lib/http.js';

const digest = (s) => crypto.createHash('sha256').update(String(s)).digest();

export default async function handler(req, res) {
  if (req.method !== 'POST') return notAllowed(res, 'POST');
  if (!process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
    return bad(res, 'Server is not configured: set ADMIN_PASSWORD and JWT_SECRET.', 500);
  }
  if (!rateLimit(req, res, 'login', 8, 15 * 60 * 1000)) return;

  const password = req.body?.password ?? '';
  const ok = crypto.timingSafeEqual(digest(password), digest(process.env.ADMIN_PASSWORD));
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600));
    return bad(res, 'Incorrect password.', 401);
  }
  res.json({ token: signToken() });
}
