import { cache } from "react";
import { ObjectId, type Filter, type WithId } from "mongodb";
import { codePattern } from "./codes.mjs";
import { db } from "./db";
import { isTheme, type DetailKey, type EnquiryStatus, type Status, type Theme } from "./fields";
import { priceOf, type Price, type Rate } from "./price";

export * from "./fields";

export type Settings = {
  name: string;
  whatsapp: string; // digits with country code, e.g. 919876543210
  phone: string;
  address: string;
  hours: string;
  instagram: string; // handle without @
  theme: Theme;
  makingPct: number;
  taxPct: number;
  rates: Rate[];
};

export type Item = {
  id: string;
  code: string; // design code, shared by pieces of the same design
  piece: number; // unique number for this physical piece
  name: string;
  category: string;
  status: Status;
  featured: boolean;
  demo: boolean;
  pricing: "weight" | "fixed";
  rateKey: string;
  weight: number; // gross weight of this piece, g
  netWeight: number | null; // billable gold weight, when it differs (stones, beads)
  making: number | null; // % override
  extraCharge: number | null; // ₹, e.g. stone setting
  extraLabel: string;
  fixedPrice: number | null;
  qty: number;
  description: string;
  photos: string[]; // Cloudinary public_ids, first one is the cover
  views: number;
  cartAdds: number;
  enquiries: number;
  createdAt: Date;
} & Partial<Record<DetailKey, string>>;

type ItemDoc = Omit<Item, "id">;
export type EnquiryLine = { id: string; code: string; piece: number; name: string; weight: number; qty: number; total: number | null };
type EnquiryDoc = {
  items: EnquiryLine[];
  total: number;
  rates: string;
  opened: boolean; // the customer tapped "Continue to WhatsApp"; we can't know if they sent it
  status: EnquiryStatus;
  createdAt: Date;
};
type SaleDoc = { itemId: string; code: string; piece: number; name: string; estimate: number | null; by: string; at: Date };
type StatDoc = { _id: string; visits?: number; views?: number; cartAdds?: number; whatsapp?: number };

export const settingsDb = db.collection<Partial<Settings> & { _id: string; rate?: number; rateAt?: Date }>("settings");
export const itemsDb = db.collection<ItemDoc>("items");
export const enquiriesDb = db.collection<EnquiryDoc>("enquiries");
export const salesDb = db.collection<SaleDoc>("sales");
export const statsDb = db.collection<StatDoc>("stats");

const DEFAULT_RATE: Rate = { key: "22k", label: "22K gold", perGram: 0, updatedAt: null, updatedBy: "" };
const DEFAULTS: Settings = {
  name: "Prakash Jeweller",
  whatsapp: "",
  phone: "",
  address: "",
  hours: "",
  instagram: "prakash_jewellrs",
  theme: "burgundy",
  makingPct: 10,
  taxPct: 3,
  rates: [DEFAULT_RATE],
};

// cache(): layout, page and metadata share one read per request.
export const getSettings = cache(async (): Promise<Settings> => {
  const found = await settingsDb.findOne({ _id: "shop" }, { projection: { _id: 0 } });
  const { rate, rateAt, ...doc } = found ?? ({} as NonNullable<typeof found>);
  const s = { ...DEFAULTS, ...doc };
  // Earlier versions kept a single 22K rate.
  const rates = doc.rates ?? (rate ? [{ ...DEFAULT_RATE, perGram: rate, updatedAt: rateAt ?? null }] : DEFAULTS.rates);
  return { ...s, rates, theme: isTheme(s.theme) ? s.theme : DEFAULTS.theme };
});

export const toItem = ({ _id, ...d }: WithId<Partial<ItemDoc>>): Item => ({
  code: "",
  piece: 0,
  name: "",
  category: "",
  status: "live",
  featured: false,
  demo: false,
  pricing: d.fixedPrice && !d.weight ? "fixed" : "weight",
  rateKey: DEFAULT_RATE.key,
  weight: 0,
  netWeight: null,
  making: null,
  extraCharge: null,
  extraLabel: "",
  fixedPrice: null,
  qty: 0,
  description: "",
  photos: [],
  views: 0,
  cartAdds: 0,
  enquiries: 0,
  createdAt: _id.getTimestamp(),
  ...d,
  id: _id.toHexString(),
});

export const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);
export const priceFor = (item: Item, s: Settings) => priceOf(item, s.rates, s);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const VISIBLE = { status: { $nin: ["draft", "archived"] as Status[] } };

export type Sort = "new" | "price-asc" | "price-desc" | "weight";
export type Avail = "all" | "in" | "out";

// Customer catalogue: live pieces only.
export async function getItems({ category, q, avail = "all" }: { category?: string; q?: string; avail?: Avail } = {}) {
  const filter: Filter<ItemDoc> = { ...VISIBLE };
  if (category) filter.category = category;
  if (avail === "in") filter.qty = { $gt: 0 };
  if (avail === "out") filter.qty = { $lte: 0 };
  const query = q?.trim().slice(0, 60);
  if (query) {
    const text = new RegExp(escape(query), "i");
    const code = codePattern(query);
    filter.$or = [{ name: text }, { category: text }, ...(code ? [{ code }] : [])];
  }
  return (await itemsDb.find(filter).sort({ createdAt: -1 }).toArray()).map(toItem);
}

