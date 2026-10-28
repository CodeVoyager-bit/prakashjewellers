import Link from "next/link";
import { ArrowIcon, CalculatorIcon, ChatIcon, ClockIcon, GemIcon, InstagramIcon, PinIcon, TagIcon } from "@/components/icons";
import { Calculator } from "@/components/calculator";
import { CollectionTiles, Empty, ItemGrid, Photo, RateTag, SearchForm, SectionHead } from "@/components/shop";
import { collections, getItems, getSettings } from "@/lib/data";

export default async function Home() {
  const [s, items] = await Promise.all([getSettings(), getItems()]);
  // The hero collage is the three newest cover photos, so it changes as the store adds pieces.
  const covers = items.flatMap((i) => i.photos.slice(0, 1)).slice(0, 3);
  const featured = items.filter((i) => i.featured).slice(0, 4);
  const latest = items.filter((i) => !i.featured).slice(0, 6);
  const rate = s.rates.find((r) => r.perGram) ?? s.rates[0];

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="collage" data-count={Math.max(covers.length, 1)}>
            {covers.length ? (
              covers.map((c, i) => (
                <div key={c} className="frame" style={{ "--i": i } as React.CSSProperties}>
                  <Photo id={c} alt="" sizes={i ? "(min-width: 900px) 18vw, 38vw" : "(min-width: 900px) 30vw, 58vw"} preload w={i ? 600 : 900} h={i ? 750 : 1200} />
                </div>
              ))
            ) : (
              <div className="frame">
                <Photo alt="" />
              </div>
            )}
            <RateTag rate={rate} />
          </div>
          <div className="hero-copy">
            <p className="eyebrow rise" style={{ "--i": 0 } as React.CSSProperties}>
              Traditional gold jewellery
            </p>
            <h1 className="rise" style={{ "--i": 1 } as React.CSSProperties}>
              Find the design you fell in love with.
            </h1>
            <p className="lede rise" style={{ "--i": 2 } as React.CSSProperties}>
              Bridal sets, mangalsutras, earrings and everyday pieces, each weighed individually and priced from the store’s
              published gold rate.
            </p>
            <div className="hero-ctas rise" style={{ "--i": 3 } as React.CSSProperties}>
              <Link href="/collections" className="btn btn-primary btn-caps">
                Explore Collections <ArrowIcon size={18} />
              </Link>
              <Link href="/calculator" className="btn btn-ghost">
                <CalculatorIcon size={18} /> Price Calculator
              </Link>
            </div>
            {items.some((i) => i.demo) && (
              <p className="demo-note rise" style={{ "--i": 4 } as React.CSSProperties}>
                Showing sample pieces and photos for demonstration.
              </p>
            )}
          </div>
        </div>
      </section>

      {items.length > 0 && (
        <section className="wrap section" aria-labelledby="worlds">
          <SectionHead id="worlds" eyebrow="Explore our worlds" title="Shop by Collection" link={{ href: "/collections", label: "View All" }} />
          <CollectionTiles collections={collections(items)} />
        </section>
      )}

      {featured.length > 0 && (
        <section className="wrap section" aria-labelledby="featured">
          <SectionHead id="featured" eyebrow="Chosen by the store" title="Featured Pieces" />
          <ItemGrid items={featured} s={s} />
        </section>
      )}

      <section className="wrap section" aria-labelledby="latest">
        <SectionHead id="latest" eyebrow="New arrivals" title="Latest Pieces" link={items.length > 6 ? { href: "/collections", label: "View All" } : undefined} />
        {latest.length ? (
          <ItemGrid items={latest} s={s} />
        ) : (
          <Empty title="New designs coming soon" phone={s.phone}>
            The store is photographing its latest pieces. Call to ask about anything you have in mind.
          </Empty>
        )}
      </section>

      <section className="wrap section home-calc reveal" id="calculator" aria-labelledby="calc-title">
        <div className="home-calc-intro">
          <span className="home-calc-icon" aria-hidden="true">
            <CalculatorIcon size={28} />
          </span>
          <p className="eyebrow">Price calculator</p>
          <h2 id="calc-title">What Would It Cost Today?</h2>
          <p className="muted">
            Type a weight to see the metal value, making charge and tax at the store’s published rate. The store confirms the
            final price when the piece is weighed.
          </p>
        </div>
        <Calculator rates={s.rates} makingPct={s.makingPct} taxPct={s.taxPct} />
      </section>

      <section className="wrap section">
        <div className="code-search reveal">
          <InstagramIcon size={28} />
          <p className="eyebrow">Seen on Instagram?</p>
          <h2>Search the Design Code</h2>
          <p className="muted">Type the code from the post, like PJ-024, to see the piece and today’s estimate.</p>
          <SearchForm />
          {s.instagram && (
            <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noopener noreferrer" className="text-link">
              Follow @{s.instagram} for new designs
            </a>
          )}
        </div>
      </section>

      <section className="wrap section">
        <div className="visit-band reveal">
          <div>
            <p className="eyebrow">Visit the store</p>
            <h2 translate="no">{s.name}</h2>
            <ul className="visit-facts">
              <li>
                <PinIcon size={18} /> {s.address || <span className="placeholder">Address to be confirmed</span>}
              </li>
              <li>
                <ClockIcon size={18} /> {s.hours || <span className="placeholder">Opening hours to be confirmed</span>}
              </li>
            </ul>
          </div>
          <Link href="/visit" className="btn btn-quiet">
            Directions &amp; Contact <ArrowIcon size={18} />
          </Link>
        </div>
      </section>

      <section className="wrap section">
        <ul className="promises">
          <li className="reveal" style={{ "--i": 0 } as React.CSSProperties}>
            <TagIcon size={26} />
            <span>Estimates from the store’s published rate</span>
          </li>
          <li className="reveal" style={{ "--i": 1 } as React.CSSProperties}>
            <GemIcon size={26} />
            <span>Every piece weighed individually</span>
          </li>
          <li className="reveal" style={{ "--i": 2 } as React.CSSProperties}>
            <ChatIcon size={26} />
            <span>Enquire on WhatsApp, no login</span>
          </li>
        </ul>
      </section>
    </>
  );
}
