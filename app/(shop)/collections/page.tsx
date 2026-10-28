import Link from "next/link";
import { Empty, ItemGrid, SearchForm } from "@/components/shop";
import { getCategories, getItems, getSettings } from "@/lib/data";
import { count } from "@/lib/price";

export const metadata = { title: "Collections" };

export default async function CollectionsPage({ searchParams }: { searchParams: Promise<{ c?: string; q?: string }> }) {
  const { c, q } = await searchParams;
  const [s, items, categories] = await Promise.all([getSettings(), getItems({ category: c, q }), getCategories()]);

  return (
    <>
      <section className="banner">
        <div className="wrap">
          <p className="eyebrow">Curated jewellery, priced at today’s rate</p>
          <h1>{q ? `Results for “${q}”` : (c ?? "All Collections")}</h1>
        </div>
      </section>

      <div className="wrap catalogue">
        <SearchForm q={q} />
        {categories.length > 1 && (
          <nav className="chips" aria-label="Categories">
            <Link href="/collections" className="chip" aria-current={c || q ? undefined : "page"} scroll={false}>
              All
            </Link>
            {categories.map((x) => (
              <Link key={x} href={`/collections?c=${encodeURIComponent(x)}`} className="chip" aria-current={x === c ? "page" : undefined} scroll={false}>
                {x}
              </Link>
            ))}
          </nav>
        )}
        <p className="count">{count(items.length, "piece")}</p>
        {items.length ? (
          <ItemGrid items={items} rate={s.rate} />
        ) : q ? (
          <Empty title="No pieces match" phone={s.phone}>
            Check the design code, or browse all collections. The shop can also help on a call.
          </Empty>
        ) : (
          <Empty title="New designs coming soon" phone={s.phone}>
            The shop is photographing its latest pieces. Call to ask about anything you have in mind.
          </Empty>
        )}
      </div>
    </>
  );
}
