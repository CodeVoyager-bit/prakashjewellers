"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { auth, isOwner, requireStaff } from "@/lib/auth";
import { sign } from "@/lib/cloudinary.mjs";
import { nextCode, nextPiece } from "@/lib/codes.mjs";
import { db } from "@/lib/db";
import {
  CATALOGUE,
  DEFAULT_RATE_KEY,
  DETAILS,
  enquiriesDb,
  enquiryRef,
  getItem,
  getSettings,
  isEnquiryStatus,
  isStatus,
  isTheme,
  itemsDb,
  oid,
  priceFor,
  salesDb,
  settingsDb,
  type DetailKey,
  type EnquiryStatus,
  type Status,
} from "@/lib/data";
import { perGram, rupees } from "@/lib/price";
import { staffEmail } from "@/lib/staff-email.mjs";

const text = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
// Tolerates what staff naturally type: "1,250", "₹5000", "10%", "12.4 g".
const num = (fd: FormData, k: string) => {
  const v = text(fd, k).replace(/[,₹%\s]/g, "").replace(/(gms?|grams?|g)$/i, "");
  return v === "" ? null : Number(v);
};
// After any change customers can see: expire the cached catalogue and settings, and re-render every page.
const done = () => {
  updateTag(CATALOGUE);
  revalidatePath("/", "layout");
};
const staffName = async () => (await requireStaff()).user.name || "Staff";

// Daily rates: only the categories typed in are updated, each stamped with who and when.
export async function saveRates(_: unknown, fd: FormData): Promise<string> {
  const by = await staffName();
  const s = await getSettings();
  const unit = text(fd, "unit") === "10g" ? "10g" : "g";
  const rates = s.rates.map((r) => ({ ...r }));
  const label = text(fd, "newLabel", 40);
  if (label) {
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "rate";
    if (rates.some((r) => r.key === key)) return `“${label}” already exists.`;
    rates.push({ key, label, perGram: 0, updatedAt: null, updatedBy: "" });
  }
  let updated = 0;
  for (const r of rates) {
    const v = num(fd, `rate_${r.key}`) ?? (label && r === rates.at(-1) ? num(fd, "rate_new") : null);
    if (v === null) continue;
    if (!Number.isFinite(v) || v <= 0) return `Enter a rate above zero for ${r.label}.`;
    const g = Math.round(perGram(v, unit) * 100) / 100;
    if (g > 1_000_000) return `${r.label}: ${v} per ${unit === "g" ? "gram" : "10 g"} looks too high. Check the unit.`;
    // A wrong unit is a 10× error on every price, so big jumps need an explicit tick.
    if (r.perGram && fd.get("allowBig") !== "on" && (g > r.perGram * 1.5 || g < r.perGram * 0.5))
      return `${r.label}: ${rupees(g)} per gram is more than 50% ${g > r.perGram ? "above" : "below"} the current ${rupees(r.perGram)}. Check the unit (per gram or per 10 g). If it’s right, tick “Allow a big change” and save again.`;
    Object.assign(r, { perGram: g, updatedAt: new Date(), updatedBy: by });
    updated++;
  }
  if (!updated && !label) return "Type at least one rate to update.";
  await settingsDb.updateOne({ _id: "shop" }, { $set: { rates } }, { upsert: true });
  done();
  return "";
}

export async function removeRate(key: string) {
  await requireStaff();
  if (await itemsDb.countDocuments(key === DEFAULT_RATE_KEY ? { $or: [{ rateKey: key }, { rateKey: { $exists: false } }] } : { rateKey: key })) return;
  const s = await getSettings();
  if (s.rates.length < 2) return;
  await settingsDb.updateOne({ _id: "shop" }, { $set: { rates: s.rates.filter((r) => r.key !== key) } });
  done();
}

export async function saveSettings(fd: FormData) {
  await requireStaff();
  const s = await getSettings();
  const wa = text(fd, "whatsapp").replace(/\D/g, "").replace(/^0+/, ""); // "098765…" is a 10-digit number too
  const pct = (k: string, fallback: number) => {
    const v = num(fd, k);
    return v !== null && v >= 0 && v <= 100 ? v : fallback;
  };
  const theme = text(fd, "theme");
  await settingsDb.updateOne(
    { _id: "shop" },
    {
      $set: {
        name: text(fd, "name") || "Prakash Jewellers",
        // Accept a bare 10-digit Indian mobile and add the country code wa.me needs.
        whatsapp: wa.length === 10 ? `91${wa}` : wa,
        phone: text(fd, "phone"),
        address: text(fd, "address", 300),
        hours: text(fd, "hours", 300),
        instagram: text(fd, "instagram", 60).replace(/^@|^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, ""),
        theme: isTheme(theme) ? theme : s.theme,
        makingPct: pct("makingPct", s.makingPct),
        taxPct: pct("taxPct", s.taxPct),
      },
    },
    { upsert: true },
  );
  done();
}

