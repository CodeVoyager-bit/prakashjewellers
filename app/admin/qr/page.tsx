import { headers } from "next/headers";
import QRCode from "qrcode";
import { AdminBar } from "@/components/admin-bar";
import { PrintButton } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/data";

export const metadata = { title: "Counter QR", robots: { index: false } };

export default async function QrPage() {
  await requireStaff();
  const h = await headers();
  const site = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const [s, svg] = await Promise.all([getSettings(), QRCode.toString(site, { type: "svg", margin: 0, errorCorrectionLevel: "M" })]);

  return (
    <>
      <AdminBar name={s.name} current="/admin" />
      <main className="wrap admin">
        <div className="qr-card">
          <p className="eyebrow" translate="no">
            {s.name}
          </p>
          <h1>See today’s gold rate &amp; designs</h1>
          {/* SVG generated above from our own URL. */}
          <div className="qr" role="img" aria-label={`QR code for ${site}`} dangerouslySetInnerHTML={{ __html: svg }} />
          <p className="muted">Scan with your phone camera. Add pieces you like and send us an enquiry on WhatsApp.</p>
          <p className="fine">{site.replace(/^https?:\/\//, "")}</p>
        </div>
        <div className="no-print qr-actions">
          <PrintButton />
          <p className="help">Reprint this card if the site moves to its own domain.</p>
        </div>
      </main>
    </>
  );
}
