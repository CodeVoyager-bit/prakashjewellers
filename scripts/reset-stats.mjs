// Clears the visitor figures: each piece's views, cart adds and enquiry count, and the dashboard's daily totals.
// Enquiries, the sales log, products and settings are kept. Use it once before launch to drop test traffic.
// Usage: npm run stats:reset -- --yes
import { MongoClient } from "mongodb";

if (!process.argv.includes("--yes")) {
  console.error("This clears all visitor figures. Run: npm run stats:reset -- --yes");
  process.exit(1);
}
const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("prakashjewellers");
const items = await db.collection("items").updateMany({}, { $set: { views: 0, cartAdds: 0, enquiries: 0 } });
const days = await db.collection("stats").deleteMany({});
console.log(`Reset figures on ${items.modifiedCount} pieces and cleared ${days.deletedCount} days of totals.`);
await client.close();
