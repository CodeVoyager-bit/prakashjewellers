// Sample catalogue for the client demo. Remove it before go-live.
// npm run demo:add     loads the items (photos are free Unsplash images copied into Cloudinary)
// npm run demo:remove  deletes every sample item, its photos and enquiries, even ones edited in admin
import { MongoClient } from "mongodb";
import { sign } from "../lib/cloudinary.mjs";
import { nextCode, nextPiece } from "../lib/codes.mjs";

const DEMO_RATE = 13750; // 22K ₹/g, close to mid-2026 rates; only set if the store hasn't set one
const unsplash = (id) => `https://images.unsplash.com/${id}?fm=jpg&q=85&w=1600&fit=max`;

// First entry shows first in the catalogue. `weights` lists each physical piece of the design:
// the jhumkas show two pieces of one design with different weights, as real stock arrives.
const ITEMS = [
  { name: "Bridal Necklace & Earring Set", category: "Necklace Sets", weights: [52.4], making: 12, qty: 1, featured: true, photo: "photo-1758995115857-2de1eb6283d0",
    description: "A full bridal set: layered necklace with matching earrings, finished by hand.",
    finish: "Filigree", occasion: "Wedding, reception", includes: "Necklace and earrings" },
  { name: "Kundan Choker Set", category: "Necklace Sets", weights: [38.6], netWeight: 34.2, extraCharge: 4500, extraLabel: "Kundan and stone setting", making: 14, qty: 1, photo: "photo-1640183298005-3a4497cc6a37",
    description: "Choker and earrings with kundan setting, made for weddings and festive wear.",
    stones: "Kundan, pearls", occasion: "Wedding, festive", includes: "Choker and earrings" },
  { name: "Ruby Kundan Necklace", category: "Necklaces", weights: [34.5], netWeight: 31, extraCharge: 3200, extraLabel: "Stone setting", making: 14, qty: 1, featured: true, photo: "photo-1724594963412-d98c3cd9eab6",
    description: "Kundan necklace with ruby-red and green stones and pearl drops.",
    stones: "Ruby-red and green stones, pearls", finish: "Kundan", occasion: "Festive" },
  { name: "Antique Bead Haram", category: "Necklaces", weights: [64.2], making: 12, qty: 0, photo: "photo-1758995115518-26f90aa61b97",
    description: "Long haram with antique-finish gold beads. This piece is sold; the store can make another.",
    finish: "Antique", occasion: "Bridal, festive" },
  { name: "Carved Floral Bangles, Set of 4", category: "Bangles", weights: [46.8], making: null, qty: 2, photo: "photo-1758995116383-f51775896add",
    description: "Four bangles with carved floral work, sized on request.",
    finish: "Hand-carved", occasion: "Daily wear, gifting", includes: "4 bangles" },
  { name: "Antique Jhumka Earrings", category: "Earrings", weights: [14.2, 13.8], making: 12, qty: 1, photo: "photo-1695050049047-54e27a908898",
    description: "Antique-finish jhumkas with bead drops, light enough for all-day wear.",
    stones: "Gold beads", finish: "Antique", occasion: "Daily wear, festive" },
  { name: "Temple Work Ring", category: "Rings", weights: [9.2], making: 15, qty: 1, photo: "photo-1626784214536-d859187e0bd0",
    description: "Ornate temple-style ring with a green centre stone and red accents.",
    stones: "Green and red stones", finish: "Temple work", occasion: "Festive" },
];

const { MONGODB_URI, NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

async function cloudinary(action, params, extra = {}) {
  const signed = { ...params, timestamp: Math.round(Date.now() / 1000) };
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...signed, ...extra, api_key: CLOUDINARY_API_KEY, signature: sign(signed, CLOUDINARY_API_SECRET) })) fd.append(k, v);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/${action}`, { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(`Cloudinary ${action}: ${json.error?.message}`);
  return json;
}

const client = new MongoClient(MONGODB_URI);
const db = client.db("prakashjewellers");
const items = db.collection("items");

try {
  if (process.argv[2] === "add") {
    if (await items.countDocuments({ demo: true })) throw new Error("Demo items are already loaded. Run npm run demo:remove first.");
    const now = Date.now();
    let n = 0;
    for (const { photo, weights, ...item } of ITEMS) {
      const { public_id } = await cloudinary("upload", { folder: "prakashjewellers/demo" }, { file: unsplash(photo) });
      const code = await nextCode(db);
      for (const weight of weights) {
        const piece = await nextPiece(db);
        await items.insertOne({
          pricing: "weight", rateKey: "22k", netWeight: null, extraCharge: null, extraLabel: "", featured: false, ...item,
          weight, code, piece, status: "live", fixedPrice: null, photos: [public_id],
          views: 0, cartAdds: 0, enquiries: 0, createdAt: new Date(now - n++ * 1000), demo: true,
        });
        console.log(`+ ${code} #${piece} ${item.name} ${weight} g`);
      }
    }
    const settings = db.collection("settings");
    const s = await settings.findOne({ _id: "shop" });
    if (!s?.rates?.some((r) => r.perGram))
      await settings.updateOne(
        { _id: "shop" },
        { $set: { rates: [{ key: "22k", label: "22K gold", perGram: DEMO_RATE, updatedAt: new Date(), updatedBy: "Sample data" }] }, $unset: { rate: "", rateAt: "" } },
        { upsert: true },
      );
    console.log(`Loaded ${n} sample pieces.`);
  } else if (process.argv[2] === "remove") {
    const demo = await items.find({ demo: true }).toArray();
    for (const public_id of demo.flatMap((d) => d.photos)) await cloudinary("destroy", { public_id });
    const ids = demo.map((d) => d._id.toHexString());
    await db.collection("enquiries").deleteMany({ "items.id": { $in: ids } });
    await db.collection("sales").deleteMany({ itemId: { $in: ids } });
    const { deletedCount } = await items.deleteMany({ demo: true });
    // Before launch (nothing else in the catalogue): codes restart at PJ-001 and the pilot stats start clean.
    if (!(await items.countDocuments())) await Promise.all([db.collection("counters").deleteMany({}), db.collection("stats").deleteMany({})]);
    console.log(`Removed ${deletedCount} demo items and their photos.`);
  } else {
    throw new Error("Usage: npm run demo:add | npm run demo:remove");
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await client.close();
}
