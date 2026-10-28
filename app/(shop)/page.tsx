import Link from "next/link";
import { ArrowIcon, ChatIcon, GemIcon, TagIcon } from "@/components/icons";
import { CollectionTiles, Empty, ItemGrid, Photo, RateTag, SearchForm, SectionHead } from "@/components/shop";
import { collections, getItems, getSettings } from "@/lib/data";

export default async function Home() {
  const [s, items] = await Promise.all([getSettings(), getItems()]);
  // The hero collage is the three newest cover photos, so it changes as the owner adds pieces.
  const covers = items.flatMap((i) => i.photos.slice(0, 1)).slice(0, 3);
  const worlds = collections(items);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="collage" data-count={Math.max(covers.length, 1)}>
            {covers.length ? (
              covers.map((c, i) => (
                <div key={c} className="frame">
                  <Photo id={c} alt="" sizes={i ? "(min-width: 900px) 18vw, 38vw" : "(min-width: 900px) 30vw, 58vw"} preload w={i ? 600 : 900} h={i ? 750 : 1200} />
                </div>
              ))
            ) : (
              <div className="frame">
                <Photo alt="" />
              </div>
            )}
            <RateTag rate={s.rate} rateAt={s.rateAt} />
          </div>
          <div className="hero-copy">
            <p className="eyebrow">New designs, every week</p>
            <h1>Find the design you fell in love with.</h1>
            <p className="lede">Traditional gold jewellery for bridal, daily wear and gifts, every price worked out at today’s 22K rate.</p>
            <Link href="/collections" className="btn btn-primary btn-caps">
              Explore Collections <ArrowIcon size={18} />
            </Link>
          </div>
        </div>
      </section>

      {worlds.length > 0 && (
        <section className="wrap section" aria-labelledby="worlds">
          <SectionHead id="worlds" eyebrow="Explore our worlds" title="Shop by Collection" link={{ href: "/collections", label: "View All" }} />
          <CollectionTiles collections={worlds} />
        </section>
      )}

      <section className="wrap section" aria-labelledby="latest">
        <SectionHead id="latest" eyebrow="New arrivals" title="Latest Pieces" link={items.length > 6 ? { href: "/collections", label: "View All" } : undefined} />
        {items.length ? (
          <ItemGrid items={items.slice(0, 6)} rate={s.rate} />
        ) : (
          <Empty title="New designs coming soon" phone={s.phone}>
            The shop is photographing its latest pieces. Call to ask about anything you have in mind.
          </Empty>
        )}
      </section>

      <section className="wrap section">
        <div className="code-search">
          <p className="eyebrow">Seen on Instagram?</p>
          <h2>Search the Design Code</h2>
          <p className="muted">Type the code from the post, like PJ-024, to see the piece and today’s price.</p>
          <SearchForm />
        </div>
      </section>

      <section className="wrap section">
        <ul className="promises">
          <li>
            <TagIcon size={26} />
            <span>Priced at today’s gold rate</span>
          </li>
          <li>
            <GemIcon size={26} />
            <span>Handcrafted 22K gold</span>
          </li>
          <li>
            <ChatIcon size={26} />
            <span>Enquire on WhatsApp, no login</span>
          </li>
        </ul>
      </section>
    </>
  );
}
