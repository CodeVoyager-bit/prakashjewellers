"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { BagIcon, CheckIcon } from "./icons";

// The enquiry list lives in this browser only: no login, nothing to sync.
const KEY = "pj-enquiry";

const read = () => {
  try {
    return localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
};

const write = (ids: string[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
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

export function useCart(): string[] {
  const raw = useSyncExternalStore(subscribe, read, () => "[]");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export const addToCart = (id: string) => write([...new Set([...JSON.parse(read()), id])]);
export const removeFromCart = (id: string) => write(JSON.parse(read()).filter((x: string) => x !== id));
export const clearCart = () => write([]);

export function CartLink() {
  const n = useCart().length;
  return (
    <Link href="/enquiry" className="icon-btn" aria-label={n ? `Your enquiry, ${n} ${n === 1 ? "piece" : "pieces"}` : "Your enquiry"}>
      <BagIcon size={22} />
      {n > 0 && <span className="badge" aria-hidden="true">{n}</span>}
    </Link>
  );
}

export function AddToEnquiry({ id, block }: { id: string; block?: boolean }) {
  const inCart = useCart().includes(id);
  const cls = `btn ${block ? "btn-block" : "btn-sm"}`;
  return inCart ? (
    <Link href="/enquiry" className={`${cls} btn-quiet`}>
      <CheckIcon size={18} /> In Your Enquiry
    </Link>
  ) : (
    <button type="button" className={`${cls} btn-primary`} onClick={() => addToCart(id)}>
      Add to Enquiry
    </button>
  );
}
