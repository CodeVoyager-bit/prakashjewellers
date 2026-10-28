"use server";

import { headers } from "next/headers";
import { enquiriesDb, getSettings, itemsDb, oid, quote } from "@/lib/data";
import { formatDay, rupees } from "@/lib/price";

export async function trackView(id: string) {
  const _id = oid(id);
  if (_id) await itemsDb.updateOne({ _id }, { $inc: { views: 1 } });
}

export async function getQuote(ids: string[]) {
  return quote(Array.isArray(ids) ? ids.map(String) : []);
}

// Records the enquiry (for the owner's analytics) and returns the WhatsApp link to open.
export async function sendEnquiry(ids: string[]): Promise<{ url: string } | { error: string }> {
  const [q, s] = await Promise.all([getQuote(ids), getSettings()]);
  if (!q.lines.length) return { error: "Your enquiry list is empty. Add a piece first." };
  if (!s.whatsapp) return { error: "WhatsApp enquiries aren't set up yet. Please call the shop instead." };

  const { insertedId } = await enquiriesDb.insertOne({
    items: q.lines.map((l) => ({ id: l.id, name: l.name, weight: l.weight, total: l.price?.total ?? null })),
    total: q.total,
    rate: q.rate,
    createdAt: new Date(),
  });
  await itemsDb.updateMany({ _id: { $in: q.lines.map((l) => oid(l.id)!) } }, { $inc: { enquiries: 1 } });

  const origin = (await headers()).get("origin") ?? "";
  const text = [
    `Namaste ${s.name}, I'd like a quotation for:`,
    "",
    ...q.lines.flatMap((l, i) => [
      `${i + 1}. ${l.name}${l.weight ? ` (${l.weight} g)` : ""}`,
      `   ${l.price ? rupees(l.price.total) : "Price on request"}`,
      `   ${origin}/item/${l.id}`,
    ]),
    "",
    ...(q.goldAndMaking ? [`Gold + making: ${rupees(q.goldAndMaking)}`, `GST 3%: ${rupees(q.gst)}`] : []),
    ...(q.fixed ? [`Fixed-price pieces: ${rupees(q.fixed)}`] : []),
    `Estimated total: ${rupees(q.total)}${q.onRequest ? ` + ${q.onRequest} on request` : ""}`,
    ...(q.rate && q.rateAt ? [`Rate used: 22K ${rupees(q.rate)}/g on ${formatDay(q.rateAt)}`] : []),
    `Ref: PJ-${insertedId.toHexString().slice(-6).toUpperCase()}`,
  ].join("\n");

  return { url: `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(text)}` };
}
