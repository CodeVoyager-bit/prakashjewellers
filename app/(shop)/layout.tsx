import Link from "next/link";
import { CartLink } from "@/components/cart";
import { PhoneIcon, PinIcon } from "@/components/icons";
import { getSettings } from "@/lib/data";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const initials = s.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <>
      <a href="#main" className="skip">
        Skip to Content
      </a>
      <header className="site-head">
        <div className="wrap head-row">
          <Link href="/" className="brand" translate="no">
            <span className="mono" aria-hidden="true">
              {initials}
            </span>
            <span>{s.name}</span>
          </Link>
          <nav className="head-actions" aria-label="Shop">
            {s.phone && (
              <a href={`tel:${s.phone}`} className="icon-btn" aria-label={`Call ${s.name}`}>
                <PhoneIcon size={22} />
              </a>
            )}
            <CartLink />
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="site-foot">
        <div className="wrap foot-grid">
          <div className="foot-shop">
            <p className="foot-brand" translate="no">
              {s.name}
            </p>
            {s.address && (
              <p className="foot-line">
                <PinIcon size={18} /> {s.address}
              </p>
            )}
            {s.phone && (
              <p className="foot-line">
                <PhoneIcon size={18} /> <a href={`tel:${s.phone}`}>{s.phone}</a>
              </p>
            )}
          </div>
          <p className="fine">
            Prices are estimates at today’s 22K gold rate, including making charges and 3% GST. Handmade pieces vary slightly in
            weight, so the shop confirms the final price when the piece is weighed.
          </p>
        </div>
      </footer>
    </>
  );
}
