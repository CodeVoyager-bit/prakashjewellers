"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, ViewTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { rupees } from "@/lib/price";
import { AppIcon, CloseIcon } from "./icons";
import { Photo } from "./photo";

// Pilot analytics beacon; never delays the page. See app/api/track/route.ts.
export function track(e: "visit" | "view" | "cart" | "whatsapp", id?: string) {
  try {
    navigator.sendBeacon("/api/track", JSON.stringify({ e, id }));
  } catch {}
}

export function TrackView({ id }: { id: string }) {
  useEffect(() => track("view", id), [id]);
  return null;
}

// One "visit" per browsing session.
export function TrackVisit() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("pj-visit")) return;
      sessionStorage.setItem("pj-visit", "1");
    } catch {}
    track("visit");
  }, []);
  return null;
}

export const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

// Rolls a figure from its previous value (or `from`, on first show) to the new one.
// The server renders the final value; the roll is an enhancement, skipped under reduced motion.
const formats = { rupees, number: (n: number) => n.toLocaleString("en-IN") };
export function CountUp({ value, kind = "rupees", from }: { value: number; kind?: keyof typeof formats; from?: number }) {
  const el = useRef<HTMLSpanElement>(null);
  const prev = useRef(from ?? value);
  useEffect(() => {
    const format = formats[kind];
    const start0 = prev.current;
    prev.current = value;
    const node = el.current;
    if (!node || start0 === value || reducedMotion()) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(t) {
      const k = Math.min(1, (t - start) / 900);
      node.textContent = format(Math.round(start0 + (value - start0) * (1 - (1 - k) ** 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, kind]);
  return <span ref={el}>{formats[kind](value)}</span>;
}

// Bottom sheet on phones, centred panel on desktop. Native <dialog>: focus trap, Esc and backdrop close.
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="sheet" aria-labelledby={titleId} onClose={onClose} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="sheet-body">
        <span className="sheet-grabber" aria-hidden="true" />
        <div className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <CloseIcon size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function Submit({ children, pending: pendingText = "Saving…", className = "btn btn-primary", disabled }: { children: ReactNode; pending?: string; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

export function ConfirmForm({ action, message, children, className }: { action: () => Promise<void>; message: string; children: ReactNode; className?: string }) {
  return (
    <form action={action} className={className} onSubmit={(e) => confirm(message) || e.preventDefault()}>
      {children}
    </form>
  );
}

export function PrintButton() {
  return (
    <button type="button" className="btn btn-primary" onClick={() => print()}>
      Print QR Card
    </button>
  );
}

// Main photo with tappable thumbnails. The main photo shares a view-transition name with the
// product's card, so it morphs from the grid into place when the page opens.
export function Gallery({ id, photos, name }: { id: string; photos: string[]; name: string }) {
  const [i, setI] = useState(0);
  return (
    <div className="gallery">
      <ViewTransition name={`piece-${id}`} share="morph" default="none">
        <div className="shot">
          {photos.length ? (
            <Photo id={photos[i]} alt={`${name}, photo ${i + 1} of ${photos.length}`} sizes="(min-width: 900px) 55vw, 100vw" w={1200} h={1500} preload={i === 0} />
          ) : (
            <Photo alt={`${name}, photo coming soon`} />
          )}
        </div>
      </ViewTransition>
      {photos.length > 1 && (
        <div className="thumbs" role="group" aria-label="Choose photo">
          {photos.map((p, j) => (
            <button key={p} type="button" className="thumb-btn" aria-pressed={j === i} aria-label={`Photo ${j + 1}`} onClick={() => setI(j)}>
              <Photo id={p} alt="" sizes="80px" w={160} h={200} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

type PwaWindow = Window & { pwaPrompt?: { prompt(): Promise<unknown> } };

const subscribeInstall = (cb: () => void) => {
  addEventListener("beforeinstallprompt", cb);
  return () => removeEventListener("beforeinstallprompt", cb);
};
const installMode = () =>
  matchMedia("(display-mode: standalone)").matches ? "" : (window as PwaWindow).pwaPrompt ? "prompt" : /iPhone|iPad|iPod/.test(navigator.userAgent) ? "ios" : "";

// A row for the Contact page: Chrome's install prompt where the browser offers one, the Share-menu hint on iPhone.
// Hidden once the site is already running as an installed app.
export function InstallApp({ name }: { name: string }) {
  const mode = useSyncExternalStore(subscribeInstall, installMode, () => "");
  if (!mode) return null;
  return (
    <li>
      <span className="contact-icon">
        <AppIcon size={22} />
      </span>
      <div>
        <p className="contact-label">On your phone</p>
        <p>{mode === "ios" ? "Tap Share, then “Add to Home Screen”." : `Add ${name} to your home screen.`}</p>
      </div>
      {mode === "prompt" && (
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => (window as PwaWindow).pwaPrompt?.prompt().catch(() => {})}>
          Install App
        </button>
      )}
    </li>
  );
}

// Full-width hero: the newest pieces crossfade slowly, each with a gentle zoom. Static under reduced motion.
export function HeroSlides({ photos }: { photos: string[] }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (photos.length < 2 || reducedMotion()) return;
    const t = setInterval(() => setActive((i) => (i + 1) % photos.length), 6500);
    return () => clearInterval(t);
  }, [photos.length]);
  return (
    <div className="hero-media" aria-hidden="true">
      {photos.length ? (
        photos.map((p, i) => (
          <div key={p} className={`hero-slide${i === active ? " is-active" : ""}`}>
            <Photo id={p} alt="" sizes="100vw" w={2000} h={2500} preload={i === 0} />
          </div>
        ))
      ) : (
        <div className="hero-slide is-active">
          <Photo alt="" />
        </div>
      )}
      {photos.length > 1 && (
        <div className="hero-dots">
          {photos.map((p, i) => (
            <span key={p} className={i === active ? "is-active" : ""} />
          ))}
        </div>
      )}
    </div>
  );
}
