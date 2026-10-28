import Link from "next/link";
import { CartLink, CartToast, TabNav } from "@/components/cart";
import { InstagramIcon, SearchIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { RateBar } from "@/components/shop";
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
      <RateBar rates={s.rates} />
      {/* Centred wordmark between search and the cart; on desktop the nav sits on a row beneath. */}
      <header className="site-head">
        <div className="wrap head-row">
          <Link href="/collections#q" className="icon-btn head-search" aria-label="Search by name or design code">
            <SearchIcon size={20} />
          </Link>
          <Link href="/" className="brandmark" aria-label={`${s.name}, home`} translate="no">
            <Logo compact />
          </Link>
          <CartLink />
          <TabNav />
        </div>
      </header>
      <CartToast />
      <main id="main">{children}</main>
      <footer className="site-foot">
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-col foot-brand">
              <Logo light />
            </div>
            <nav className="foot-col" aria-label="Explore">
              <p className="foot-head">Explore</p>
              <Link href="/collections">All Collections</Link>
              <Link href="/calculator">Price Calculator</Link>
              <Link href="/cart">Enquiry Cart</Link>
            </nav>
            <div className="foot-col">
              <p className="foot-head">Visit</p>
              <p>{s.address || <span className="foot-placeholder">Address to be confirmed</span>}</p>
              <p>{s.hours || <span className="foot-placeholder">Opening hours to be confirmed</span>}</p>
              <Link href="/visit">Directions &amp; Contact</Link>
            </div>
            <div className="foot-col">
              <p className="foot-head">Follow</p>
              {s.instagram ? (
                <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noopener noreferrer">
                  <InstagramIcon size={18} /> @{s.instagram}
                </a>
              ) : (
                <span className="foot-placeholder">Instagram to be confirmed</span>
              )}
            </div>
          </div>
          <div className="foot-bottom">
            <p className="foot-fine">
              Prices are estimates from the store’s published gold rate, making charge and tax settings. Final price and
              availability will be confirmed by the store. No online payment or order is taken on this site.
            </p>
            <Link href="/admin/login" className="foot-staff">
              Staff Login
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
