import Link from "next/link";
import { Filters } from "@/components/filters";
import { Empty, ItemGrid, SearchForm } from "@/components/shop";
import { getCategories, getItems, getSettings, sortItems, type Avail, type Sort } from "@/lib/data";
import { count } from "@/lib/price";

export const metadata = { title: "Collections" };

const AVAILS: Avail[] = ["all", "in", "out"];
const SORTS: Sort[] = ["new", "price-asc", "price-desc", "weight"];

export default async function CollectionsPage({ searchParams }: { searchParams: Promise<{ c?: string; q?: string; avail?: string; sort?: string }> }) {
  const p = await searchParams;
  const avail = AVAILS.find((a) => a === p.avail) ?? "all";
  const sort = SORTS.find((x) => x === p.sort) ?? "new";
  const [s, found, categories] = await Promise.all([getSettings(), getItems({ category: p.c, q: p.q, avail }), getCategories()]);
  const items = sortItems(found, sort, s);
  const keep = (extra: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ q: p.q, avail: avail !== "all" ? avail : undefined, sort: sort !== "new" ? sort : undefined, ...extra }).filter(([, v]) => v) as [string, string][]);
    return `/collections${u.size ? `?${u}` : ""}`;
  };

  return (
    <>
      <section className="banner">
        <div className="wrap">
          <p className="eyebrow rise">Every piece weighed and priced individually</p>
          <h1 className="rise" style={{ "--i": 1 } as React.CSSProperties}>
            {p.q ? `Results for “${p.q}”` : (p.c ?? "All Collections")}
          </h1>
        </div>
      </section>

      <div className="wrap catalogue">
        <SearchForm q={p.q} />
        {categories.length > 1 && (
          <nav className="chips" aria-label="Categories">
            <Link href={keep({ c: undefined })} className="chip" aria-current={p.c ? undefined : "page"} scroll={false}>
              All
            </Link>
            {categories.map((x) => (
              <Link key={x} href={keep({ c: x })} className="chip" aria-current={x === p.c ? "page" : undefined} scroll={false}>
                {x}
              </Link>
            ))}
          </nav>
        )}
        <div className="toolbar">
          <p className="count" aria-live="polite">
            {count(items.length, "piece")}
          </p>
          <Filters c={p.c} q={p.q} avail={avail} sort={sort} />
        </div>
        {items.length ? (
          <ItemGrid items={items} s={s} />
        ) : p.q || avail !== "all" || p.c ? (
          <Empty title="No pieces match" phone={s.phone} action={<Link href="/collections" className="btn btn-primary">Clear Search &amp; Filters</Link>}>
            Check the design code or spelling, or browse everything. The store can also help on a call.
          </Empty>
        ) : (
          <Empty title="New designs coming soon" phone={s.phone}>
            The store is photographing its latest pieces. Call to ask about anything you have in mind.
          </Empty>
        )}
      </div>
    </>
  );
}
