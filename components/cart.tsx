"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getQuote, prepareEnquiry } from "@/app/actions";
import type { Quote } from "@/lib/data";
import { formatDayTime, rupees } from "@/lib/price";
import { BagIcon, CheckIcon, ChatIcon, CloseIcon, GridIcon, HomeIcon, MinusIcon, PhoneIcon, PinIcon, PlusIcon } from "./icons";
import { Photo } from "./photo";
import { CountUp, Sheet, track } from "./ui";

// The enquiry cart lives in this browser only: no login, nothing reserved.
// `seen` is the estimate the customer last saw, so we can tell them when the rate moves it.
type Line = { id: string; qty: number; seen: number | null };
const KEY = "pj-cart";

const read = () => {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
};
// Only well-formed lines survive: whatever ends up in storage must never break the page.
const parse = (raw: string): Line[] => {
  try {
    const x: unknown = JSON.parse(raw);
    return Array.isArray(x)
      ? x.filter((l) => l && typeof l.id === "string").map((l) => ({ id: l.id, qty: Math.max(1, Math.floor(Number(l.qty)) || 1), seen: typeof l.seen === "number" ? l.seen : null }))
      : [];
  } catch {
    return [];
  }
};
const lines = () => parse(read());
const write = (next: Line[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new Event(KEY));
};
const subscribe = (cb: () => void) => {
  window.addEventListener(KEY, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(KEY, cb);
    window.removeEventListener("storage", cb);
  };
};

export function useCart(): Line[] {
  return parse(useSyncExternalStore(subscribe, read, () => "[]"));
}

const addLine = (id: string, seen: number | null) => {
  if (lines().some((l) => l.id === id)) return;
  write([...lines(), { id, qty: 1, seen }]);
  track("cart", id);
};
const setQty = (id: string, qty: number) => write(lines().map((l) => (l.id === id ? { ...l, qty } : l)));
const removeLine = (id: string) => write(lines().filter((l) => l.id !== id));
const acknowledge = (q: Quote) => write(lines().map((l) => ({ ...l, seen: q.lines.find((x) => x.id === l.id)?.price?.total ?? l.seen })));

// After an add, a small panel slides in to confirm it (see CartToast), the way luxury stores do.
type Added = { name: string; photo: string | null };
const ADDED = "pj-added";
const announce = (detail: Added) => window.dispatchEvent(new CustomEvent<Added>(ADDED, { detail }));

