import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToEnquiry } from "@/components/cart";
import { BackIcon, PhoneIcon } from "@/components/icons";
import { Photo } from "@/components/shop";
import { TrackView } from "@/components/ui";
import cloudinaryLoader from "@/lib/cloudinary-loader";
import { getItem, getSettings } from "@/lib/data";
import { GST_PCT, MAKING_PCT, priceOf, rupees } from "@/lib/price";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const item = await getItem((await params).id);
  if (!item) return {};
  const cover = item.photos[0];
  return { title: item.name, openGraph: { title: item.name, images: cover ? [cloudinaryLoader({ src: cover, width: 1200 })] : [] } };
}

export default async function ItemPage({ params }: Props) {
  const { id } = await params;
  const [item, s] = await Promise.all([getItem(id), getSettings()]);
  if (!item) notFound();
  const p = priceOf(item, s.rate);
  const price = p ? rupees(p.total) : "Price on request";
  const n = item.photos.length;

  return (
    <div className="wrap item">
      <TrackView id={item.id} />
      <Link href="/" className="back">
        <BackIcon size={18} /> All Jewellery
      </Link>
      <div className="item-grid">
        <div className="gallery" aria-label={`${n || "No"} ${n === 1 ? "photo" : "photos"}`}>
          {n ? (
            item.photos.map((ph, i) => (
              <div className="shot" key={ph}>
                <Photo id={ph} alt={`${item.name}, photo ${i + 1} of ${n}`} sizes="(min-width: 900px) 55vw, 90vw" w={1200} h={1500} preload={i === 0} />
              </div>
            ))
          ) : (
            <div className="shot">
              <Photo alt={`${item.name}, photo coming soon`} />
            </div>
          )}
        </div>

        <div className="item-info">
          {item.category && <p className="eyebrow">{item.category}</p>}
          <h1>{item.name}</h1>
          <p className="item-price">{price}</p>
          <p className="muted">
            {p?.fixed ? "Fixed price, GST included" : p ? `Includes making and ${GST_PCT}% GST at ${rupees(s.rate)}/g` : "Ask the shop for today’s price"}
          </p>

          <dl className="breakdown">
            {item.weight > 0 && (
              <div>
                <dt>Weight</dt>
                <dd>{item.weight} g</dd>
              </div>
            )}
            {p && !p.fixed && (
              <>
                <div>
                  <dt>Gold value</dt>
                  <dd>{rupees(p.gold)}</dd>
                </div>
                <div>
                  <dt>Making charges ({item.making ?? MAKING_PCT}%)</dt>
                  <dd>{rupees(p.making)}</dd>
                </div>
                <div>
                  <dt>GST ({GST_PCT}%)</dt>
                  <dd>{rupees(p.gst)}</dd>
                </div>
              </>
            )}
            <div>
              <dt>Availability</dt>
              <dd>{item.qty ? `${item.qty} in stock` : "Made to order"}</dd>
            </div>
          </dl>

          {item.description && <p className="desc">{item.description}</p>}

          <div className="item-actions">
            <p className="bar-price" aria-hidden="true">
              {price}
            </p>
            <AddToEnquiry id={item.id} block />
            {s.phone && (
              <a href={`tel:${s.phone}`} className="btn btn-quiet btn-block">
                <PhoneIcon size={18} /> Call
              </a>
            )}
          </div>
          <p className="fine item-note">Handmade pieces vary slightly in weight. The shop confirms the final weight and price.</p>
        </div>
      </div>
    </div>
  );
}
