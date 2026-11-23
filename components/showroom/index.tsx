"use client";

import dynamic from "next/dynamic";
import { Fragment, useEffect, useRef, useState, type HTMLAttributes, type RefObject } from "react";

// The 3D showroom: one WebGL canvas behind the whole shop that redraws marked elements (photos, the hero, the
// calculator) in 3D. Pages only mark elements here; three.js loads afterwards, and only on devices that can run it,
// so everyone else gets the flat site unchanged. Nothing in this file imports three.js.

export type Spec =
  | { kind: "photo"; src: string; src2?: string; shade?: number; curve?: boolean } // a photo as a 3D panel
  | { kind: "stage" } // the home hero: studio backdrop and gold bangles
  | { kind: "case"; src: string } // the product photo in a glass display case
  | { kind: "ingot" } // the calculator's gold bar, sized by `live` grams
  | { kind: "fill" } // an element's background colour, redrawn so 3D shows inside it
  | { kind: "text" }; // a heading whose letters rise in

// px/py: the pointer's position over the element, -0.5 to 0.5; at: when it last moved there; born: when the element appeared.
export type Piece = { id: number; el: HTMLElement; spec: Spec; live: number; hover: boolean; px: number; py: number; at: number; born: number };

// The canvas only redraws while something moves; anything that changes the picture keeps it awake for a moment.
let awakeUntil = 0;
export const poke = (ms = 700) => void (awakeUntil = Math.max(awakeUntil, performance.now() + ms));
export const awake = () => performance.now() < awakeUntil;

const pieces = new Map<HTMLElement, Piece>();
const listeners = new Set<() => void>();
let version = 0;
let nextId = 0;
const emit = () => {
  version++;
  poke();
  listeners.forEach((l) => l());
};
export const registry = {
  subscribe: (l: () => void) => (listeners.add(l), () => void listeners.delete(l)),
  version: () => version,
  list: () => [...pieces.values()],
};

export function useShowpiece(ref: RefObject<HTMLElement | null>, spec: Spec | null, live = 0) {
  const key = spec && JSON.stringify(spec);
  const piece = useRef<Piece | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !key) return;
    const p: Piece = { id: ++nextId, el, spec: JSON.parse(key), live: 0, hover: false, px: 0, py: 0, at: 0, born: performance.now() };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      p.px = (e.clientX - r.left) / r.width - 0.5;
      p.py = (e.clientY - r.top) / r.height - 0.5;
      p.hover = e.pointerType === "mouse";
      p.at = performance.now();
      poke();
    };
    const leave = () => ((p.hover = false), poke());
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    piece.current = p;
    pieces.set(el, p);
    emit();
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      pieces.delete(el);
      delete el.dataset.three;
      piece.current = null;
      emit();
    };
  }, [ref, key]);
  useEffect(() => {
    if (piece.current) piece.current.live = live;
    poke();
  }, [live]);
}

type ShowProps = { as?: "div" | "span" | "section"; spec: Spec | null } & HTMLAttributes<HTMLElement>;

// Wraps server-rendered markup in an element the showroom tracks.
export function Show({ as: Tag = "div", spec, ...props }: ShowProps) {
  const ref = useRef<HTMLElement>(null);
  useShowpiece(ref, spec);
  return <Tag ref={ref as RefObject<HTMLDivElement>} {...props} />;
}

// A heading split into letters, which rise in when the showroom runs. The heading itself carries the text as its
// aria-label, since screen readers may spell out separate letters.
export function RevealText({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useShowpiece(ref, { kind: "text" });
  return (
    <span ref={ref} className="split" aria-hidden="true">
      {text.split(" ").map((word, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="split-word">
            {[...word].map((ch, j) => (
              <span key={j} className="split-char">
                {ch}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

const Scene = dynamic(() => import("./scene"), { ssr: false });

// Full 3D on computers, a lighter version on phones, and none for reduced motion, data saver, low-memory or
// slow devices. Open any page with ?3d=off (or ?3d=on) to compare; the choice lasts for the visit.
function mode(): "full" | "lite" | null {
  let pick: string | null = null;
  try {
    const q = new URLSearchParams(location.search).get("3d");
    if (q) sessionStorage.setItem("3d", q);
    pick = sessionStorage.getItem("3d");
  } catch {}
  if (pick === "off") return null;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  const weak = matchMedia("(prefers-reduced-motion: reduce)").matches || nav.connection?.saveData || (nav.deviceMemory ?? 8) < 3 || (nav.hardwareConcurrency ?? 8) < 4;
  if (weak && pick !== "on") return null;
  const gl = document.createElement("canvas").getContext("webgl2");
  if (!gl) return null;
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return matchMedia("(pointer: coarse), (max-width: 760px)").matches ? "lite" : "full";
}

export function Showroom() {
  const [m, setM] = useState<"full" | "lite" | null>(null);
  useEffect(() => {
    // Wait until the page has painted and settled, so the 3D never slows the first view.
    const start = () => setM(mode());
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(start, { timeout: 2500 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(start, 1200);
    return () => clearTimeout(id);
  }, []);
  return m ? <Scene lite={m === "lite"} /> : null;
}
