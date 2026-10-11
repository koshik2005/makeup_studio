import { getDb } from '../lib/db.js';
import { requireAdmin } from '../lib/auth.js';
import { defaultServices } from '../lib/defaults.js';
import { bad, clean, notAllowed, toId } from '../lib/http.js';
import { cleanImage, destroy } from '../lib/cloud.js';

function readImage(raw) {
  if (!raw) return { image: '', imagePublicId: '' };
  const img = cleanImage(raw);
  if (!img || !img.publicId.startsWith('studio/site/')) return null;
  return { image: img.url, imagePublicId: img.publicId };
}

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    const db = await getDb();
    const col = db.collection('services');

    if (req.method === 'GET') {
      return res.json(await col.find().sort({ order: 1, createdAt: 1 }).toArray());
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (b.seed) {
        if ((await col.countDocuments()) > 0) return bad(res, 'Services already exist.');
        const now = new Date();
        await col.insertMany(
          defaultServices.map((s, i) => ({ ...s, image: '', imagePublicId: '', order: i, createdAt: now }))
        );
        return res.status(201).json({ ok: true });
      }
      const title = clean(b.title, 80);
      if (!title) return bad(res, 'Please add a service title.');
      const img = readImage(b.image);
      if (!img) return bad(res, 'Invalid image.');
      const last = await col.find().sort({ order: -1 }).limit(1).toArray();
      const doc = {
        title,
        description: clean(b.description, 400),
        ...img,
        order: (last[0]?.order ?? -1) + 1,
        createdAt: new Date(),
      };
      const r = await col.insertOne(doc);
      return res.status(201).json({ ...doc, _id: r.insertedId });
    }

    const id = toId(req.query.id);
    if (!id) return bad(res, 'Missing or invalid id.');

    if (req.method === 'PUT') {
      const b = req.body || {};
      const existing = await col.findOne({ _id: id });
      if (!existing) return bad(res, 'Not found.', 404);
      const title = clean(b.title, 80);
      if (!title) return bad(res, 'Please add a service title.');
      const set = { title, description: clean(b.description, 400) };
      if ('image' in b) {
        const img = readImage(b.image);
        if (!img) return bad(res, 'Invalid image.');
        if (existing.imagePublicId && existing.imagePublicId !== img.imagePublicId) {
          await destroy(existing.imagePublicId);
        }
        Object.assign(set, img);
      }
      await col.updateOne({ _id: id }, { $set: set });
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const existing = await col.findOne({ _id: id });
      if (existing?.imagePublicId) await destroy(existing.imagePublicId);
      await col.deleteOne({ _id: id });
      return res.json({ ok: true });
    }

    return notAllowed(res, 'GET, POST, PUT, DELETE');
  } catch (err) {
    console.error(err);
    bad(res, 'Something went wrong.', 500);
  }
}
