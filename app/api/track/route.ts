import { bump, enquiriesDb, itemsDb, oid } from "@/lib/data";

// Pilot analytics, sent with navigator.sendBeacon so it never delays the customer.
// visit: first page of a browsing session · view: product page · cart: added to enquiry cart
// whatsapp: tapped "Continue to WhatsApp" (we can't know whether they then sent it)
export async function POST(req: Request) {
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
