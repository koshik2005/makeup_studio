import cloudinary from '../lib/cloud.js';
import { requireAdmin } from '../lib/auth.js';
import { bad, notAllowed, rateLimit } from '../lib/http.js';

// Returns a short-lived signature so the browser can upload straight to Cloudinary
// (keeps big images off the serverless function and the API secret on the server).
export default async function handler(req, res) {
  if (req.method !== 'POST') return notAllowed(res, 'POST');
  if (!process.env.CLOUDINARY_API_SECRET) return bad(res, 'Cloudinary is not configured.', 500);

  const admin = req.body?.scope === 'admin';
  if (admin) {
    if (!requireAdmin(req, res)) return;
  } else if (!rateLimit(req, res, 'sign', 10, 10 * 60 * 1000)) {
    return;
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = admin ? 'studio/site' : 'studio/reviews';
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, process.env.CLOUDINARY_API_SECRET);

  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature,
  });
}
