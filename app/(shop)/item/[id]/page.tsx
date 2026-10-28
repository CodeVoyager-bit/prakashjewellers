import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PieceActions } from "@/components/cart";
import { BackIcon } from "@/components/icons";
import { PriceBreakdown, StaleNotice } from "@/components/shop";
import { Gallery, TrackView } from "@/components/ui";
import { auth } from "@/lib/auth";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { DETAILS, getItem, getSettings, priceFor, STATUSES } from "@/lib/data";
import { formatTime, isToday, rupees } from "@/lib/price";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getItem((await params).id);
  if (!item || item.status !== "live") return {};
  const cover = item.photos[0];
  const title = [item.name, item.code].filter(Boolean).join(" · ");
  return { title, openGraph: { title, images: cover ? [cloudinaryLoader({ src: cover, width: 1200 })] : [] } };
}

export default async function ItemPage({ params }: Props) {
  const { id } = await params;
  const [item, s] = await Promise.all([getItem(id), getSettings()]);
  // Drafts and archived pieces are only shown to signed-in staff, as a preview.
  const preview = item && item.status !== "live";
  if (!item || (preview && !(await auth.api.getSession({ headers: await headers() })))) notFound();
  const p = priceFor(item, s);
  const rate = p?.rate ?? s.rates.find((r) => r.key === item.rateKey) ?? null;

  const rows: [string, string][] = [
    ["Design code", item.code],
    ["Piece number", item.piece ? `#${item.piece}` : ""],
    ["Purity", item.pricing === "weight" ? (rate?.label ?? "") : ""],
    ["Gross weight", item.weight ? `${item.weight} g` : ""],
    ["Gold weight (billable)", item.netWeight ? `${item.netWeight} g` : ""],
    ...Object.entries(DETAILS).map(([k, label]) => [label, item[k as keyof typeof DETAILS] ?? ""] as [string, string]),
    ["Availability", item.qty > 1 ? `${item.qty} in stock` : item.qty === 1 ? "1 in stock, this exact piece" : "Sold out"],
  ];

  return (
    <div className="wrap item">
      {!preview && <TrackView id={item.id} />}
      {preview && (
        <p className="notice notice-info">
          Staff preview. This piece is <strong>{STATUSES[item.status].split(":")[0].toLowerCase()}</strong> and hidden from customers.{" "}
          <Link href={`/admin/item/${item.id}`}>Edit piece</Link>
        </p>
      )}
      <Link href="/collections" className="back" transitionTypes={["nav-back"]}>
        <BackIcon size={18} /> Collections
      </Link>
      <div className="item-grid">
        <Gallery id={item.id} photos={item.photos} name={item.name} />

        <div className="item-info">
          <div className="pills pills-static">
            {item.demo && <span className="pill pill-sample">Sample piece for demonstration</span>}
            {item.qty <= 0 && <span className="pill pill-out">Sold out</span>}
            {item.qty === 1 && <span className="pill pill-one">One of a kind</span>}
          </div>
          {item.category && <p className="eyebrow">{item.category}</p>}
          <h1>{item.name}</h1>
          <p className="code code-lg">{[item.code, item.piece && `Piece #${item.piece}`].filter(Boolean).join(" · ")}</p>

          <p className="item-price">{p ? rupees(p.total) : "Price on request"}</p>
          <p className="muted small">
            {p?.fixed
              ? "Fixed price set by the store"
              : p
                ? `Estimate at ${rupees(p.rate!.perGram)}/g ${p.rate!.label}${p.rate!.updatedAt ? `, ${isToday(p.rate!.updatedAt) ? "updated today" : "last updated"} ${formatTime(p.rate!.updatedAt)}` : ""}`
                : rate && !rate.perGram
                  ? `Today’s ${rate.label} rate is being updated. Ask the store for a price.`
                  : "Ask the store for today’s price."}
          </p>
          <StaleNotice rate={p && !p.fixed ? p.rate : null} />
          {p && <PriceBreakdown p={p} item={item} />}

          <h2 className="details-title">Details</h2>
          <dl className="details">
            {rows
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
          </dl>
          {item.description && <p className="desc">{item.description}</p>}

          <PieceActions id={item.id} available={item.status === "live" ? item.qty : 0} seen={p?.total ?? null} phone={s.phone} name={item.name} />
          <p className="fine item-note">Final price and availability will be confirmed by the store. Adding to the enquiry cart doesn’t reserve the piece.</p>
        </div>
      </div>
    </div>
  );
}
