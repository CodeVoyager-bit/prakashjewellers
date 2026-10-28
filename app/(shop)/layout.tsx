import Link from "next/link";
import { InstagramIcon, PhoneIcon, SearchIcon } from "@/components/icons";
import { TabNav } from "@/components/saved";
import { getSettings } from "@/lib/data";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <>
      <a href="#main" className="skip">
        Skip to Content
      </a>
      <header className="site-head">
        <div className="wrap head-row">
          <Link href="/" className="wordmark" translate="no">
            {s.name}
          </Link>
          <TabNav />
          {s.phone ? (
            <a href={`tel:${s.phone}`} className="icon-btn head-call" aria-label={`Call ${s.name}`}>
              <PhoneIcon size={21} />
            </a>
          ) : (
            <span className="head-call" />
          )}
          <Link href="/collections#q" className="icon-btn head-search" aria-label="Search by name or design code">
            <SearchIcon size={21} />
          </Link>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="site-foot">
        <div className="wrap foot-grid">
          <div className="foot-shop">
            <p className="wordmark foot-mark" translate="no">
              {s.name}
            </p>
            {s.address && <p className="muted">{s.address}</p>}
            <p className="foot-links">
              <Link href="/visit">Visit &amp; Contact</Link>
              {s.instagram && (
                <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noopener noreferrer">
                  <InstagramIcon size={18} /> @{s.instagram}
                </a>
              )}
            </p>
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
