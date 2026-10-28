import Link from "next/link";
import { ViewTransition } from "react";
import type { Item, Settings } from "@/lib/data";
import { priceFor } from "@/lib/data";
import { billableWeight, formatDay, formatDayTime, formatTime, isToday, rupees, type Price, type Rate } from "@/lib/price";
import { CardAdd } from "./cart";
import { AlertIcon, GemIcon, PhoneIcon, SearchIcon } from "./icons";
import { Photo } from "./photo";

export { Photo };

const updated = (r: Rate) => (r.updatedAt ? `${isToday(r.updatedAt) ? "today" : formatDay(r.updatedAt)}, ${formatTime(r.updatedAt)}` : "");

// The signature: a jeweller's gold price tag on a thread, carrying the day's main rate. It swings in on load.
export function RateTag({ rate }: { rate: Rate }) {
  return (
    <Link href="/calculator" className="tag" aria-label={`${rate.label} rate ${rate.perGram ? `${rupees(rate.perGram)} per gram` : "being updated"}. Open the price calculator`}>
      <span className="tag-hole" aria-hidden="true" />
      <span className="tag-label">{rate.label}, per gram</span>
      <span className="tag-rate">{rate.perGram ? rupees(rate.perGram) : "Updating…"}</span>
      <span className="tag-date">{rate.updatedAt ? (isToday(rate.updatedAt) ? `Updated today, ${formatTime(rate.updatedAt)}` : `Last updated ${formatDay(rate.updatedAt)}`) : "Rate not set yet"}</span>
    </Link>
  );
}