export function CartToast() {
  const [added, setAdded] = useState<(Added & { at: number }) | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const show = (e: Event) => {
      setAdded({ ...(e as CustomEvent<Added>).detail, at: Date.now() });
      clearTimeout(timer);
      timer = setTimeout(() => setAdded(null), 4500);
    };
    window.addEventListener(ADDED, show);
    return () => {
      window.removeEventListener(ADDED, show);
      clearTimeout(timer);
    };
  }, []);
  return (
    <div className="toast-region" aria-live="polite">
      {added && (
        <div className="toast" key={added.at}>
          <span className="toast-photo">
            <Photo id={added.photo} alt="" sizes="64px" w={128} h={160} />
          </span>
          <span className="toast-text">
            <span className="eyebrow">Added to your enquiry cart</span>
            <span className="toast-name">{added.name}</span>
            <Link href="/cart" className="text-link" onClick={() => setAdded(null)}>
              View Enquiry Cart
            </Link>
          </span>
          <button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => setAdded(null)}>
            <CloseIcon size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

// Quick add on product cards: a quiet outline bag in the corner of the photo.
export function CardAdd({ id, name, photo, seen }: { id: string; name: string; photo: string | null; seen: number | null }) {
  const inCart = useCart().some((l) => l.id === id);
  const router = useRouter();
  return (
    <button
      type="button"
      className={`card-add${inCart ? " is-in" : ""}`}
      aria-label={inCart ? `${name} is in your enquiry cart. Open cart` : `Add ${name} to enquiry cart`}
      onClick={() => {
        if (inCart) return router.push("/cart");
        addLine(id, seen);
        announce({ name, photo });
      }}
    >
      {inCart ? <CheckIcon size={18} /> : <BagIcon size={18} />}
    </button>
  );
}

// Full label from tablet up; the short one keeps the phone's bottom bar on one line.
const Label = ({ long, short }: { long: string; short: string }) => (
  <>
    <span className="label-long">{long}</span>
    <span className="label-short">{short}</span>
  </>
);

// Product page actions: add to the cart, or enquire about just this piece.
export function PieceActions({ id, available, seen, phone, name, photo }: { id: string; available: number; seen: number | null; phone: string; name: string; photo: string | null }) {
  const inCart = useCart().some((l) => l.id === id);
  const [handoff, setHandoff] = useState(false);
  return (
    <div className="item-actions">
      {available > 0 ? (
        inCart ? (
          <Link href="/cart" className="btn btn-quiet btn-block item-cart">
            <CheckIcon size={18} /> <Label long="In Enquiry Cart · View" short="View Cart" />
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-block item-cart"
            onClick={() => {
              addLine(id, seen);
              announce({ name, photo });
            }}
          >
            <BagIcon size={18} /> <Label long="Add to Enquiry Cart" short="Add to Cart" />
          </button>
        )
      ) : null}
      <button type="button" className={`btn btn-block ${available > 0 ? "btn-quiet" : "btn-primary"}`} onClick={() => setHandoff(true)}>
        <ChatIcon size={18} /> {available > 0 ? <Label long="Enquire About This Piece" short="Enquire" /> : <Label long="Ask About Making One" short="Ask the Store" />}
      </button>
      {phone && (
        <a href={`tel:${phone}`} className="icon-btn bar-btn" aria-label={`Call about ${name}`}>
          <PhoneIcon size={20} />
        </a>
      )}
      <Handoff open={handoff} onClose={() => setHandoff(false)} cart={[{ id, qty: 1 }]} ask={available < 1} />
    </div>
  );
}

type Prepared = Awaited<ReturnType<typeof prepareEnquiry>>;

// WhatsApp handoff: rechecks prices and stock on the server, previews the exact message, then hands over.
// The customer still reviews and sends it inside WhatsApp, so nothing here claims it was sent.
export function Handoff({ open, onClose, cart, ask }: { open: boolean; onClose: () => void; cart: { id: string; qty: number }[]; ask?: boolean }) {
  const [result, setResult] = useState<Prepared | null>(null);
  const key = JSON.stringify(cart);
  useEffect(() => {
    if (!open) return;
    let live = true;
    prepareEnquiry(JSON.parse(key), ask)
      .then((r) => live && setResult(r))
      .catch(() => live && setResult({ error: "Couldn’t reach the store’s server. Check your connection and try again." }));
    return () => {
      live = false;
      setResult(null);
    };
  }, [open, key, ask]);

  return (
    <Sheet open={open} onClose={onClose} title="Send Enquiry on WhatsApp">
      {!result ? (
        <div className="handoff-loading" role="status">
          <span className="spinner" aria-hidden="true" /> Checking today’s prices and availability…
        </div>
      ) : "error" in result ? (
        <p className="error" role="alert">
          {result.error}
        </p>
      ) : (
        <div className="handoff">
          {result.skipped.length > 0 && (
            <p className="notice notice-warn">No longer available, left out: {result.skipped.join(", ")}.</p>
          )}
          {result.capped.length > 0 && <p className="notice notice-warn">Quantity reduced to what’s in stock: {result.capped.join(", ")}.</p>}
          <p className="muted small">This message opens in WhatsApp for you to review. It isn’t sent until you press send there, and nothing is booked or paid.</p>
          <pre className="message-preview">{result.message}</pre>
          <a href={result.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-block" onClick={() => track("whatsapp", result.ref)}>
            <ChatIcon size={20} /> Continue to WhatsApp
          </a>
          <button type="button" className="btn btn-quiet btn-block" onClick={onClose}>
            Back
          </button>
        </div>
      )}
    </Sheet>
  );
}

export function CartView({ phone }: { phone: string }) {
  const cart = useCart();
  const key = JSON.stringify(cart.map(({ id, qty }) => ({ id, qty })));
  const [quote, setQuote] = useState<{ key: string; q: Quote } | null>(null);
  const [failed, setFailed] = useState<string | null>(null); // the cart key whose quote couldn't load
  const [attempt, setAttempt] = useState(0);
  const [handoff, setHandoff] = useState(false);

  useEffect(() => {
    let live = true;
    const asked: { id: string; qty: number }[] = JSON.parse(key);
    getQuote(asked)
      .then((q) => {
        if (!live) return;
        setQuote({ key, q });
        // Pieces the store has deleted come back missing: drop them so the badge and the page agree.
        const gone = asked.filter((a) => !q.lines.some((l) => l.id === a.id)).map((a) => a.id);
        if (gone.length) write(lines().filter((l) => !gone.includes(l.id)));
      })
      .catch(() => live && setFailed(key));
    return () => {
      live = false;
    };
  }, [key, attempt]);
  const retry = () => (setFailed(null), setAttempt((n) => n + 1));

  if (!quote && failed === key)
    return (
      <div className="empty" role="alert">
        <h2>Couldn’t load today’s prices</h2>
        <p className="muted">Check your connection and try again. Your selection is saved on this phone.</p>
        <button type="button" className="btn btn-primary" onClick={retry}>
          Try Again
        </button>
      </div>
    );
  if (!quote)
    return (
      <div className="lines" aria-busy="true" aria-label="Loading your enquiry cart…">
        {[0, 1].map((i) => (
          <div key={i} className="line">
            <div className="line-media skeleton" />
            <div className="skeleton skeleton-text" />
          </div>
        ))}
      </div>
    );

  const q = quote.q;
  const shown = q.lines.filter((l) => cart.some((c) => c.id === l.id));
  if (!shown.length)
    return (
      <div className="empty">
        <BagIcon size={36} />
        <h2>Your enquiry cart is empty</h2>
        <p className="muted">Add pieces you like, then send one enquiry to the store on WhatsApp.</p>
        <Link href="/collections" className="btn btn-primary">
          Browse Collections
        </Link>
      </div>
    );

  const changed = shown.filter((l) => {
    const seen = cart.find((c) => c.id === l.id)?.seen;
    return l.price && seen != null && seen !== l.price.total;
  });
  const sendable = shown.flatMap((l) => {
    const qty = Math.min(cart.find((c) => c.id === l.id)!.qty, l.available);
    return qty > 0 ? [{ id: l.id, qty }] : [];
  });

  return (
    <>
      {changed.length > 0 && (
        <div className="notice notice-info" role="status">
          <p>
            <strong>Estimates updated with the latest rate.</strong>{" "}
            {changed.map((l) => `${l.name}: ${rupees(cart.find((c) => c.id === l.id)!.seen!)} → ${rupees(l.price!.total)}`).join("; ")}.
          </p>
          <button type="button" className="text-link" onClick={() => acknowledge(q)}>
            OK
          </button>
        </div>
      )}
      {failed === key && (
        <p className="notice notice-warn" role="alert">
          Couldn’t update the prices for your latest change.{" "}
          <button type="button" className="text-link" onClick={retry}>
            Try again
          </button>
        </p>
      )}
      {q.stale && <p className="notice notice-warn">Today’s rate hasn’t been published yet. These estimates use the last rate and may change.</p>}

      <ul className="lines">
        {shown.map((l) => {
          const unavailable = l.available < 1;
          const asked = cart.find((c) => c.id === l.id)!.qty;
          // From the cart, not the last quote, so quick taps and Send never use an out-of-date number.
          const qty = Math.min(asked, l.available);
          return (
            <li key={l.id} className={`line${unavailable ? " is-unavailable" : ""}`}>
              <Link href={`/item/${l.id}`} className="line-media" tabIndex={-1} aria-hidden="true">
                <Photo id={l.photo} alt="" sizes="88px" w={176} h={220} />
              </Link>
              <div className="line-info">
                <Link href={`/item/${l.id}`} className="line-name">
                  {l.name}
                </Link>
                <p className="code">{[l.code, l.piece && `Piece #${l.piece}`, l.weight && `${l.weight} g`].filter(Boolean).join(" · ")}</p>
                {unavailable ? (
                  <p className="status-out">No longer available. It won’t be included.</p>
                ) : (
                  <>
                    <p className="line-price">{l.price ? rupees(l.price.total * qty) : "Price on request"}</p>
                    {l.available > 1 ? (
                      <div className="stepper stepper-sm" role="group" aria-label={`Quantity of ${l.name}`}>
                        <button type="button" aria-label="One fewer" disabled={qty <= 1} onClick={() => setQty(l.id, qty - 1)}>
                          <MinusIcon size={16} />
                        </button>
                        <output aria-live="polite">{qty}</output>
                        <button type="button" aria-label="One more" disabled={qty >= l.available} onClick={() => setQty(l.id, qty + 1)}>
                          <PlusIcon size={16} />
                        </button>
                        <span className="muted small">of {l.available}</span>
                      </div>
                    ) : (
                      <p className="muted small">One-of-a-kind piece</p>
                    )}
                    {asked > l.available && <p className="status-out">Only {l.available} in stock now.</p>}
                  </>
                )}
              </div>
              <button type="button" className="icon-btn remove" aria-label={`Remove ${l.name}`} onClick={() => removeLine(l.id)}>
                <CloseIcon size={20} />
              </button>
            </li>
          );
        })}
      </ul>

      <div className="summary">
        <dl className="breakdown">
          {q.rates.map((r) => (
            <div key={r.key}>
              <dt>Rate used, {r.label}</dt>
              <dd>
                {rupees(r.perGram)}/g{r.updatedAt && <span className="muted small block">{formatDayTime(r.updatedAt)}</span>}
              </dd>
            </div>
          ))}
          {q.metal > 0 && (
            <>
              <div>
                <dt>Metal value</dt>
                <dd>{rupees(q.metal)}</dd>
              </div>
              <div>
                <dt>Making charges</dt>
                <dd>{rupees(q.making)}</dd>
              </div>
              {q.extra > 0 && (
                <div>
                  <dt>Additional charges</dt>
                  <dd>{rupees(q.extra)}</dd>
                </div>
              )}
              <div>
                <dt>Tax ({q.taxPct}%)</dt>
                <dd>{rupees(q.tax)}</dd>
              </div>
            </>
          )}
          {q.fixed > 0 && (
            <div>
              <dt>Fixed-price pieces</dt>
              <dd>{rupees(q.fixed)}</dd>
            </div>
          )}
          <div className="total">
            <dt>Estimated total</dt>
            <dd>
              <CountUp value={q.total} />
            </dd>
          </div>
        </dl>
        <p className="fine">
          {q.onRequest ? `${q.onRequest} ${q.onRequest === 1 ? "piece is" : "pieces are"} priced on request. ` : ""}
          Final price and availability will be confirmed by the store.
        </p>
        <div className="send">
          <button type="button" className="btn btn-primary btn-block" disabled={!sendable.length} onClick={() => setHandoff(true)}>
            <ChatIcon size={20} /> Send Enquiry on WhatsApp
          </button>
          {phone && (
            <a href={`tel:${phone}`} className="btn btn-quiet btn-block">
              <PhoneIcon size={18} /> Call the Store
            </a>
          )}
        </div>
      </div>
      <Handoff open={handoff} onClose={() => setHandoff(false)} cart={sendable} />
    </>
  );
}

export function CartLink() {
  const n = useCart().reduce((s, l) => s + l.qty, 0);
  return (
    <Link href="/cart" className="icon-btn head-cart" aria-label={n ? `Enquiry cart, ${n} ${n === 1 ? "piece" : "pieces"}` : "Enquiry cart"}>
      <span data-cart-target className="tab-icon">
        <BagIcon size={21} />
        {n > 0 && (
          <span className="badge" aria-hidden="true">
            {n}
          </span>
        )}
      </span>
    </Link>
  );
}

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/collections", label: "Collections", Icon: GridIcon },
  { href: "/cart", label: "Cart", Icon: BagIcon },
  { href: "/visit", label: "Contact", Icon: PinIcon },
];

// Bottom tab bar on phones, inline nav in the header on larger screens.
export function TabNav() {
  const path = usePathname();
  const n = useCart().reduce((s, l) => s + l.qty, 0);
  return (
    <nav className="tabs" aria-label="Main">
      {TABS.map(({ href, label, Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        const cart = href === "/cart";
        return (
          <Link key={href} href={href} className="tab" aria-current={active ? "page" : undefined}>
            <span className="tab-icon" {...(cart && { "data-cart-target": "" })}>
              <Icon size={22} />
              {cart && n > 0 && (
                <span className="badge" aria-hidden="true">
                  {n}
                </span>
              )}
            </span>
            <span>
              {cart ? "Enquiry Cart" : label}
              {cart && n > 0 && <span className="sr-only">, {n} pieces</span>}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
