// Creates the MongoDB indexes the site's queries rely on. Safe to re-run: indexes that already exist are kept.
// Usage: npm run db:indexes   (uses MONGODB_URI from .env.local)
import { MongoClient } from "mongodb";

const PLAN = {
  // Catalogue: live pieces newest first, by category, and the staff list.
  items: [[{ status: 1, createdAt: -1 }], [{ category: 1, createdAt: -1 }], [{ createdAt: -1 }]],
  // Enquiries page and the dashboard's 30-day counts. A draft is saved each time a customer opens the WhatsApp
  // sheet; drafts never continued to WhatsApp are hidden everywhere, so MongoDB clears them after a day.
  enquiries: [[{ opened: 1, createdAt: -1 }], [{ status: 1, createdAt: -1 }], [{ createdAt: 1 }, { expireAfterSeconds: 86400, partialFilterExpression: { opened: false } }]],
  // Sales log by date.
  sales: [[{ at: -1 }]],
  // better-auth's MongoDB adapter creates none of its own, so every sign-in check would scan the collection.
  user: [[{ email: 1 }, { unique: true }]],
  session: [[{ token: 1 }, { unique: true }], [{ userId: 1 }], [{ expiresAt: 1 }, { expireAfterSeconds: 0 }]], // expired sessions removed by MongoDB
  account: [[{ userId: 1 }], [{ providerId: 1, accountId: 1 }]],
  rateLimit: [[{ key: 1 }]],
};

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("prakashjewellers");
for (const [name, list] of Object.entries(PLAN)) {
  const made = await db.collection(name).createIndexes(list.map(([key, options]) => ({ key, ...options })));
  console.log(`${name}: ${made.join(", ")}`);
}
await client.close();
