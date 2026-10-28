import { cache } from "react";
import { ObjectId, type WithId } from "mongodb";
import { db } from "./db";
import { priceOf, type Price } from "./price";

export const THEMES = ["red", "green", "black", "white"] as const;
export type Theme = (typeof THEMES)[number];

export type Settings = {
  name: string;
  whatsapp: string; // digits with country code, e.g. 919876543210
  phone: string;
  address: string;
  theme: Theme;
  rate: number; // 22K gold, ₹ per gram
  rateAt: Date | null;
};

export type Item = {
  id: string;
  name: string;
  category: string;
  weight: number;
  making: number | null;
  fixedPrice: number | null;
  qty: number;
  description: string;
  photos: string[]; // Cloudinary public_ids, first one is the cover
  views: number;
  enquiries: number;
};

type ItemDoc = Omit<Item, "id"> & { createdAt: Date };
type EnquiryDoc = {
  items: { id: string; name: string; weight: number; total: number | null }[];
  total: number;
  rate: number;
  createdAt: Date;
};

export const settingsDb = db.collection<Partial<Settings> & { _id: string }>("settings");
export const itemsDb = db.collection<ItemDoc>("items");
export const enquiriesDb = db.collection<EnquiryDoc>("enquiries");

const DEFAULTS: Settings = { name: "Prakash Jewellers", whatsapp: "", phone: "", address: "", theme: "red", rate: 0, rateAt: null };

// cache(): layout, page and metadata share one read per request.
export const getSettings = cache(async (): Promise<Settings> => {
  const doc = await settingsDb.findOne({ _id: "shop" }, { projection: { _id: 0 } });
  return { ...DEFAULTS, ...doc };
});

const toItem = ({ _id, ...d }: WithId<ItemDoc>): Item => ({ ...d, id: _id.toHexString() });

export const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

export async function getItems(category?: string) {
  const docs = await itemsDb.find(category ? { category } : {}).sort({ createdAt: -1 }).toArray();
  return docs.map(toItem);
}

export async function getItem(id: string) {
  const _id = oid(id);
  const doc = _id && (await itemsDb.findOne({ _id }));
  return doc ? toItem(doc) : null;
}

export async function getCategories() {
  return ((await itemsDb.distinct("category")) as string[]).filter(Boolean).sort();
}

export async function getEnquiries(limit = 30) {
  return enquiriesDb.find().sort({ createdAt: -1 }).limit(limit).toArray();
}

export async function countEnquiriesSince(days: number) {
  return enquiriesDb.countDocuments({ createdAt: { $gte: new Date(Date.now() - days * 864e5) } });
}

export type Line = { id: string; name: string; category: string; weight: number; qty: number; photo: string | null; price: Price | null };

// Prices an enquiry list on the server at today's rate. Unknown or deleted ids drop out.
export async function quote(ids: string[]) {
  const _ids = [...new Set(ids)].slice(0, 50).map(oid).filter((x) => x !== null);
  const [s, docs] = await Promise.all([getSettings(), itemsDb.find({ _id: { $in: _ids } }).toArray()]);
  const lines: Line[] = docs.map((d) => ({
    id: d._id.toHexString(),
    name: d.name,
    category: d.category,
    weight: d.weight,
    qty: d.qty,
    photo: d.photos[0] ?? null,
    price: priceOf(d, s.rate),
  }));
  const sum = (f: (p: Price) => number) => lines.reduce((n, l) => n + (l.price ? f(l.price) : 0), 0);
  return {
    lines,
    rate: s.rate,
    rateAt: s.rateAt,
    goldAndMaking: sum((p) => p.gold + p.making),
    gst: sum((p) => p.gst),
    fixed: sum((p) => (p.fixed ? p.total : 0)),
    total: sum((p) => p.total),
    onRequest: lines.filter((l) => !l.price).length,
  };
}
