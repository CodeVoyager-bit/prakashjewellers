"use server";

import { headers } from "next/headers";
import { enquiriesDb, getSettings, quote } from "@/lib/data";
import { formatDayTime, rupees } from "@/lib/price";

type Cart = { id: string; qty: number }[];
const clean = (cart: Cart) => (Array.isArray(cart) ? cart.map((l) => ({ id: String(l?.id), qty: Math.max(1, Math.floor(Number(l?.qty)) || 1) })) : []);

// Each enquiry draft is a database write anyone can trigger, so cap them per visitor.
// ponytail: counted in this server instance's memory, so the cap is per instance; move it to MongoDB if abuse shows up.
const drafts = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now();
  const recent = (drafts.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  if (drafts.size > 5000) drafts.clear();
  drafts.set(ip, recent);
  return recent.length > 30;
}

export async function getQuote(cart: Cart) {
  return quote(clean(cart));
}

// Rechecks prices and availability, then drafts the WhatsApp message for the customer to review.
// Nothing is sent or reserved here; the enquiry is only counted when they continue to WhatsApp.
// `ask`: a sold-out piece's "Ask About Making One", which keeps the piece (one) instead of dropping it.
export async function prepareEnquiry(cart: Cart, ask?: boolean) {
  const asking = ask === true;
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  if (tooMany(ip)) return { error: "Too many enquiries from this connection. Please wait a few minutes, or call the store." };
  const asked = clean(cart);
  const [q, s] = await Promise.all([quote(asked), getSettings()]);
  const lines = asking ? q.lines.slice(0, 1).map((l) => ({ ...l, qty: 1 })) : q.lines.filter((l) => l.qty > 0);
  if (!lines.length)
    return { error: asking ? "This piece is no longer listed. Call the store to ask about it." : "None of these pieces are available right now. Call the store to ask about them." };
  if (!s.whatsapp) return { error: "WhatsApp enquiries aren’t set up yet. Please call the store instead." };

  const { insertedId } = await enquiriesDb.insertOne({
    items: lines.map((l) => ({ id: l.id, code: l.code, piece: l.piece, name: l.name, weight: l.weight, qty: l.qty, total: l.price?.total ?? null })),
    total: asking ? (lines[0].price?.total ?? 0) : q.total,
    rates: q.rates.map((r) => `${r.label} ${rupees(r.perGram)}/g`).join(", "),
    opened: false,
    status: "opened",
    createdAt: new Date(),
  });
  const ref = insertedId.toHexString();
  const origin = (await headers()).get("origin") ?? "";
  const message = [
    asking ? `Namaste ${s.name}, this piece is sold out on your website. Could you make one like it, or show me something similar?` : `Namaste ${s.name}, I’d like a quotation for:`,
    "",
    ...lines.flatMap((l, i) => [
      `${i + 1}. ${l.name}`,
      `   ${[l.code && `Code ${l.code}`, l.piece && `Piece #${l.piece}`, l.weight && `${l.weight} g`, `Qty ${l.qty}`].filter(Boolean).join(" · ")}`,
      `   ${asking ? "Last estimate" : "Estimate"}: ${l.price ? rupees(l.price.total * l.qty) : "price on request"}`,
      `   ${origin}/item/${l.id}`,
    ]),
    "",
    ...(asking ? [] : [q.total ? `Estimated total: ${rupees(q.total)}${q.onRequest ? ` + ${q.onRequest} on request` : ""}` : "Estimated total: price on request"]),
    ...q.rates.map((r) => `Rate used: ${r.label} ${rupees(r.perGram)}/g${r.updatedAt ? `, updated ${formatDayTime(r.updatedAt)}` : ""}`),
    "Estimates only. Final price and availability to be confirmed by the store.",
    `Ref: PJ-${ref.slice(-6).toUpperCase()}`,
  ].join("\n");

  const want = new Map(asked.map((a) => [a.id, a.qty]));
  return {
    ref,
    message,
    url: `https://wa.me/${s.whatsapp}?text=${encodeURIComponent(message)}`,
    skipped: asking ? [] : q.lines.filter((l) => l.qty === 0).map((l) => l.name),
    capped: asking ? [] : lines.filter((l) => (want.get(l.id) ?? 0) > l.qty).map((l) => l.name),
  };
}