export async function saveItem(_: unknown, fd: FormData): Promise<string> {
  await requireStaff();
  const s = await getSettings();
  let photos: string[] = [];
  try {
    photos = JSON.parse(text(fd, "photos", 5000));
  } catch {}
  photos = photos.filter((p) => typeof p === "string" && /^[\w/-]+$/.test(p)).slice(0, 12);
  const video = /^[\w/-]+$/.test(text(fd, "video")) ? text(fd, "video") : null;

  const pricing = text(fd, "pricing") === "fixed" ? "fixed" : "weight";
  const status = text(fd, "status") as Status;
  const [weight, netWeight, making, extraCharge, fixedPrice, qty] = ["weight", "netWeight", "making", "extraCharge", "fixedPrice", "qty"].map((k) => num(fd, k));
  const item = {
    name: text(fd, "name"),
    category: text(fd, "category", 60),
    description: text(fd, "description", 1000),
    status: isStatus(status) ? status : "draft",
    featured: fd.get("featured") === "on",
    pricing,
    rateKey: text(fd, "rateKey", 40) || s.rates[0].key,
    weight: weight ?? 0,
    netWeight: netWeight || null,
    making,
    extraCharge: extraCharge || null,
    extraLabel: text(fd, "extraLabel", 60),
    fixedPrice: fixedPrice || null,
    qty: Math.max(0, Math.floor(qty ?? 0)),
    photos,
    video,
    ...(Object.fromEntries(Object.keys(DETAILS).map((k) => [k, text(fd, k, 120)])) as Record<DetailKey, string>),
  } as const;
  const code = text(fd, "code", 20).toUpperCase();

  if (!item.name) return "Enter the product name.";
  if ([weight, netWeight, making, extraCharge, fixedPrice, qty].some((n) => n !== null && (!Number.isFinite(n) || n < 0)))
    return "Weights, charges, prices and quantity can’t be negative.";
  if (making !== null && making > 100) return "Making charge is a percentage between 0 and 100.";
  if (pricing === "weight") {
    if (!(item.weight > 0)) return "Enter the weight of this exact piece in grams.";
    if (item.netWeight && item.netWeight > item.weight) return "Billable gold weight can’t be more than the gross weight.";
    if (!s.rates.some((r) => r.key === item.rateKey)) return "Choose a rate category that exists on the Rates page.";
  } else if (!item.fixedPrice) return "Enter the fixed price, or switch to weight-based pricing.";
  if (code && !/^[A-Z0-9-]+$/.test(code)) return "Design codes use letters, numbers and dashes only, like PJ-024.";

  const _id = oid(text(fd, "id"));
  // Stock is written only when staff changed it here, so a sale marked meanwhile isn't undone by this save.
  const { qty: stock, ...rest } = item;
  if (_id) await itemsDb.updateOne({ _id }, { $set: { ...rest, ...(code && { code }), ...(stock !== num(fd, "qtyWas") && { qty: stock }) } });
  else
    await itemsDb.insertOne({
      ...item,
      demo: false,
      code: code || (await nextCode(db)),
      piece: await nextPiece(db),
      views: 0,
      cartAdds: 0,
      enquiries: 0,
      createdAt: new Date(),
    });
  done();
  redirect("/admin/products");
}

// A new physical piece of the same design: same photos and details, its own number and weight.
export async function duplicateItem(id: string) {
  await requireStaff();
  const item = await getItem(id);
  if (!item) return;
  const copy: Partial<typeof item> = { ...item };
  delete copy.id;
  const { insertedId } = await itemsDb.insertOne({
    ...(copy as Omit<typeof item, "id">),
    piece: await nextPiece(db),
    weight: 0,
    netWeight: null,
    qty: 1,
    status: "draft",
    views: 0,
    cartAdds: 0,
    enquiries: 0,
    createdAt: new Date(),
  });
  done();
  redirect(`/admin/item/${insertedId.toHexString()}?copied=1`);
}

export async function setStatus(id: string, status: Status) {
  await requireStaff();
  const _id = oid(id);
  if (_id && isStatus(status)) await itemsDb.updateOne({ _id }, { $set: { status } });
  done();
}

// One more or one fewer, applied in the database: quick taps all count, and a sale marked meanwhile stays.
export async function setQty(id: string, delta: number) {
  await requireStaff();
  const _id = oid(id);
  if (!_id || (delta !== 1 && delta !== -1)) return;
  await itemsDb.updateOne({ _id, ...(delta < 0 && { qty: { $gt: 0 } }) }, { $inc: { qty: delta } });
  done();
}