// A slow marquee of every published rate under the header. Stale or missing rates say so.
export function RateTicker({ rates }: { rates: Rate[] }) {
  const items = rates.map((r) =>
    r.perGram ? `${r.label} ${rupees(r.perGram)}/g · ${isToday(r.updatedAt) ? `updated ${updated(r)}` : `last updated ${updated(r)}, today’s rate not yet published`}` : `${r.label}: rate being updated`,
  );
  const run = [...items, "Estimates only · final price confirmed by the store"];
  return (
    <div className="ticker" role="region" aria-label="Gold rates">
      <div className="ticker-track">
        {[0, 1].map((copy) => (
          <p key={copy} className="ticker-run" aria-hidden={copy === 1 || undefined}>
            {run.map((t, i) => (
              <span key={i}>
                <span className="ticker-gem" aria-hidden="true">
                  ◆
                </span>
                {t}
              </span>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}

export function StaleNotice({ rate }: { rate: Rate | null }) {
  if (!rate?.updatedAt || isToday(rate.updatedAt)) return null;
  return (
    <p className="notice notice-warn">
      <AlertIcon size={18} /> Today’s {rate.label} rate hasn’t been published yet. This estimate uses the {formatDay(rate.updatedAt)} rate and may change.
    </p>
  );
}

const availability = (i: Item) => (i.qty <= 0 ? { text: "Sold out", cls: "pill-out" } : i.qty === 1 ? { text: "Only 1", cls: "pill-one" } : null);

export function ItemCard({ item, s, preload }: { item: Item; s: Settings; preload?: boolean }) {
  const p = priceFor(item, s);
  const href = `/item/${item.id}`;
  const badge = availability(item);
  return (
    <article className="card">
      <div className="card-media">
        <Link href={href} tabIndex={-1} aria-hidden="true">
          <ViewTransition name={`piece-${item.id}`} share="morph" default="none">
            <div className="card-photo">
              <Photo id={item.photos[0]} alt="" sizes="(min-width: 1100px) 25vw, (min-width: 700px) 33vw, 50vw" preload={preload} />
            </div>
          </ViewTransition>
        </Link>
        {item.qty > 0 && <CardAdd id={item.id} name={item.name} seen={p?.total ?? null} />}
        <span className="pills">
          {item.demo && <span className="pill pill-sample">Sample</span>}
          {badge && <span className={`pill ${badge.cls}`}>{badge.text}</span>}
        </span>
      </div>
      <div className="card-body">
        <h3 className="card-title">
          <Link href={href}>{item.name}</Link>
        </h3>
        <p className="code">{[item.code, item.weight ? `${item.weight} g` : ""].filter(Boolean).join(" · ")}</p>
        <p className="card-price">
          {p ? rupees(p.total) : "Price on request"}
          {p?.stale && <span className="stale-dot" title="Based on the last published rate" aria-label="Based on the last published rate" />}
        </p>
      </div>
    </article>
  );
}

export function ItemGrid({ items, s }: { items: Item[]; s: Settings }) {
  return (
    <ul className="grid">
      {items.map((item, i) => (
        <li key={item.id} className="reveal" style={{ "--i": i % 4 } as React.CSSProperties}>
          <ItemCard item={item} s={s} preload={i < 2} />
        </li>
      ))}
    </ul>
  );
}

// The price breakdown the brief asks for on every product page.
export function PriceBreakdown({ p, item }: { p: Price; item: Item }) {
  if (p.fixed)
    return (
      <dl className="breakdown">
        <div className="total">
          <dt>Fixed price</dt>
          <dd>{rupees(p.total)}</dd>
        </div>
      </dl>
    );
  return (
    <details className="price-details" open>
      <summary>Price breakdown</summary>
      <dl className="breakdown">
        <div>
          <dt>Rate used, {p.rate!.label}</dt>
          <dd>
            {rupees(p.rate!.perGram)}/g
            {p.rate!.updatedAt && <span className="muted small block">{formatDayTime(p.rate!.updatedAt)}</span>}
          </dd>
        </div>
        <div>
          <dt>Billable weight{item.netWeight ? " (gold)" : ""}</dt>
          <dd>{billableWeight(item)} g</dd>
        </div>
        <div>
          <dt>Metal value</dt>
          <dd>{rupees(p.metal)}</dd>
        </div>
        <div>
          <dt>Making charge ({p.makingPct}%)</dt>
          <dd>{rupees(p.making)}</dd>
        </div>
        {p.extra > 0 && (
          <div>
            <dt>{item.extraLabel || "Additional charges"}</dt>
            <dd>{rupees(p.extra)}</dd>
          </div>
        )}
        <div>
          <dt>Tax ({p.taxPct}%)</dt>
          <dd>{rupees(p.tax)}</dd>
        </div>
        <div className="total">
          <dt>Estimated total</dt>
          <dd>{rupees(p.total)}</dd>
        </div>
      </dl>
    </details>
  );
}

// "Explore our worlds": arched photo tiles, one per category.
export function CollectionTiles({ collections }: { collections: { name: string; photo: string | null }[] }) {
  return (
    <ul className="tiles">
      {collections.map((c, i) => (
        <li key={c.name} className="reveal" style={{ "--i": i } as React.CSSProperties}>
          <Link href={`/collections?c=${encodeURIComponent(c.name)}`} className="tile">
            <span className="tile-media">
              <Photo id={c.photo} alt="" sizes="180px" w={360} h={480} />
            </span>
            <span className="tile-label">{c.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SearchForm({ q, hidden }: { q?: string; hidden?: Record<string, string | undefined> }) {
  return (
    <form action="/collections" role="search" className="search">
      {hidden && Object.entries(hidden).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <SearchIcon size={20} />
      <label htmlFor="q" className="sr-only">
        Search by name or design code
      </label>
      <input id="q" name="q" type="search" defaultValue={q} placeholder="Name or design code…" autoComplete="off" enterKeyHint="search" />
      <button type="submit" className="btn btn-primary search-go">
        Search
      </button>
    </form>
  );
}

export function SectionHead({ id, title, eyebrow, link }: { id?: string; title: string; eyebrow?: string; link?: { href: string; label: string } }) {
  return (
    <div className="section-head reveal">
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

export function Empty({ title, children, phone, action }: { title: string; children: React.ReactNode; phone?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <GemIcon size={36} />
      <h2>{title}</h2>
      <p className="muted">{children}</p>
      {action}
      {phone && (
        <a href={`tel:${phone}`} className="btn btn-quiet">
          <PhoneIcon size={18} /> Call the Store
        </a>
      )}
    </div>
  );
}
