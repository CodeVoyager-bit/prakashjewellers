import { BSON } from "mongodb";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ENQUIRY_STATUSES, enquiryRef, getAllItems, getSettings, isEnquiryStatus, priceFor } from "@/lib/data";

const csv = (rows: (string | number | boolean | null | undefined)[][]) =>
  rows.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");

// Staff-only downloads for handover and the pilot review. Auth accounts are never included.
export async function GET(_: Request, { params }: { params: Promise<{ file: string }> }) {
  if (!(await auth.api.getSession({ headers: await headers() }))) return new Response("Sign in first", { status: 401 });
  const { file } = await params;
  const stamp = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const send = (body: string, type: string, name: string, ext = "csv") =>
    new Response(body, { headers: { "Content-Type": type, "Content-Disposition": `attachment; filename="prakash-${name}-${stamp}.${ext}"` } });

  if (file === "items.csv") {
    const [s, items] = await Promise.all([getSettings(), getAllItems()]);
    return send(
      csv([
        ["Design code", "Piece", "Name", "Category", "Status", "Pricing", "Rate category", "Gross g", "Billable g", "Making %", "Additional ₹", "Fixed ₹", "Estimate ₹", "Stock", "Views", "Cart adds", "Enquiries", "Sample"],
        ...items.map((i) => [i.code, i.piece, i.name, i.category, i.status, i.pricing, i.rateKey, i.weight, i.netWeight, i.making ?? s.makingPct, i.extraCharge, i.fixedPrice, priceFor(i, s)?.total, i.qty, i.views, i.cartAdds, i.enquiries, i.demo]),
      ]),
      "text/csv; charset=utf-8",
      "products",
    );
  }
  if (file === "enquiries.csv") {
    const rows = await db.collection("enquiries").find({ opened: true }).sort({ createdAt: -1 }).toArray();
    return send(
      csv([["Date", "Ref", "Status", "Pieces", "Estimate ₹", "Rates", "Note"], ...rows.map((e) => [e.createdAt.toISOString(), enquiryRef(e._id), isEnquiryStatus(e.status) ? ENQUIRY_STATUSES[e.status] : e.status, e.items.map((i: { name: string; code: string; qty: number }) => `${i.name} ${i.code} x${i.qty}`).join("; "), e.total, e.rates, e.note])]),
      "text/csv; charset=utf-8",
      "enquiries",
    );
  }
  if (file === "sales.csv") {
    const rows = await db.collection("sales").find().sort({ at: -1 }).toArray();
    return send(csv([["Date", "Design code", "Piece", "Name", "Estimate ₹", "By"], ...rows.map((x) => [x.at.toISOString(), x.code, x.piece, x.name, x.estimate, x.by])]), "text/csv; charset=utf-8", "sales");
  }
  if (file === "stats.csv") {
    const rows = await db.collection("stats").find().sort({ _id: 1 }).toArray();
    return send(csv([["Day", "Visits", "Product views", "Cart adds", "WhatsApp opened"], ...rows.map((d) => [String(d._id), d.visits, d.views, d.cartAdds, d.whatsapp])]), "text/csv; charset=utf-8", "daily-stats");
  }
  if (file === "backup.json") {
    const names = ["settings", "items", "enquiries", "sales", "stats", "counters"];
    const dump = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await db.collection(n).find().toArray()] as const)));
    // Extended JSON keeps ObjectIds and dates as their real types, so the backup can be restored as it was.
    return send(BSON.EJSON.stringify({ exportedAt: new Date(), ...dump }, undefined, 2, { relaxed: true }), "application/json", "backup", "json");
  }
  return new Response("Not found", { status: 404 });
}
