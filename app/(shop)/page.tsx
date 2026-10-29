import Link from "next/link";
import { ArrowIcon, ChatIcon, ClockIcon, GemIcon, PinIcon, TagIcon } from "@/components/icons";
import { Calculator } from "@/components/calculator";
import { CollectionTiles, Empty, ItemGrid, Photo, SearchForm, SectionHead } from "@/components/shop";
import { HeroSlides } from "@/components/ui";
import { collections, getItems, getSettings } from "@/lib/data";

export default async function Home() {
  const [s, items] = await Promise.all([getSettings(), getItems()]);
  // The hero crossfades the store's newest cover photos, so it changes as pieces are added.
  const covers = items.flatMap((i) => i.photos.slice(0, 1)).slice(0, 3);
  const featured = items.filter((i) => i.featured).slice(0, 4);
  const latest = items.filter((i) => !i.featured).slice(0, 8);
  // A photo the hero isn't already showing, so the band doesn't repeat it.
  const story = items.flatMap((i) => i.photos).find((p) => !covers.includes(p)) ?? covers[0];

  return (
    <>
      <section className="hero">
        <HeroSlides photos={covers} />
        <div className="hero-veil" aria-hidden="true" />
        <div className="wrap hero-copy">
          <p className="eyebrow rise">Traditional gold jewellery</p>
          <h1 className="rise" style={{ "--i": 1 } as React.CSSProperties}>
            Find the design you fell in love with
          </h1>
          <div className="hero-ctas rise" style={{ "--i": 2 } as React.CSSProperties}>
            <Link href="/collections" className="btn btn-light">
              Discover the Collection
            </Link>
            <Link href="#calculator" className="link-light">
              Price Calculator
            </Link>
          </div>
          {items.some((i) => i.demo) && (
            <p className="demo-note rise" style={{ "--i": 3 } as React.CSSProperties}>
              Sample pieces and photos shown for demonstration
            </p>
          )}
        </div>
      </section>

      {items.length > 0 && (
        <section className="wrap section" aria-labelledby="worlds">
          <SectionHead id="worlds" eyebrow="Explore" title="The Collections" link={{ href: "/collections", label: "View All Jewellery" }} />
          <CollectionTiles collections={collections(items)} />
        </section>
      )}

      {featured.length > 0 && (
        <section className="wrap section" aria-labelledby="featured">
          <SectionHead id="featured" eyebrow="Chosen by the store" title="Featured Pieces" />
          <ItemGrid items={featured} s={s} />
        </section>
      )}

      <section className="wrap section home-latest" aria-labelledby="latest">
        <SectionHead id="latest" eyebrow="New arrivals" title="Latest Pieces" link={latest.length ? { href: "/collections", label: "View All" } : undefined} />
        {latest.length ? (
          <ItemGrid items={latest} s={s} />
        ) : (
          <Empty title="New designs coming soon" phone={s.phone}>
            The store is photographing its latest pieces. Call to ask about anything you have in mind.
          </Empty>
        )}
      </section>

      {/* Editorial band: how prices are worked out, the store's real difference. No invented heritage claims. */}
      <section className="story reveal" aria-labelledby="story-title">
        <div className="story-media" aria-hidden="true">
          <Photo id={story} alt="" sizes="(min-width: 900px) 50vw, 100vw" w={1400} h={1750} />
        </div>
        <div className="story-copy">
          <p className="eyebrow">Weighed, not guessed</p>
          <h2 id="story-title">Every Piece, Priced at Today’s Rate</h2>
          <p>
            Each piece is weighed on its own, so its price comes from its own gold weight, the store’s published rate for its
            purity, the making charge and tax. You see the full breakdown before you enquire.
          </p>
          <Link href="#calculator" className="btn btn-quiet">
            Try the Calculator
          </Link>
        </div>
      </section>

      <section className="wrap section home-calc reveal" id="calculator" aria-labelledby="calc-title">
        <SectionHead id="calc-title" eyebrow="Price calculator" title="What Would It Cost Today?" />
        <p className="muted section-lede">
          Type a weight to see the metal value, making charge and tax at the store’s published rate. The store confirms the
          final price when the piece is weighed.
        </p>
        <Calculator rates={s.rates} makingPct={s.makingPct} taxPct={s.taxPct} />
      </section>

      <section className="wrap section code-search reveal" aria-labelledby="insta-title">
        <SectionHead id="insta-title" eyebrow="Seen on Instagram?" title="Search the Design Code" />
        <p className="muted section-lede">Type the code from the post, like PJ-024, to see the piece and today’s estimate.</p>
        <SearchForm />
        {s.instagram && (
          <a href={`https://instagram.com/${s.instagram}`} target="_blank" rel="noopener noreferrer" className="text-link">
            Follow @{s.instagram}
          </a>
        )}
      </section>

      <section className="wrap section">
        <ul className="services">
          <li className="reveal">
            <TagIcon size={26} />
            <p className="service-title">Transparent Estimates</p>
            <p className="muted">From the store’s published rate, with every charge shown.</p>
          </li>
          <li className="reveal">
            <GemIcon size={26} />
            <p className="service-title">Weighed Individually</p>
            <p className="muted">Each piece keeps its own weight and number.</p>
          </li>
          <li className="reveal">
            <ChatIcon size={26} />
            <p className="service-title">Enquire on WhatsApp</p>
            <p className="muted">No login and no payment online. The store replies with a quote.</p>
          </li>
        </ul>
      </section>

      <section className="visit-band reveal" aria-labelledby="visit-title">
        <div className="wrap visit-inner">
          <p className="eyebrow">Visit the store</p>
          <h2 id="visit-title" translate="no">
            {s.name}
          </h2>
          <ul className="visit-facts">
            <li>
              <PinIcon size={18} /> {s.address || <span className="placeholder">Address to be confirmed</span>}
            </li>
            <li>
              <ClockIcon size={18} /> {s.hours || <span className="placeholder">Opening hours to be confirmed</span>}
            </li>
          </ul>
          <Link href="/visit" className="btn btn-light">
            Directions &amp; Contact <ArrowIcon size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
