import { getDb } from '../lib/db.js';
import { requireAdmin } from '../lib/auth.js';
import { defaultContent } from '../lib/defaults.js';
import { bad, clean, notAllowed } from '../lib/http.js';
import { cleanImage, destroy } from '../lib/cloud.js';

const TEXT_LIMITS = {
  brandName: 60,
  tagline: 120,
  heroTitle: 160,
  heroSubtitle: 400,
  aboutTitle: 120,
  aboutText: 2500,
  phone: 40,
  email: 120,
  address: 200,
  hours: 120,
  instagramHandle: 60,
};

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === 'GET') {
    try {
      const db = await getDb();
      const current = await db.collection('content').findOne({ _id: 'main' });
      const content = { ...defaultContent, ...(current || {}) };
      delete content._id;
      return res.json(content);
    } catch (err) {
      console.warn('Content GET fallback to defaultContent:', err?.message);
      return res.json(defaultContent);
    }
  }

  try {
    const db = await getDb();
    const col = db.collection('content');
    const current = await col.findOne({ _id: 'main' });

    if (req.method === 'PUT') {
      const b = req.body || {};
      const set = {};

      for (const [key, max] of Object.entries(TEXT_LIMITS)) {
        if (key in b) set[key] = clean(b[key], max);
      }
      if ('whatsapp' in b) set.whatsapp = String(b.whatsapp || '').replace(/\D/g, '').slice(0, 15);
      if ('instagramUrl' in b) {
        const url = clean(b.instagramUrl, 200);
        if (url && !/^https:\/\//i.test(url)) return bad(res, 'Instagram link must start with https://');
        set.instagramUrl = url;
      }
      if ('autoPublishReviews' in b) set.autoPublishReviews = !!b.autoPublishReviews;
      if (Array.isArray(b.stats)) {
        set.stats = b.stats
          .slice(0, 4)
          .map((s) => ({ value: clean(s?.value, 20), label: clean(s?.label, 40) }))
          .filter((s) => s.value || s.label);
      }

      for (const key of ['heroImage', 'aboutImage']) {
        if (!(key in b)) continue;
        const img = b[key] ? cleanImage(b[key]) : null;
        if (b[key] && !img) return bad(res, 'Invalid image.');
        const oldPid = current?.[`${key}PublicId`];
        if (oldPid && oldPid !== img?.publicId) await destroy(oldPid);
        set[key] = img?.url || '';
        set[`${key}PublicId`] = img?.publicId || '';
      }

      await col.updateOne({ _id: 'main' }, { $set: set }, { upsert: true });
      return res.json({ ok: true });
    }

    return notAllowed(res, 'GET, PUT');
  } catch (err) {
    console.error(err);
    bad(res, 'Something went wrong while saving.', 500);
  }
}
