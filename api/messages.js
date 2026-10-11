import { getDb } from '../lib/db.js';
import { requireAdmin } from '../lib/auth.js';
import { bad, clean, notAllowed, rateLimit, toId } from '../lib/http.js';

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const col = db.collection('messages');

    // ---- Public: contact form
    if (req.method === 'POST') {
      const b = req.body || {};
      if (b.website) return res.json({ ok: true }); // honeypot
      if (!rateLimit(req, res, 'message', 5, 60 * 60 * 1000)) return;

      const name = clean(b.name, 80);
      const phone = clean(b.phone, 30);
      const message = clean(b.message, 1500);
      if (name.length < 2) return bad(res, 'Please enter your name.');
      if (phone.replace(/\D/g, '').length < 7) return bad(res, 'Please enter a valid phone number.');
      if (message.length < 5) return bad(res, 'Please tell me a little about what you need.');

      await col.insertOne({
        name,
        phone,
        service: clean(b.service, 80),
        message,
        read: false,
        createdAt: new Date(),
      });
      return res.status(201).json({ ok: true });
    }

    // ---- Admin only below
    if (!requireAdmin(req, res)) return;

    if (req.method === 'GET') {
      try {
        return res.json(await col.find().sort({ createdAt: -1 }).limit(300).toArray());
      } catch (err) {
        console.warn('Messages GET fallback:', err?.message);
        return res.json([]);
      }
    }

    const id = toId(req.query.id);
    if (!id) return bad(res, 'Missing or invalid id.');

    if (req.method === 'PATCH') {
      await col.updateOne({ _id: id }, { $set: { read: !!req.body?.read } });
      return res.json({ ok: true });
    }
    if (req.method === 'DELETE') {
      await col.deleteOne({ _id: id });
      return res.json({ ok: true });
    }

    return notAllowed(res, 'GET, POST, PATCH, DELETE');
  } catch (err) {
    console.error(err);
    bad(res, 'Something went wrong. Please try again.', 500);
  }
}
