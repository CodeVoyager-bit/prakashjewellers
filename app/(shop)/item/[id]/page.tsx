import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackIcon, PhoneIcon } from "@/components/icons";
import { EnquireButton, SaveButton } from "@/components/saved";
import { Gallery, TrackView } from "@/components/ui";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { DETAILS, getItem, getSettings } from "@/lib/data";
import { GST_PCT, MAKING_PCT, priceOf, rupees } from "@/lib/price";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getItem((await params).id);
  if (!item) return {};
  const cover = item.photos[0];
  const title = [item.name, item.code].filter(Boolean).join(" · ");
  return { title, openGraph: { title, images: cover ? [cloudinaryLoader({ src: cover, width: 1200 })] : [] } };
}

export default async function ItemPage({ params }: Props) {
  const { id } = await params;
  const [item, s] = await Promise.all([getItem(id), getSettings()]);
  if (!item) notFound();
  const p = priceOf(item, s.rate);
  const price = p ? rupees(p.total) : "Price on request";

  // Rate-priced pieces are 22K by definition; the owner can say more in the Metal field.
  const rows: [string, string][] = [
    [DETAILS.metal, item.metal || (p && !p.fixed ? "22K gold" : "")],
    ["Weight", item.weight ? `${item.weight} g` : ""],
    [DETAILS.stones, item.stones ?? ""],
    [DETAILS.finish, item.finish ?? ""],
    [DETAILS.occasion, item.occasion ?? ""],
    [DETAILS.includes, item.includes ?? ""],
    ["Availability", item.qty ? `${item.qty} in stock` : "Made to order"],
  ];

  return (
    <div className="wrap item">
      <TrackView id={item.id} />
      <Link href="/collections" className="back">
        <BackIcon size={18} /> Collections
      </Link>
      <div className="item-grid">
        <Gallery photos={item.photos} name={item.name} />

        <div className="item-info">
          {item.category && <p className="eyebrow">{item.category}</p>}
          <div className="title-row">
            <h1>{item.name}</h1>
            <SaveButton id={item.id} name={item.name} className="save-btn save-inline" />
          </div>
          {item.code && <p className="code code-lg">{item.code}</p>}

          <p className="item-price">{price}</p>
          <p className="muted small">
            {p?.fixed ? "Fixed price, GST included" : p ? `Includes making and ${GST_PCT}% GST at ${rupees(s.rate)}/g today` : "Ask the shop for today’s price"}
          </p>
          {p && !p.fixed && (
            <dl className="breakdown compact">
              <div>
                <dt>Gold value</dt>
                <dd>{rupees(p.gold)}</dd>
              </div>
              <div>
                <dt>Making ({item.making ?? MAKING_PCT}%)</dt>
                <dd>{rupees(p.making)}</dd>
              </div>
              <div>
                <dt>GST ({GST_PCT}%)</dt>
                <dd>{rupees(p.gst)}</dd>
              </div>
            </dl>
          )}

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

          <div className="item-actions">
            {s.phone && (
              <a href={`tel:${s.phone}`} className="icon-btn bar-btn" aria-label={`Call ${s.name}`}>
                <PhoneIcon size={20} />
              </a>
            )}
            <EnquireButton id={item.id} />
          </div>
          <p className="fine item-note">Handmade pieces vary slightly in weight. The shop confirms the final weight and price. Tap the heart to enquire about several pieces together.</p>
        </div>
      </div>
    </div>
  );
}
