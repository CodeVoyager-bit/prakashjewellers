"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getQuote, prepareEnquiry } from "@/app/actions";
import type { Quote } from "@/lib/data";
import { formatDayTime, rupees } from "@/lib/price";
import { BagIcon, CheckIcon, ChatIcon, CloseIcon, GridIcon, HomeIcon, MinusIcon, PhoneIcon, PinIcon, PlusIcon } from "./icons";
import { Photo } from "./photo";
import { CountUp, reducedMotion, Sheet, track } from "./ui";

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
const lines = (): Line[] => {
  try {
    return JSON.parse(read());
  } catch {
    return [];
  }
};
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
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

const addLine = (id: string, seen: number | null) => {
  if (lines().some((l) => l.id === id)) return;
  write([...lines(), { id, qty: 1, seen }]);
  track("cart", id);
};
const setQty = (id: string, qty: number) => write(lines().map((l) => (l.id === id ? { ...l, qty } : l)));
const removeLine = (id: string) => write(lines().filter((l) => l.id !== id));
const acknowledge = (q: Quote) => write(lines().map((l) => ({ ...l, seen: q.lines.find((x) => x.id === l.id)?.price?.total ?? l.seen })));

// The piece's photo flies along an arc into the cart icon, which then gives a little bounce.
function flyToCart(from: Element | null) {
  const target = [...document.querySelectorAll("[data-cart-target]")].find((t) => t.getBoundingClientRect().width > 0);
  const img = from?.querySelector("img");
  if (!target || !img || reducedMotion()) return;
  const a = img.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const ghost = img.cloneNode(true) as HTMLImageElement;
  Object.assign(ghost.style, { position: "fixed", left: `${a.left}px`, top: `${a.top}px`, width: `${a.width}px`, height: `${a.height}px`, margin: 0, objectFit: "cover", borderRadius: "8px", zIndex: "100", pointerEvents: "none" });
  document.body.append(ghost);
  setTimeout(() => ghost.remove(), 1500); // in case the animation never finishes (background tab)
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  ghost
    .animate(
      [
        { transform: "translate(0, 0) scale(1) rotate(0deg)", opacity: 1 },
        { transform: `translate(${dx * 0.45}px, ${Math.min(dy, 0) * 0.5 - 140}px) scale(0.55) rotate(-8deg)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.06) rotate(12deg)`, opacity: 0.4 },
      ],
      { duration: 750, easing: "cubic-bezier(0.45, 0, 0.25, 1)" },
    )
    .finished.then(() => {
      ghost.remove();
      target.animate([{ transform: "scale(1)" }, { transform: "scale(1.35)" }, { transform: "scale(0.92)" }, { transform: "scale(1)" }], { duration: 450, easing: "ease-out" });
    });
}

// Quick add on product cards.
export function CardAdd({ id, name, seen }: { id: string; name: string; seen: number | null }) {
  const inCart = useCart().some((l) => l.id === id);
  const router = useRouter();
  return (
    <button
      type="button"
      className={`card-add${inCart ? " is-in" : ""}`}
      aria-label={inCart ? `${name} is in your enquiry cart. Open cart` : `Add ${name} to enquiry cart`}
      onClick={(e) => {
        if (inCart) return router.push("/cart");
        flyToCart(e.currentTarget.closest(".card"));
        addLine(id, seen);
      }}
    >
      {inCart ? <CheckIcon size={20} /> : <PlusIcon size={20} />}
    </button>
  );
}

// Product page actions: add to the cart, or enquire about just this piece.
export function PieceActions({ id, available, seen, phone, name }: { id: string; available: number; seen: number | null; phone: string; name: string }) {
  const inCart = useCart().some((l) => l.id === id);
  const [handoff, setHandoff] = useState(false);
  return (
    <div className="item-actions">
      {available > 0 ? (
        inCart ? (
          <Link href="/cart" className="btn btn-quiet btn-block">
            <CheckIcon size={18} /> In Enquiry Cart · View
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => {
              flyToCart(document.querySelector(".gallery .shot"));
              addLine(id, seen);
            }}
          >
            <BagIcon size={18} /> Add to Enquiry Cart
          </button>
        )
      ) : null}
      <button type="button" className={`btn btn-block ${available > 0 ? "btn-quiet" : "btn-primary"}`} onClick={() => setHandoff(true)}>
        <ChatIcon size={18} /> {available > 0 ? "Enquire About This Piece" : "Ask About Making One"}
      </button>
      {phone && (
        <a href={`tel:${phone}`} className="icon-btn bar-btn" aria-label={`Call about ${name}`}>
          <PhoneIcon size={20} />
        </a>
      )}
      <Handoff open={handoff} onClose={() => setHandoff(false)} cart={[{ id, qty: 1 }]} />
    </div>
  );
}

type Prepared = Awaited<ReturnType<typeof prepareEnquiry>>;

// WhatsApp handoff: rechecks prices and stock on the server, previews the exact message, then hands over.
// The customer still reviews and sends it inside WhatsApp, so nothing here claims it was sent.
export function Handoff({ open, onClose, cart }: { open: boolean; onClose: () => void; cart: { id: string; qty: number }[] }) {
  const [result, setResult] = useState<Prepared | null>(null);
  const key = JSON.stringify(cart);
  useEffect(() => {
    if (!open) return;
    let live = true;
    prepareEnquiry(JSON.parse(key))
      .then((r) => live && setResult(r))
      .catch(() => live && setResult({ error: "Couldn’t reach the store’s server. Check your connection and try again." }));
    return () => {
      live = false;
      setResult(null);
    };
  }, [open, key]);

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
  const [handoff, setHandoff] = useState(false);

  useEffect(() => {
    let live = true;
    getQuote(JSON.parse(key)).then((q) => live && setQuote({ key, q }));
    return () => {
      live = false;
    };
  }, [key]);

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
  const sendable = shown.filter((l) => l.qty > 0);

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
      {q.stale && <p className="notice notice-warn">Today’s rate hasn’t been published yet. These estimates use the last rate and may change.</p>}

      <ul className="lines">
        {shown.map((l) => {
          const unavailable = l.available < 1;
          const asked = cart.find((c) => c.id === l.id)!.qty;
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
                    <p className="line-price">{l.price ? rupees(l.price.total * l.qty) : "Price on request"}</p>
                    {l.available > 1 ? (
                      <div className="stepper stepper-sm" role="group" aria-label={`Quantity of ${l.name}`}>
                        <button type="button" aria-label="One fewer" disabled={l.qty <= 1} onClick={() => setQty(l.id, l.qty - 1)}>
                          <MinusIcon size={16} />
                        </button>
                        <output aria-live="polite">{l.qty}</output>
                        <button type="button" aria-label="One more" disabled={l.qty >= l.available} onClick={() => setQty(l.id, l.qty + 1)}>
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
      <Handoff open={handoff} onClose={() => setHandoff(false)} cart={sendable.map(({ id, qty }) => ({ id, qty }))} />
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