// Pieces priced on request sort last either way.
export function sortItems(items: Item[], sort: Sort, s: Settings) {
  const total = (i: Item) => priceFor(i, s)?.total;
  const by = (dir: 1 | -1) => (a: Item, b: Item) => {
    const [x, y] = [total(a), total(b)];
    return x == null ? 1 : y == null ? -1 : dir * (x - y);
  };
  if (sort === "price-asc") return [...items].sort(by(1));
  if (sort === "price-desc") return [...items].sort(by(-1));
  if (sort === "weight") return [...items].sort((a, b) => b.weight - a.weight);
  return items;
}

// Staff list: every status.
export async function getAllItems() {
  return (await itemsDb.find().sort({ createdAt: -1 }).toArray()).map(toItem);
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

export async function getCategories(all = false) {
  return ((await itemsDb.distinct("category", all ? {} : VISIBLE)) as string[]).filter(Boolean).sort();
}

export type CartLine = {
  id: string;
  code: string;
  piece: number;
  name: string;
  weight: number;
  netWeight: number | null;
  photo: string | null;
  price: Price | null;
  available: number; // pieces the store currently lists
  qty: number; // requested quantity, capped at what's available
};

// Prices the enquiry cart on the server at today's rates and rechecks availability.
export async function quote(cart: { id: string; qty: number }[]) {
  const want = new Map(cart.slice(0, 50).map((l) => [String(l.id), Math.max(1, Math.floor(Number(l.qty)) || 1)]));
  const ids = [...want.keys()].map(oid).filter((x) => x !== null);
  const [s, docs] = await Promise.all([getSettings(), itemsDb.find({ _id: { $in: ids } }).toArray()]);
  const byId = new Map(docs.map((d) => [d._id.toHexString(), toItem(d)]));
  const lines: CartLine[] = [...want].flatMap(([id, qty]) => {
    const i = byId.get(id);
    if (!i) return [];
    const available = i.status === "live" ? Math.max(i.qty, 0) : 0;
    return [{ id, code: i.code, piece: i.piece, name: i.name, weight: i.weight, netWeight: i.netWeight, photo: i.photos[0] ?? null, price: priceFor(i, s), available, qty: Math.min(qty, available) }];
  });
  const priced = lines.filter((l) => l.qty > 0 && l.price);
  const sum = (f: (p: Price) => number) => priced.reduce((n, l) => n + f(l.price!) * l.qty, 0);
  const used = s.rates.filter((r) => priced.some((l) => l.price!.rate?.key === r.key));
  return {
    lines,
    metal: sum((p) => p.metal),
    making: sum((p) => p.making),
    extra: sum((p) => p.extra),
    tax: sum((p) => p.tax),
    fixed: sum((p) => (p.fixed ? p.total : 0)),
    total: sum((p) => p.total),
    onRequest: lines.filter((l) => l.qty > 0 && !l.price).length,
    stale: priced.some((l) => l.price!.stale),
    rates: used,
    taxPct: s.taxPct,
  };
}
export type Quote = Awaited<ReturnType<typeof quote>>;

// Pilot analytics: one counter document per day (IST).
const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export async function bump(field: "visits" | "views" | "cartAdds" | "whatsapp") {
  await statsDb.updateOne({ _id: ymd(new Date()) }, { $inc: { [field]: 1 } }, { upsert: true });
}

export async function getStats(days: number) {
  const from = new Date(Date.now() - (days - 1) * 864e5);
  const [daily, confirmed, sales] = await Promise.all([
    statsDb.find({ _id: { $gte: ymd(from) } }).sort({ _id: 1 }).toArray(),
    enquiriesDb.countDocuments({ status: "confirmed", createdAt: { $gte: from } }),
    salesDb.find({ at: { $gte: from } }).toArray(),
  ]);
  const total = (k: keyof Omit<StatDoc, "_id">) => daily.reduce((n, d) => n + (d[k] ?? 0), 0);
  // One entry per day, zero-filled, for the dashboard chart.
  const days_ = Array.from({ length: days }, (_, i) => ymd(new Date(from.getTime() + i * 864e5)));
  const byDay = new Map(daily.map((d) => [d._id, d]));
  return {
    days: days_.map((d) => ({ day: d, ...byDay.get(d) })),
    visits: total("visits"),
    views: total("views"),
    cartAdds: total("cartAdds"),
    whatsapp: total("whatsapp"),
    confirmed,
    sold: sales.length,
    soldValue: sales.reduce((n, x) => n + (x.estimate ?? 0), 0),
  };
}

export async function getEnquiries(limit = 50) {
  return enquiriesDb.find({ opened: true }).sort({ createdAt: -1 }).limit(limit).toArray();
}
