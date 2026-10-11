import { getDb } from '../lib/db.js';
import { requireAdmin } from '../lib/auth.js';
import { bad, clean, notAllowed, rateLimit, toId } from '../lib/http.js';
import { cleanImage, destroy } from '../lib/cloud.js';

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const col = db.collection('reviews');

    // ---- Public: list published reviews / admin: list everything
    if (req.method === 'GET') {
      try {
        const db = await getDb();
        const col = db.collection('reviews');
        if (req.query.all === '1') {
          if (!requireAdmin(req, res)) return;
          return res.json(await col.find().sort({ createdAt: -1 }).limit(500).toArray());
        }
        return res.json(await col.find({ status: 'published' }).sort({ createdAt: -1 }).limit(60).toArray());
      } catch (err) {
        console.warn('Reviews GET fallback:', err?.message);
        return res.json([]);
      }
    }

    // ---- Public: post a review (photo optional)
    if (req.method === 'POST') {
      const b = req.body || {};
      if (b.website) return res.json({ ok: true }); // honeypot: bots fill this in
      if (!rateLimit(req, res, 'review', 4, 60 * 60 * 1000)) return;

      const name = clean(b.name, 60);
      const content = clean(b.content, 1200);
      const rating = Number(b.rating);

      if (name.length < 2) return bad(res, 'Please enter your name.');
      if (content.length < 10) return bad(res, 'Please write a few words about your experience.');
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return bad(res, 'Please choose a star rating.');

      let image = null;
      if (b.image?.url) {
        image = cleanImage(b.image);
        if (!image || !image.publicId.startsWith('studio/reviews/')) return bad(res, 'That image could not be used.');
      }

      const settings = await db.collection('content').findOne({ _id: 'main' });
      const autoPublish = settings?.autoPublishReviews !== false;

      const doc = { name, content, rating, image, status: autoPublish ? 'published' : 'hidden', createdAt: new Date() };
      const r = await col.insertOne(doc);
      return res.status(201).json({ ok: true, published: autoPublish, id: r.insertedId });
    }

    // ---- Admin: publish / hide / delete
    if (req.method === 'PATCH' || req.method === 'DELETE') {
      if (!requireAdmin(req, res)) return;
      const id = toId(req.query.id);
      if (!id) return bad(res, 'Missing or invalid id.');

      if (req.method === 'PATCH') {
        const status = req.body?.status;
        if (!['published', 'hidden'].includes(status)) return bad(res, 'Invalid status.');
        await col.updateOne({ _id: id }, { $set: { status } });
        return res.json({ ok: true });
      }

      const existing = await col.findOne({ _id: id });
      if (existing?.image?.publicId) await destroy(existing.image.publicId);
      await col.deleteOne({ _id: id });
      return res.json({ ok: true });
    }

    return notAllowed(res, 'GET, POST, PATCH, DELETE');
  } catch (err) {
    console.error(err);
    bad(res, 'Something went wrong. Please try again.', 500);
  }
}
