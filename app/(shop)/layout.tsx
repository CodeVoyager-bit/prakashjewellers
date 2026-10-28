import Link from "next/link";
import { CartLink, TabNav } from "@/components/cart";
import { InstagramIcon, SearchIcon } from "@/components/icons";
import { RateTicker } from "@/components/shop";
import { TrackVisit } from "@/components/ui";
import { getSettings } from "@/lib/data";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  return (
    <>
      <TrackVisit />
      <a href="#main" className="skip">
        Skip to Content
      </a>
      <header className="site-head">
        <div className="wrap head-row">
          <Link href="/collections#q" className="icon-btn head-search" aria-label="Search by name or design code">
            <SearchIcon size={21} />
          </Link>
          <Link href="/" className="wordmark" translate="no">
            {s.name}
          </Link>
          <TabNav />
          <CartLink />
        </div>
      </header>
      <RateTicker rates={s.rates} />
      <main id="main">{children}</main>
      <footer className="site-foot">
        <div className="wrap foot-grid">
          <div className="foot-shop">
            <p className="wordmark foot-mark" translate="no">
              {s.name}
            </p>
            <p className="muted">{s.address || "Store address to be confirmed"}</p>
            <p className="foot-links">
              <Link href="/visit">Visit &amp; Contact</Link>
              <Link href="/calculator">Price Calculator</Link>
              {s.instagram && (
                <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noopener noreferrer">
                  <InstagramIcon size={18} /> @{s.instagram}
                </a>
              )}
            </p>
          </div>
          <p className="fine">
            Prices are estimates from the store’s published gold rate, making charge and tax settings. Each piece is weighed
            individually. Final price and availability will be confirmed by the store. No online payment or order is taken on
            this site.
          </p>
        </div>
      </footer>
    </>
  );
}
