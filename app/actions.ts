"use server";

import { headers } from "next/headers";
import { enquiriesDb, getSettings, quote } from "@/lib/data";
import { formatDayTime, rupees } from "@/lib/price";

type Cart = { id: string; qty: number }[];
const clean = (cart: Cart) => (Array.isArray(cart) ? cart.map((l) => ({ id: String(l?.id), qty: Math.max(1, Math.floor(Number(l?.qty)) || 1) })) : []);

export async function getQuote(cart: Cart) {
  return quote(clean(cart));
}

// Rechecks prices and availability, then drafts the WhatsApp message for the customer to review.
// Nothing is sent or reserved here; the enquiry is only counted when they continue to WhatsApp.
export async function prepareEnquiry(cart: Cart) {
  const asked = clean(cart);
  const [q, s] = await Promise.all([quote(asked), getSettings()]);
  const lines = q.lines.filter((l) => l.qty > 0);
  if (!lines.length) return { error: "None of these pieces are available right now. Call the store to ask about them." };
  if (!s.whatsapp) return { error: "WhatsApp enquiries aren’t set up yet. Please call the store instead." };

  const { insertedId } = await enquiriesDb.insertOne({
    items: lines.map((l) => ({ id: l.id, code: l.code, piece: l.piece, name: l.name, weight: l.weight, qty: l.qty, total: l.price?.total ?? null })),
    total: q.total,
    rates: q.rates.map((r) => `${r.label} ${rupees(r.perGram)}/g`).join(", "),
    opened: false,
    status: "opened",
    createdAt: new Date(),
  });
  const ref = insertedId.toHexString();
  const origin = (await headers()).get("origin") ?? "";
  const message = [
    `Namaste ${s.name}, I’d like a quotation for:`,
    "",
    ...lines.flatMap((l, i) => [
      `${i + 1}. ${l.name}`,
      `   ${[l.code && `Code ${l.code}`, l.piece && `Piece #${l.piece}`, l.weight && `${l.weight} g`, `Qty ${l.qty}`].filter(Boolean).join(" · ")}`,
      `   Estimate: ${l.price ? rupees(l.price.total * l.qty) : "price on request"}`,
      `   ${origin}/item/${l.id}`,
    ]),
    "",
    `Estimated total: ${rupees(q.total)}${q.onRequest ? ` + ${q.onRequest} on request` : ""}`,
    ...q.rates.map((r) => `Rate used: ${r.label} ${rupees(r.perGram)}/g${r.updatedAt ? `, updated ${formatDayTime(r.updatedAt)}` : ""}`),
    "Estimates only. Final price and availability to be confirmed by the store.",
    `Ref: PJ-${ref.slice(-6).toUpperCase()}`,
  ].join("\n");

  const want = new Map(asked.map((a) => [a.id, a.qty]));
  return {
    ref,
    message,
    url: `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(message)}`,
    skipped: q.lines.filter((l) => l.qty === 0).map((l) => l.name),
    capped: lines.filter((l) => (want.get(l.id) ?? 0) > l.qty).map((l) => l.name),
  };
}
