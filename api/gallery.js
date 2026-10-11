import { getDb } from '../lib/db.js';
import { requireAdmin } from '../lib/auth.js';
import { bad, clean, notAllowed, toId } from '../lib/http.js';
import { cleanImage, destroy } from '../lib/cloud.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    try {
      const db = await getDb();
      const col = db.collection('gallery');
      return res.json(await col.find().sort({ createdAt: -1 }).limit(500).toArray());
    } catch (err) {
      console.warn('Gallery GET fallback:', err?.message);
      return res.json([]);
    }
  }

  try {
    const db = await getDb();
    const col = db.collection('gallery');

    if (req.method === 'POST') {
      const b = req.body || {};
      const img = cleanImage(b);
      if (!img || !img.publicId.startsWith('studio/site/')) return bad(res, 'Invalid image.');
      const doc = {
        url: img.url,
        publicId: img.publicId,
        title: clean(b.title, 100),
        category: clean(b.category, 40) || 'Portfolio',
        createdAt: new Date(),
      };
      const r = await col.insertOne(doc);
      return res.status(201).json({ ...doc, _id: r.insertedId });
    }

    const id = toId(req.query.id);
    if (!id) return bad(res, 'Missing or invalid id.');

    if (req.method === 'PUT') {
      const b = req.body || {};
      await col.updateOne(
        { _id: id },
        { $set: { title: clean(b.title, 100), category: clean(b.category, 40) || 'Portfolio' } }
      );
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const existing = await col.findOne({ _id: id });
      if (existing?.publicId) await destroy(existing.publicId);
      await col.deleteOne({ _id: id });
      return res.json({ ok: true });
    }

    return notAllowed(res, 'GET, POST, PUT, DELETE');
  } catch (err) {
    console.error(err);
    bad(res, 'Something went wrong.', 500);
  }
}
