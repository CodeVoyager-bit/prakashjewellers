"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth, requireStaff } from "@/lib/auth";
import { sign } from "@/lib/cloudinary";
import { itemsDb, oid, settingsDb, THEMES, type Theme } from "@/lib/data";

const text = (fd: FormData, k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
const num = (fd: FormData, k: string) => {
  const v = text(fd, k);
  return v === "" ? null : Number(v);
};
const done = () => revalidatePath("/", "layout");

export async function saveRate(fd: FormData) {
  await requireStaff();
  const rate = num(fd, "rate");
  if (!rate || !(rate > 0 && rate < 100000)) throw new Error("Rate must be ₹ per gram");
  await settingsDb.updateOne({ _id: "shop" }, { $set: { rate, rateAt: new Date() } }, { upsert: true });
  done();
}

export async function saveSettings(fd: FormData) {
  await requireStaff();
  const digits = (k: string) => text(fd, k).replace(/\D/g, "");
  const wa = digits("whatsapp");
  const theme = text(fd, "theme") as Theme;
  await settingsDb.updateOne(
    { _id: "shop" },
    {
      $set: {
        name: text(fd, "name") || "Prakash Jewellers",
        // Accept a bare 10-digit Indian mobile and add the country code wa.me needs.
        whatsapp: wa.length === 10 ? `91${wa}` : wa,
        phone: text(fd, "phone"),
        address: text(fd, "address", 300),
        theme: THEMES.includes(theme) ? theme : "red",
      },
    },
    { upsert: true },
  );
  done();
}

export async function saveItem(_: unknown, fd: FormData): Promise<string> {
  await requireStaff();
  const weight = num(fd, "weight") ?? 0;
  const fixedPrice = num(fd, "fixedPrice");
  const making = num(fd, "making");
  const qty = num(fd, "qty") ?? 0;
  let photos: string[] = [];
  try {
    photos = JSON.parse(text(fd, "photos", 5000));
  } catch {}
  photos = photos.filter((p) => typeof p === "string" && /^[\w/-]+$/.test(p)).slice(0, 12);

  const item = {
    name: text(fd, "name"),
    category: text(fd, "category", 60),
    description: text(fd, "description", 1000),
    weight,
    fixedPrice: fixedPrice || null,
    making,
    qty: Math.max(0, Math.floor(qty)),
    photos,
  };
  if (!item.name) return "Enter the item name.";
  if (!(weight > 0) && !item.fixedPrice) return "Enter the weight in grams, or a fixed price.";
  if ([weight, fixedPrice, making, qty].some((n) => n !== null && (!Number.isFinite(n) || n < 0)))
    return "Weight, prices and quantity can't be negative.";

  const _id = oid(text(fd, "id"));
  if (_id) await itemsDb.updateOne({ _id }, { $set: item });
  else await itemsDb.insertOne({ ...item, views: 0, enquiries: 0, createdAt: new Date() });
  done();
  redirect("/admin");
}

export async function setQty(id: string, qty: number) {
  await requireStaff();
  const _id = oid(id);
  if (_id && Number.isInteger(qty) && qty >= 0) await itemsDb.updateOne({ _id }, { $set: { qty } });
  done();
}

// ponytail: photos stay on Cloudinary after delete; add a destroy call if the free storage fills up.
export async function deleteItem(id: string) {
  await requireStaff();
  const _id = oid(id);
  if (_id) await itemsDb.deleteOne({ _id });
  done();
  redirect("/admin");
}

// Lets the browser upload straight to Cloudinary, so photos never pass through Vercel's size limit.
export async function uploadSignature() {
  await requireStaff();
  const params = { folder: "prakashjewellers", timestamp: Math.round(Date.now() / 1000) };
  return {
    url: `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
    fields: { ...params, api_key: process.env.CLOUDINARY_API_KEY!, signature: sign(params, process.env.CLOUDINARY_API_SECRET!) },
  };
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/login");
}
