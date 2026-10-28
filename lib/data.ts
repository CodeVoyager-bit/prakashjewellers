import { cache } from "react";
import { ObjectId, type Filter, type WithId } from "mongodb";
import { codePattern } from "./codes.mjs";
import { db } from "./db";
import { isTheme, type DetailKey, type Theme } from "./fields";
import { priceOf, type Price } from "./price";

export { DETAILS, THEMES, isTheme, type DetailKey, type Theme } from "./fields";

export type Settings = {
  name: string;
  whatsapp: string; // digits with country code, e.g. 919876543210
  phone: string;
  address: string;
  instagram: string; // handle without @
  theme: Theme;
  rate: number; // 22K gold, ₹ per gram
  rateAt: Date | null;
};

export type Item = {
  id: string;
  code: string;
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
} & Partial<Record<DetailKey, string>>;

type ItemDoc = Omit<Item, "id"> & { createdAt: Date };
type EnquiryDoc = {
  items: { id: string; code?: string; name: string; weight: number; total: number | null }[];
  total: number;
  rate: number;
  createdAt: Date;
};

export const settingsDb = db.collection<Partial<Settings> & { _id: string }>("settings");
export const itemsDb = db.collection<ItemDoc>("items");
export const enquiriesDb = db.collection<EnquiryDoc>("enquiries");

const DEFAULTS: Settings = { name: "Prakash Jeweller", whatsapp: "", phone: "", address: "", instagram: "", theme: "profile", rate: 0, rateAt: null };

// cache(): layout, page and metadata share one read per request.
export const getSettings = cache(async (): Promise<Settings> => {
  const doc = await settingsDb.findOne({ _id: "shop" }, { projection: { _id: 0 } });
  const s = { ...DEFAULTS, ...doc };
  return { ...s, theme: isTheme(s.theme) ? s.theme : DEFAULTS.theme };
});

const toItem = ({ _id, ...d }: WithId<ItemDoc>): Item => ({ ...d, code: d.code ?? "", id: _id.toHexString() });

export const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function getItems({ category, q }: { category?: string; q?: string } = {}) {
  const filter: Filter<ItemDoc> = category ? { category } : {};
  const query = q?.trim().slice(0, 60);
  if (query) {
    const text = new RegExp(escape(query), "i");
    const code = codePattern(query);
    filter.$or = [{ name: text }, { category: text }, ...(code ? [{ code }] : [])];
  }
  const docs = await itemsDb.find(filter).sort({ createdAt: -1 }).toArray();
  return docs.map(toItem);
}

export async function getItem(id: string) {
  const _id = oid(id);
  const doc = _id && (await itemsDb.findOne({ _id }));
  return doc ? toItem(doc) : null;
}

// Each category with the cover photo of its newest piece, for the collection tiles.
export function collections(items: Item[]) {
  const seen = new Map<string, string | null>();
  for (const i of items) if (i.category && !seen.has(i.category)) seen.set(i.category, i.photos[0] ?? null);
  return [...seen].map(([name, photo]) => ({ name, photo })).sort((a, b) => a.name.localeCompare(b.name));
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

export type Line = { id: string; code: string; name: string; category: string; weight: number; qty: number; photo: string | null; price: Price | null };

// Prices a list of pieces on the server at today's rate. Unknown or deleted ids drop out.
export async function quote(ids: string[]) {
  const _ids = [...new Set(ids)].slice(0, 50).map(oid).filter((x) => x !== null);
  const [s, docs] = await Promise.all([getSettings(), itemsDb.find({ _id: { $in: _ids } }).toArray()]);
  const lines: Line[] = docs.map((d) => ({
    id: d._id.toHexString(),
    code: d.code ?? "",
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
