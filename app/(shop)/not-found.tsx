import Link from "next/link";
import { Monogram } from "@/components/logo";
import { ItemGrid, SearchForm, SectionHead } from "@/components/shop";
import { getItems, getSettings } from "@/lib/data";

export const metadata = { title: "Page Not Found" };

// Shown for unknown URLs and missing pieces, inside the shop header and footer, with ways back into the catalogue.
export default async function NotFound() {
  const [s, items] = await Promise.all([getSettings(), getItems()]);
  return (
    <>
      <section className="wrap lost">
        <Monogram className="lost-mark rise" size={56} />
        <p className="eyebrow rise" style={{ "--i": 1 } as React.CSSProperties}>
          Error 404
        </p>
        <h1 className="rise" style={{ "--i": 2 } as React.CSSProperties}>
          This Page Has Gone Missing
        </h1>
        <p className="muted rise" style={{ "--i": 3 } as React.CSSProperties}>
          The link may be old, or the piece may no longer be listed. Search by name or design code, or browse today’s
          collection.
        </p>
        <div className="lost-search rise" style={{ "--i": 4 } as React.CSSProperties}>
          <SearchForm />
        </div>
        <div className="lost-ctas rise" style={{ "--i": 5 } as React.CSSProperties}>
          <Link href="/collections" className="btn btn-primary">
            Explore the Collection
          </Link>
          <Link href="/" className="btn btn-quiet">
            Back to Home
          </Link>
        </div>
      </section>
      {items.length > 0 && (
        <section className="wrap section lost-latest" aria-labelledby="lost-latest">
          <SectionHead id="lost-latest" eyebrow="New arrivals" title="Latest Pieces" />
          <ItemGrid items={items.slice(0, 4)} s={s} />
        </section>
      )}
    </>
  );
}
