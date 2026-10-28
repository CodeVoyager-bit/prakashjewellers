import Link from "next/link";
import { AdminBar } from "@/components/admin-bar";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/data";

export const metadata = { title: "Staff Guide", robots: { index: false } };

const STEPS: [string, React.ReactNode][] = [
  ["Every morning: update the rates", <>Open <Link href="/admin/rates">Rates</Link>, pick “per gram” or “per 10 grams”, type today’s rate for each purity you sell, check the preview, save. Until you do, customers see “today’s rate not yet published” next to prices.</>],
  ["New piece arrives", <>Weigh it. In <Link href="/admin/products">Products</Link>, use <strong>New Piece</strong> on the same design (or <Link href="/admin/item/new">Add Product</Link> for a new design). Enter <strong>this piece’s</strong> gross weight, and the gold weight if stones are excluded. Never reuse an old piece’s weight.</>],
  ["Photos", <>Good light, plain background, the whole piece in frame. Add several; the first is the cover. Use ← → to reorder.</>],
  ["A customer messages on WhatsApp", <>Their message has a Ref like PJ-1A2B3C and the codes, piece numbers and weights. Confirm the price from the scale and today’s rate. In <Link href="/admin/enquiries">Enquiries</Link>, set the status. An enquiry never holds stock.</>],
  ["A piece is sold", <>In Products, tap <strong>Mark Sold</strong>. Stock goes down by one and the sale is logged. At zero the piece shows as sold out (customers can still ask for one to be made).</>],
  ["Hide something", <><strong>Draft</strong> hides a piece while you finish it; you can still preview it. <strong>Archive</strong> hides it for good but keeps the record. Delete only mistakes.</>],
  ["Before launch", <>Run <code>npm run demo:remove</code> to clear the sample pieces, fill in the store details in <Link href="/admin/settings">Settings</Link>, confirm the making and tax figures with the owner, and print the <Link href="/admin/qr">counter QR</Link> from the live site.</>],
  ["Backups", <>Download a backup from the Dashboard every week (Backup button). The CSV exports open in Excel or Google Sheets.</>],
];

export default async function GuidePage() {
  await requireStaff();
  const s = await getSettings();
  return (
    <>
      <AdminBar name={s.name} current="/admin/guide" />
      <main className="wrap admin narrow">
        <h1>Staff Guide</h1>
        <p className="muted">Five minutes to learn. Sign in with your mobile number and password; ask the site owner to reset it if you forget.</p>
        <ol className="guide">
          {STEPS.map(([title, body]) => (
            <li key={title} className="panel">
              <h2>{title}</h2>
              <p>{body}</p>
            </li>
          ))}
        </ol>
      </main>
    </>
  );
}
