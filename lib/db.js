import { MongoClient } from 'mongodb';

// Reuse the connection between serverless invocations.
const cache = globalThis._mongoCache || (globalThis._mongoCache = { client: null, promise: null });

export async function getDb() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  if (!cache.promise) {
    cache.client = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5 });
    cache.promise = cache.client.connect().catch((err) => {
      cache.promise = null;
      throw err;
    });
  }
  await cache.promise;
  return cache.client.db(process.env.MONGODB_DB || 'makeup_studio');
}
