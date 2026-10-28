import Link from "next/link";
import type { Item } from "@/lib/data";
import { formatDay, isToday, priceOf, rupees } from "@/lib/price";
import { GemIcon, PhoneIcon, SearchIcon } from "./icons";
import { Photo } from "./photo";
import { SaveButton } from "./saved";

export { Photo };

// The signature: a jeweller's gold price tag carrying the day's rate.
export function RateTag({ rate, rateAt }: { rate: number; rateAt: Date | null }) {
  return (
    <div className="tag" role="group" aria-label="Gold rate">
      <span className="tag-hole" aria-hidden="true" />
      <p className="tag-label">22K gold, per gram</p>
      <p className="tag-rate">{rate ? rupees(rate) : "Updating…"}</p>
      {rateAt && <p className="tag-date">{isToday(rateAt) ? "Today’s rate" : "Rate as of"} · {formatDay(rateAt)}</p>}
    </div>
  );
}

export function ItemCard({ item, rate, preload }: { item: Item; rate: number; preload?: boolean }) {
  const p = priceOf(item, rate);
  const href = `/item/${item.id}`;
  return (
    <article className="card">
      <div className="card-media">
        <Link href={href} tabIndex={-1} aria-hidden="true">
          <Photo id={item.photos[0]} alt="" sizes="(min-width: 1100px) 25vw, (min-width: 700px) 33vw, 50vw" preload={preload} />
        </Link>
        <SaveButton id={item.id} name={item.name} />
        {item.qty === 0 && <span className="pill">Made to order</span>}
      </div>
      <div className="card-body">
        <h3 className="card-title">
          <Link href={href}>{item.name}</Link>
        </h3>
        <p className="code">{[item.code, item.weight ? `${item.weight} g` : ""].filter(Boolean).join(" · ")}</p>
        <p className="card-price">{p ? rupees(p.total) : "Price on request"}</p>
      </div>
    </article>
  );
}

export function ItemGrid({ items, rate }: { items: Item[]; rate: number }) {
  return (
    <ul className="grid">
      {items.map((item, i) => (
        <li key={item.id}>
          <ItemCard item={item} rate={rate} preload={i < 2} />
        </li>
      ))}
    </ul>
  );
}

// "Explore our worlds": arched photo tiles, one per category.
export function CollectionTiles({ collections }: { collections: { name: string; photo: string | null }[] }) {
  return (
    <ul className="tiles">
      {collections.map((c) => (
        <li key={c.name}>
          <Link href={`/collections?c=${encodeURIComponent(c.name)}`} className="tile">
            <span className="tile-media">
              <Photo id={c.photo} alt="" sizes="160px" w={320} h={400} />
            </span>
            <span className="tile-label">{c.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SearchForm({ q }: { q?: string }) {
  return (
    <form action="/collections" role="search" className="search">
      <SearchIcon size={20} />
      <label htmlFor="q" className="sr-only">
        Search by name or design code
      </label>
      <input id="q" name="q" type="search" defaultValue={q} placeholder="Search by name or design code…" autoComplete="off" enterKeyHint="search" />
    </form>
  );
}

export function SectionHead({ id, title, eyebrow, link }: { id?: string; title: string; eyebrow?: string; link?: { href: string; label: string } }) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={id}>{title}</h2>
      </div>
      {link && (
        <Link href={link.href} className="text-link">
          {link.label}
        </Link>
      )}
    </div>
  );
}

export function Empty({ title, children, phone }: { title: string; children: React.ReactNode; phone?: string }) {
  return (
    <div className="empty">
      <GemIcon size={36} />
      <h2>{title}</h2>
      <p className="muted">{children}</p>
      {phone && (
        <a href={`tel:${phone}`} className="btn btn-quiet">
          <PhoneIcon size={18} /> Call the Shop
        </a>
      )}
    </div>
  );
}
