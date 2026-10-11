import { MongoClient } from 'mongodb';
import fs from 'node:fs';
import { defaultContent, defaultServices } from '../lib/defaults.js';

// Load .env.local or .env
function getEnv() {
  const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
  const content = fs.readFileSync(envFile, 'utf-8');
  const env = {};
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  });
  return env;
}

const env = getEnv();
const client = new MongoClient(env.MONGODB_URI);

async function seedDefaults() {
  console.log('Connecting to MongoDB Atlas...');
  await client.connect();
  const db = client.db(env.MONGODB_DB || 'makeup_studio');

  // 1. Set exact default content from lib/defaults.js
  console.log('Pushing defaultContent to content collection...');
  await db.collection('content').updateOne(
    { _id: 'main' },
    { $set: { ...defaultContent } },
    { upsert: true }
  );

  // 2. Set exact default services from lib/defaults.js
  console.log('Pushing defaultServices to services collection...');
  await db.collection('services').deleteMany({});
  const now = new Date();
  await db.collection('services').insertMany(
    defaultServices.map((s, i) => ({
      ...s,
      image: '',
      imagePublicId: '',
      order: i,
      createdAt: now,
    }))
  );

  // 3. Clear gallery, reviews, messages to default empty state
  console.log('Resetting gallery, reviews, and messages to clean default state...');
  await db.collection('gallery').deleteMany({});
  await db.collection('reviews').deleteMany({});
  await db.collection('messages').deleteMany({});

  console.log('\n--- SUCCESS: EXACT DEFAULT DATA WRITTEN TO DATABASE ---');
  console.log('✓ Content: Set to defaultContent (Glow & Grace, default text, default contact)');
  console.log(`✓ Services: ${defaultServices.length} default services added from lib/defaults.js`);
  console.log('✓ Gallery: Clean (0 items, ready for admin uploads)');
  console.log('✓ Reviews: Clean (0 items, ready for client reviews)');
  console.log('✓ Messages: Clean (0 items, ready for client inquiries)\n');

  await client.close();
}

seedDefaults().catch((err) => {
  console.error('Error seeding default data:', err);
  process.exit(1);
});
