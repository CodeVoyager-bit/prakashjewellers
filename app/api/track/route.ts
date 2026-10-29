import { bump, enquiriesDb, itemsDb, oid } from "@/lib/data";

// Pilot analytics, sent with navigator.sendBeacon so it never delays the customer.
// visit: first page of a browsing session · view: product page · cart: added to enquiry cart
// whatsapp: tapped "Continue to WhatsApp" (we can't know whether they then sent it)
// ponytail: counted in this server instance's memory; a shared limit in MongoDB if real abuse ever shows up.
const recent = new Map<string, number[]>();
const tooMany = (ip: string) => {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  hits.push(now);
  if (recent.size > 5000) recent.clear();
  recent.set(ip, hits);
  return hits.length > 60;
};

export async function POST(req: Request) {
  // Only the live site counts. Local dev servers and preview deployments use the same database, and their test
  // traffic once added thousands of views (a dev tab reloading on every code change).
  if (process.env.VERCEL_ENV !== "production") return new Response(null, { status: 204 });
  // More than 60 events in 10 minutes from one connection isn't a person browsing.
  if (tooMany(req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "")) return new Response(null, { status: 204 });
  let body: { e?: string; id?: string };
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!body || typeof body !== "object") return new Response(null, { status: 400 });
  const _id = oid(String(body.id ?? ""));
  switch (body.e) {
    case "visit":
      await bump("visits");
      break;
    case "view":
      if (!_id) break;
      await Promise.all([bump("views"), itemsDb.updateOne({ _id }, { $inc: { views: 1 } })]);
      break;
    case "cart":
      if (!_id) break;
      await Promise.all([bump("cartAdds"), itemsDb.updateOne({ _id }, { $inc: { cartAdds: 1 } })]);
      break;
    case "whatsapp": {
      if (!_id) break;
      // Counted once per prepared enquiry, however many times the button is tapped.
      const e = await enquiriesDb.findOneAndUpdate({ _id, opened: false }, { $set: { opened: true } });
      if (e) {
        const ids = e.items.map((i) => oid(i.id)).filter((x) => x !== null);
        await Promise.all([bump("whatsapp"), itemsDb.updateMany({ _id: { $in: ids } }, { $inc: { enquiries: 1 } })]);
      }
      break;
    }
  }
  return new Response(null, { status: 204 });
}
