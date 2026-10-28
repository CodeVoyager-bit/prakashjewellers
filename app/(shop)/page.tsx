import Link from "next/link";
import { Empty, ItemCard, RateTag } from "@/components/shop";
import { getCategories, getItems, getSettings } from "@/lib/data";
import { count } from "@/lib/price";

export default async function Catalogue({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const [s, items, categories] = await Promise.all([getSettings(), getItems(c), getCategories()]);
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow">Handcrafted gold jewellery</p>
            <h1>Every piece, priced at today’s gold rate</h1>
            <p className="lede">
              Prices update with the day’s 22K rate. Add the pieces you love and send one enquiry on WhatsApp. No login, no
              payment online.
            </p>
          </div>
          <RateTag rate={s.rate} rateAt={s.rateAt} />
        </div>
      </section>

      <section className="wrap catalogue" aria-labelledby="catalogue-title">
        <div className="cat-head">
          <h2 id="catalogue-title">{c ?? "All Jewellery"}</h2>
          <p className="count">{count(items.length, "piece")}</p>
        </div>
        {categories.length > 1 && (
          <nav className="chips" aria-label="Categories">
            <Link href="/" className="chip" aria-current={c ? undefined : "page"} scroll={false}>
              All
            </Link>
            {categories.map((x) => (
              <Link key={x} href={`/?c=${encodeURIComponent(x)}`} className="chip" aria-current={x === c ? "page" : undefined} scroll={false}>
                {x}
              </Link>
            ))}
          </nav>
        )}
        {items.length ? (
          <ul className="grid">
            {items.map((item, i) => (
              <li key={item.id}>
                <ItemCard item={item} rate={s.rate} preload={i < 2} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="New designs coming soon" phone={s.phone}>
            The shop is photographing its latest pieces. Call to ask about anything you have in mind.
          </Empty>
        )}
      </section>
    </>
  );
}
