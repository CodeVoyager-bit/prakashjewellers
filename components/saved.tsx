"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getQuote, sendEnquiry } from "@/app/actions";
import { formatDay, GST_PCT, rupees } from "@/lib/price";
import { ChatIcon, CloseIcon, GridIcon, HeartIcon, HomeIcon, PhoneIcon, PinIcon } from "./icons";
import { Photo } from "./photo";

// Saved pieces live in this browser only: no login, nothing to sync. The Saved list is the enquiry.
const KEY = "pj-saved";

const read = () => {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
};
const ids = (): string[] => {
  try {
    return JSON.parse(read());
  } catch {
    return [];
  }
};
const write = (next: string[]) => {
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

export function useSaved(): string[] {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

const toggle = (id: string) => write(ids().includes(id) ? ids().filter((x) => x !== id) : [...ids(), id]);

export function SaveButton({ id, name, className = "save-btn" }: { id: string; name: string; className?: string }) {
  const saved = useSaved().includes(id);
  return (
    <button type="button" className={className} aria-pressed={saved} aria-label={saved ? `Remove ${name} from Saved` : `Save ${name}`} onClick={() => toggle(id)}>
      <HeartIcon size={20} filled={saved} />
    </button>
  );
}

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/collections", label: "Collections", Icon: GridIcon },
  { href: "/saved", label: "Saved", Icon: HeartIcon },
  { href: "/visit", label: "Contact", Icon: PinIcon },
];

// Bottom tab bar on phones, inline nav in the header on larger screens.
export function TabNav() {
  const path = usePathname();
  const n = useSaved().length;
  return (
    <nav className="tabs" aria-label="Main">
      {TABS.map(({ href, label, Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link key={href} href={href} className="tab" aria-current={active ? "page" : undefined}>
            <span className="tab-icon">
              <Icon size={22} filled={active && href === "/saved"} />
              {href === "/saved" && n > 0 && (
                <span className="badge" aria-hidden="true">
                  {n}
                </span>
              )}
            </span>
            <span>
              {label}
              {href === "/saved" && n > 0 && <span className="sr-only">, {n} pieces</span>}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// Opens WhatsApp with the given pieces, priced on the server at today's rate.
export function useEnquire() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  async function enquire(list: string[]) {
    setSending(true);
    setError("");
    try {
      const r = await sendEnquiry(list);
      if ("url" in r) return void (location.href = r.url);
      setError(r.error);
    } catch {
      setError("Couldn’t reach the shop’s server. Check your connection and try again.");
    }
    setSending(false);
  }
  return { enquire, sending, error };
}

export function EnquireButton({ id, label = "Enquire on WhatsApp" }: { id: string; label?: string }) {
  const { enquire, sending, error } = useEnquire();
  return (
    <>
      <button type="button" className="btn btn-primary btn-block" onClick={() => enquire([id])} disabled={sending}>
        <ChatIcon size={20} /> {sending ? "Opening WhatsApp…" : label}
      </button>
      {error && (
        <p className="error bar-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

type Quote = Awaited<ReturnType<typeof getQuote>>;

export function SavedList({ phone }: { phone: string }) {
  const saved = useSaved();
  const key = saved.join(",");
  const [quote, setQuote] = useState<{ key: string; q: Quote } | null>(null);
  const { enquire, sending, error } = useEnquire();

  useEffect(() => {
    let live = true;
    getQuote(key ? key.split(",") : []).then((q) => live && setQuote({ key, q }));
    return () => {
      live = false;
    };
  }, [key]);

  const q = quote?.key === key ? quote.q : null;
  // Removing a piece hides it at once; totals follow when the new quote arrives.
  const lines = (q ?? quote?.q)?.lines.filter((l) => saved.includes(l.id)) ?? [];

  if (!quote)
    return (
      <div className="lines" aria-busy="true" aria-label="Loading saved pieces…">
        {[0, 1].map((i) => (
          <div key={i} className="line">
            <div className="line-media skeleton" />
            <div className="skeleton skeleton-text" />
          </div>
        ))}
      </div>
    );

  if (!lines.length)
    return (
      <div className="empty">
        <HeartIcon size={36} />
        <h2>Nothing saved yet</h2>
        <p className="muted">Tap the heart on any piece. Saved pieces go to the shop together in one WhatsApp message.</p>
        <Link href="/collections" className="btn btn-primary">
          Browse Collections
        </Link>
      </div>
    );

  return (
    <>
      <ul className="lines">
        {lines.map((l) => (
          <li key={l.id} className="line">
            <Link href={`/item/${l.id}`} className="line-media" tabIndex={-1} aria-hidden="true">
              <Photo id={l.photo} alt="" sizes="80px" w={160} h={200} />
            </Link>
            <div className="line-info">
              <Link href={`/item/${l.id}`} className="line-name">
                {l.name}
              </Link>
              <p className="code">{[l.code, l.weight ? `${l.weight} g` : "", l.qty ? "" : "Made to order"].filter(Boolean).join(" · ")}</p>
              <p className="line-price">{l.price ? rupees(l.price.total) : "Price on request"}</p>
            </div>
            <button type="button" className="icon-btn remove" aria-label={`Remove ${l.name}`} onClick={() => toggle(l.id)}>
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
            The shop confirms the final price when the piece is weighed.
          </p>
        )}
        <div className="send">
          <button type="button" className="btn btn-primary btn-block" onClick={() => enquire(saved)} disabled={sending || !q}>
            <ChatIcon size={20} /> {sending ? "Opening WhatsApp…" : `Enquire About ${lines.length === 1 ? "This Piece" : `All ${lines.length}`} on WhatsApp`}
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
  );
}
