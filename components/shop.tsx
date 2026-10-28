import Image from "next/image";
import Link from "next/link";
import type { Item } from "@/lib/data";
import { formatDay, isToday, priceOf, rupees } from "@/lib/price";
import { AddToEnquiry } from "./cart";
import { GemIcon, PhoneIcon } from "./icons";

export function Photo({ id, alt, sizes, preload, w = 800, h = 1000 }: { id?: string | null; alt: string; sizes?: string; preload?: boolean; w?: number; h?: number }) {
  if (!id)
    return (
      <div className="ph" role={alt ? "img" : undefined} aria-label={alt || undefined}>
        <GemIcon size={32} />
      </div>
    );
  return <Image src={id} alt={alt} width={w} height={h} sizes={sizes} preload={preload} />;
}

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
      <Link href={href} className="card-media" tabIndex={-1} aria-hidden="true">
        <Photo id={item.photos[0]} alt="" sizes="(min-width: 900px) 33vw, 50vw" preload={preload} />
      </Link>
      {item.qty === 0 && <span className="pill">Made to order</span>}
      <div className="card-body">
        <h3 className="card-title">
          <Link href={href}>{item.name}</Link>
        </h3>
        <p className="card-meta">{[item.category, item.weight ? `${item.weight} g` : ""].filter(Boolean).join(" · ")}</p>
        <p className="card-price">{p ? rupees(p.total) : "Price on request"}</p>
        <div className="card-actions">
          <AddToEnquiry id={item.id} />
        </div>
      </div>
    </article>
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
