"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getQuote, sendEnquiry } from "@/app/actions";
import { formatDay, GST_PCT, rupees } from "@/lib/price";
import { clearCart, removeFromCart, useCart } from "./cart";
import { BagIcon, ChatIcon, CloseIcon, PhoneIcon } from "./icons";
import { Photo } from "./shop";

type Quote = Awaited<ReturnType<typeof getQuote>>;

export function EnquiryList({ phone }: { phone: string }) {
  const ids = useCart();
  const key = ids.join(",");
  const [quote, setQuote] = useState<{ key: string; q: Quote } | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    getQuote(key ? key.split(",") : []).then((q) => live && setQuote({ key, q }));
    return () => {
      live = false;
    };
  }, [key]);

  async function send() {
    setSending(true);
    setError("");
    try {
      const r = await sendEnquiry(ids);
      if ("url" in r) {
        clearCart();
        location.href = r.url;
        return;
      }
      setError(r.error);
    } catch {
      setError("Couldn’t reach the shop’s server. Check your connection and try again.");
    }
    setSending(false);
  }

  const q = quote?.key === key ? quote.q : null;
  // Removing a piece hides it at once; totals follow when the new quote arrives.
  const lines = (q ?? quote?.q)?.lines.filter((l) => ids.includes(l.id)) ?? [];

  return (
    <div className="wrap enquiry">
      <h1>Your Enquiry</h1>
      <p className="muted lede-sm">The shop replies on WhatsApp with a final quotation. Nothing is booked or paid here.</p>

      {!quote ? (
        <div className="lines" aria-busy="true" aria-label="Loading your enquiry…">
          {[0, 1].map((i) => (
            <div key={i} className="line">
              <div className="line-media skeleton" />
              <div className="skeleton skeleton-text" />
            </div>
          ))}
        </div>
      ) : !lines.length ? (
        <div className="empty">
          <BagIcon size={36} />
          <h2>Your enquiry is empty</h2>
          <p className="muted">Add pieces from the catalogue, then send them to the shop in one message.</p>
          <Link href="/" className="btn btn-primary">
            Browse Jewellery
          </Link>
        </div>
      ) : (
        <>
          <ul className="lines">
            {lines.map((l) => (
              <li key={l.id} className="line">
                <Link href={`/item/${l.id}`} className="line-media" tabIndex={-1} aria-hidden="true">
                  <Photo id={l.photo} alt="" sizes="72px" w={144} h={180} />
                </Link>
                <div className="line-info">
                  <Link href={`/item/${l.id}`} className="line-name">
                    {l.name}
                  </Link>
                  <p className="card-meta">
                    {[l.weight ? `${l.weight} g` : "", l.qty ? "" : "Made to order"].filter(Boolean).join(" · ")}
                  </p>
                  <p className="line-price">{l.price ? rupees(l.price.total) : "Price on request"}</p>
                </div>
                <button type="button" className="icon-btn remove" aria-label={`Remove ${l.name}`} onClick={() => removeFromCart(l.id)}>
                  <CloseIcon size={20} />
                </button>
              </li>
            ))}
          </ul>

          <div className="summary" aria-live="polite" aria-busy={!q}>
            <dl className="breakdown">
              {q && q.goldAndMaking > 0 && (
                <>
                  <div>
                    <dt>Gold + making</dt>
                    <dd>{rupees(q.goldAndMaking)}</dd>
                  </div>
                  <div>
                    <dt>GST ({GST_PCT}%)</dt>
                    <dd>{rupees(q.gst)}</dd>
                  </div>
                </>
              )}
              {q && q.fixed > 0 && (
                <div>
                  <dt>Fixed-price pieces</dt>
                  <dd>{rupees(q.fixed)}</dd>
                </div>
              )}
              <div className="total">
                <dt>Estimated total</dt>
                <dd>{q ? rupees(q.total) : "…"}</dd>
              </div>
            </dl>
            {q && (
              <p className="fine">
                {q.onRequest ? `${q.onRequest} ${q.onRequest === 1 ? "piece is" : "pieces are"} priced on request. ` : ""}
                {q.rate && q.rateAt ? `At 22K ${rupees(q.rate)}/g, ${formatDay(q.rateAt)}. ` : ""}
                The final price is confirmed when the piece is weighed.
              </p>
            )}

            <div className="send">
              <button type="button" className="btn btn-primary btn-block" onClick={send} disabled={sending || !q}>
                <ChatIcon size={20} /> {sending ? "Opening WhatsApp…" : "Send Enquiry on WhatsApp"}
              </button>
              {phone && (
                <a href={`tel:${phone}`} className="btn btn-quiet btn-block">
                  <PhoneIcon size={18} /> Call the Shop
                </a>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