// One piece sold in the shop: stock goes down and the sale is logged for the pilot report.
// From the Enquiries page, `enquiryId` links the sale to that enquiry and moves the enquiry to Sold.
export async function markSold(id: string, enquiryId?: string) {
  const by = await staffName();
  const [item, s] = await Promise.all([getItem(id), getSettings()]);
  if (!item || item.qty < 1) return;
  const enquiry = typeof enquiryId === "string" && enquiryId ? oid(enquiryId) : null;
  // The sale is logged only if this tap actually took one off, so a double tap can't log two.
  const { modifiedCount } = await itemsDb.updateOne({ _id: oid(id)!, qty: { $gt: 0 } }, { $inc: { qty: -1 } });
  if (modifiedCount) {
    await salesDb.insertOne({ itemId: id, code: item.code, piece: item.piece, name: item.name, estimate: priceFor(item, s)?.total ?? null, by, at: new Date(), ...(enquiry && { ref: enquiryRef(enquiry) }) });
    if (enquiry) await enquiriesDb.updateOne({ _id: enquiry }, { $set: { status: "sold" } });
  }
  done();
}

export async function deleteItem(id: string) {
  await requireStaff();
  const _id = oid(id);
  if (_id) await itemsDb.deleteOne({ _id });
  done();
  redirect("/admin/products");
}

export async function setEnquiryStatus(id: string, status: EnquiryStatus) {
  await requireStaff();
  const _id = oid(id);
  if (_id && isEnquiryStatus(status)) await enquiriesDb.updateOne({ _id }, { $set: { status } });
  revalidatePath("/admin", "layout");
}

// A short follow-up note on an enquiry, such as "visiting Sunday" or the customer's name.
export async function setEnquiryNote(id: string, note: string) {
  await requireStaff();
  const _id = oid(id);
  if (_id && typeof note === "string") await enquiriesDb.updateOne({ _id }, { $set: { note: note.trim().slice(0, 500) } });
  revalidatePath("/admin/enquiries");
}

// Lets the browser upload straight to Cloudinary, so photos and videos never pass through Vercel's size limit.
export async function uploadSignature(kind: "image" | "video" = "image") {
  await requireStaff();
  const params = { folder: "prakashjewellers", timestamp: Math.round(Date.now() / 1000) };
  return {
    url: `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/${kind === "video" ? "video" : "image"}/upload`,
    fields: { ...params, api_key: process.env.CLOUDINARY_API_KEY!, signature: sign(params, process.env.CLOUDINARY_API_SECRET!) },
  };
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/login");
}

// Staff logins: only owners manage them, and nobody can remove their own login, so an owner always remains.
const NOT_OWNER = "Only an owner can manage staff logins.";
const owner = async () => {
  const s = await requireStaff();
  return isOwner(s.user) ? s : null;
};
const passwordError = (p: string) => (p.length < 8 ? "Use a password of at least 8 characters." : p.length > 128 ? "That password is too long." : "");

export async function addStaff(fd: FormData): Promise<string> {
  if (!(await owner())) return NOT_OWNER;
  const name = text(fd, "name", 60);
  const phone = text(fd, "phone").replace(/\D/g, "");
  const password = String(fd.get("password") ?? "");
  if (!name) return "Enter the person’s name.";
  if (!/^[6-9]\d{9}$/.test(phone)) return "Enter a 10-digit Indian mobile number.";
  if (passwordError(password)) return passwordError(password);
  const ctx = await auth.$context;
  const email = staffEmail(phone);
  if (await ctx.internalAdapter.findUserByEmail(email)) return "That mobile number already has a login. Use Reset Password on it instead.";
  const user = await ctx.internalAdapter.createUser({ email, name, role: fd.get("owner") ? "owner" : "staff" }, { method: "admin" });
  await ctx.internalAdapter.linkAccount({ providerId: "credential", accountId: user.id, userId: user.id, password: await ctx.password.hash(password) });
  revalidatePath("/admin/staff");
  return "";
}

export async function resetStaffPassword(id: string, password: string): Promise<string> {
  const me = await owner();
  if (!me) return NOT_OWNER;
  if (passwordError(password)) return passwordError(password);
  const ctx = await auth.$context;
  if (!(await ctx.internalAdapter.findUserById(id))) return "That login no longer exists.";
  await ctx.internalAdapter.updatePassword(id, await ctx.password.hash(password));
  // Signed out on every other device (for an owner's own reset, all but this one, say after a lost phone).
  const others = (await ctx.internalAdapter.listSessions(id)).filter((x) => x.token !== me.session.token).map((x) => x.token);
  if (others.length) await ctx.internalAdapter.deleteSessions(others);
  return "";
}

export async function removeStaff(id: string): Promise<string> {
  const me = await owner();
  if (!me) return NOT_OWNER;
  if (id === me.user.id) return "You can’t remove your own login.";
  // Deletes their sessions and password too, so they're signed out immediately.
  await (await auth.$context).internalAdapter.deleteUser(id);
  revalidatePath("/admin/staff");
  return "";
}
