import { getDb } from '../lib/db.js';
import { defaultContent, defaultServices } from '../lib/defaults.js';
import { notAllowed } from '../lib/http.js';

// One public call that returns everything the single-page site needs.
export default async function handler(req, res) {
  if (req.method !== 'GET') return notAllowed(res, 'GET');

  try {
    const db = await getDb();
    const [doc, services, gallery, reviews, agg] = await Promise.all([
      db.collection('content').findOne({ _id: 'main' }),
      db.collection('services').find().sort({ order: 1, createdAt: 1 }).toArray(),
      db.collection('gallery').find().sort({ createdAt: -1 }).limit(150).toArray(),
      db
        .collection('reviews')
        .find({ status: 'published' })
        .sort({ createdAt: -1 })
        .limit(60)
        .toArray(),
      db
        .collection('reviews')
        .aggregate([
          { $match: { status: 'published' } },
          { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
        ])
        .toArray(),
    ]);

    const content = { ...defaultContent, ...(doc || {}) };
    delete content._id;
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
    res.json({
      content,
      services: services.length ? services : defaultServices,
      gallery,
      reviews,
      rating: { avg: agg[0]?.avg || 0, count: agg[0]?.count || 0 },
    });
  } catch (err) {
    console.error('site api error', err?.message);
    // Still render the site (with starter content) if the database isn't connected yet.
    res.json({
      content: defaultContent,
      services: defaultServices,
      gallery: [],
      reviews: [],
      rating: { avg: 0, count: 0 },
      offline: true,
    });
  }
}
