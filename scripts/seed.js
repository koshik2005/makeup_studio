import { MongoClient } from 'mongodb';
import fs from 'node:fs';

// Load .env.local or .env
function getEnv() {
  const envFile = fs.existsSync('.env.local') ? '.env.local' : '.env';
  const content = fs.readFileSync(envFile, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
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

async function seed() {
  console.log('Connecting to MongoDB Atlas...');
  await client.connect();
  const db = client.db(env.MONGODB_DB || 'makeup_studio');

  // 1. Content
  console.log('Seeding site content...');
  const siteContent = {
    _id: 'main',
    brandName: 'Vindhiya Vidhya Studio',
    tagline: 'Bridal Makeup · Custom Blouse Designing · Hand Embroidery',
    heroTitle: 'Beauty & Elegance, Crafted for Your Special Day',
    heroSubtitle: 'Luxury bridal makeovers, bespoke designer blouses, and intricate handcrafted aari work tailored to make you look and feel unforgettable.',
    heroImage: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=1200&q=80',
    heroImagePublicId: '',
    aboutTitle: "Hello, I'm Vindhiya Vidhya",
    aboutText: "With over 8 years of dedicated artistry in bridal makeup and couture blouse designing, I believe every bride deserves to radiate confidence and grace.\n\nFrom radiant dewy makeovers to traditional South Indian Muhurtham bridal transformations, each look is customized to your skin, style, and celebration.\n\nOur studio also specializes in bespoke bridal blouse stitching, intricate maggam/aari work, and perfect custom fitting to complete your wedding ensemble.",
    aboutImage: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1200&q=80',
    aboutImagePublicId: '',
    phone: '+91 98765 43210',
    whatsapp: '919876543210',
    email: 'vindhiyavidhya.studio@gmail.com',
    address: 'Anna Nagar, Chennai, Tamil Nadu',
    hours: 'Mon – Sat · 9:30 AM – 8:00 PM',
    instagramUrl: 'https://www.instagram.com/',
    instagramHandle: '@vindhiyavidhya_studio',
    stats: [
      { value: '500+', label: 'Happy Brides' },
      { value: '8+', label: 'Years Experience' },
      { value: '1200+', label: 'Blouses Designed' }
    ],
    autoPublishReviews: true
  };
  await db.collection('content').updateOne({ _id: 'main' }, { $set: siteContent }, { upsert: true });

  // 2. Services
  console.log('Seeding services...');
  const services = [
    {
      title: 'Luxury Bridal Makeup',
      description: 'Flawless HD/Airbrush bridal makeover including personalized skin prep, waterproof base, false lashes, premium hair styling, flower setting, and saree draping.',
      image: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=800&q=80',
      imagePublicId: '',
      order: 0,
      createdAt: new Date()
    },
    {
      title: 'Reception & Party Glam',
      description: 'Contemporary, dewy glam makeovers tailored for receptions, sangeets, engagements, and cocktail parties with trendy hair styling.',
      image: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
      imagePublicId: '',
      order: 1,
      createdAt: new Date()
    },
    {
      title: 'Bespoke Blouse Designing & Stitching',
      description: 'Custom-fit bridal blouses with precision pattern cutting, designer necklines, sweetheart backs, and padded lining tailored to perfection.',
      image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      imagePublicId: '',
      order: 2,
      createdAt: new Date()
    },
    {
      title: 'Hand Embroidery & Aari Work',
      description: 'Exquisite bridal aari embroidery, zardozi, kundan, pearl, antique beads, and cutwork handcrafted by master artisans.',
      image: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80',
      imagePublicId: '',
      order: 3,
      createdAt: new Date()
    },
    {
      title: 'Pre-Bridal Skincare & Trial',
      description: 'Comprehensive skin preparation consultation, complete makeup trial, brow shaping, and skin hydration before your wedding celebrations.',
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
      imagePublicId: '',
      order: 4,
      createdAt: new Date()
    },
    {
      title: 'Muhurtham Saree Draping',
      description: 'Traditional and contemporary saree draping (Kanchipuram silk, Banarasi, tissue) with neat pin-free pleats and pre-pleating services.',
      image: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
      imagePublicId: '',
      order: 5,
      createdAt: new Date()
    }
  ];
  await db.collection('services').deleteMany({});
  await db.collection('services').insertMany(services);

  // 3. Gallery
  console.log('Seeding gallery items...');
  const gallery = [
    {
      title: 'Muhurtham Traditional Bridal Look',
      category: 'Bridal Makeup',
      url: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=800&q=80',
      publicId: '',
      createdAt: new Date(Date.now() - 1000000)
    },
    {
      title: 'Dewy Reception Glam & Soft Waves',
      category: 'Bridal Makeup',
      url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
      publicId: '',
      createdAt: new Date(Date.now() - 2000000)
    },
    {
      title: 'Peacock Motif Antique Zardozi Blouse',
      category: 'Blouse Designs',
      url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      publicId: '',
      createdAt: new Date(Date.now() - 3000000)
    },
    {
      title: 'Velvet Floral Cutwork Blouse',
      category: 'Blouse Designs',
      url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
      publicId: '',
      createdAt: new Date(Date.now() - 4000000)
    },
    {
      title: 'Heavy Bridal Aari & Kundan Sleeve Work',
      category: 'Aari Work',
      url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80',
      publicId: '',
      createdAt: new Date(Date.now() - 5000000)
    },
    {
      title: 'Intricate Gold Thread Border Work',
      category: 'Aari Work',
      url: 'https://images.unsplash.com/photo-1610030469668-93530c17b58f?auto=format&fit=crop&w=800&q=80',
      publicId: '',
      createdAt: new Date(Date.now() - 6000000)
    },
    {
      title: 'Traditional Bridal Plait with Fresh Jasmine',
      category: 'Hairstyles',
      url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
      publicId: '',
      createdAt: new Date(Date.now() - 7000000)
    },
    {
      title: 'Textured Floral Updo for Engagement',
      category: 'Hairstyles',
      url: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&w=800&q=80',
      publicId: '',
      createdAt: new Date(Date.now() - 8000000)
    }
  ];
  await db.collection('gallery').deleteMany({});
  await db.collection('gallery').insertMany(gallery);

  // 4. Reviews
  console.log('Seeding reviews...');
  const reviews = [
    {
      name: 'Priyanka S.',
      rating: 5,
      content: 'Vindhiya did my bridal makeup for both Muhurtham and Reception. The makeup stayed completely fresh and sweat-proof for 12 hours! Every single guest praised my natural glow and eye makeup. Absolutely the best decision!',
      status: 'published',
      image: null,
      createdAt: new Date(Date.now() - 3 * 86400000)
    },
    {
      name: 'Ananya Ramesh',
      rating: 5,
      content: 'The aari work on my wedding blouse was pure perfection! The fit, finishing, and embroidery exceeded all my expectations. Delivered right on time before my big day.',
      status: 'published',
      image: null,
      createdAt: new Date(Date.now() - 7 * 86400000)
    },
    {
      name: 'Deepika Murugan',
      rating: 5,
      content: 'Extremely professional and polite. She listened carefully to what look I wanted and customized the hair flowers beautifully. The saree pleats stayed intact all day.',
      status: 'published',
      image: null,
      createdAt: new Date(Date.now() - 14 * 86400000)
    },
    {
      name: 'Meera Krishnan',
      rating: 5,
      content: 'Booked her for my sister’s engagement makeup. Flawless skin work and gorgeous open-hair styling. Everyone asked for her contact details!',
      status: 'published',
      image: null,
      createdAt: new Date(Date.now() - 21 * 86400000)
    },
    {
      name: 'Kavitha N.',
      rating: 5,
      content: 'Loved the blouse designing and maggam embroidery. Premium quality work and prompt service.',
      status: 'hidden',
      image: null,
      createdAt: new Date(Date.now() - 1 * 86400000)
    }
  ];
  await db.collection('reviews').deleteMany({});
  await db.collection('reviews').insertMany(reviews);

  // 5. Messages
  console.log('Seeding messages...');
  const messages = [
    {
      name: 'Sneha Reddy',
      phone: '+91 98412 34567',
      service: 'Luxury Bridal Makeup',
      message: 'Hi Vindhiya, I have my wedding on November 28th in Chennai. Are you available for Muhurtham (morning) and Reception (evening)? Would love to discuss packages.',
      read: false,
      createdAt: new Date(Date.now() - 2 * 3600000)
    },
    {
      name: 'Divya Bharathi',
      phone: '+91 97890 12345',
      service: 'Hand Embroidery & Aari Work',
      message: 'Hello! I have two Kanchipuram silk saree blouses that need heavy peacock aari work for my engagement. Can I visit your studio this Saturday for fabric and measurement?',
      read: false,
      createdAt: new Date(Date.now() - 12 * 3600000)
    },
    {
      name: 'Harini Sundaram',
      phone: '+91 99623 88990',
      service: 'Reception & Party Glam',
      message: 'Looking for reception makeover and soft curls hair styling on December 15th. Please let me know your availability and rates.',
      read: true,
      createdAt: new Date(Date.now() - 48 * 3600000)
    }
  ];
  await db.collection('messages').deleteMany({});
  await db.collection('messages').insertMany(messages);

  console.log('\n--- SUCCESS! ALL DATA SEEDED TO MONGODB ATLAS ---');
  console.log(`- Site Content: Updated`);
  console.log(`- Services: ${services.length} services added`);
  console.log(`- Gallery: ${gallery.length} items added`);
  console.log(`- Reviews: ${reviews.length} reviews added (4 published, 1 hidden)`);
  console.log(`- Messages: ${messages.length} customer messages added (2 unread, 1 read)\n`);

  await client.close();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
