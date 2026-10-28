import { useId } from "react";

// The store's logo, redrawn as vector from their Instagram artwork: a gold "PJ" monogram (the J's hook
// curling left, a crescent sweep, a diamond on top) beside PRAKASH / JEWELLERS / Nagothane in Roman capitals.
// Replace with the original artwork file when the store supplies one.

export function Monogram({ size = 40, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg className={className} width={size} height={(size * 140) / 120} viewBox="0 0 120 140" aria-hidden="true">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6df9f" />
          <stop offset="0.45" stopColor="#d6aa4e" />
          <stop offset="1" stopColor="#9a7024" />
        </linearGradient>
      </defs>
      {/* Diamond */}
      <g stroke="#9c9c9c" strokeWidth="0.9" strokeLinejoin="round">
        <path d="M52 6h22l7 8-18 20-18-20Z" fill="#fff" />
        <path d="M45 14h36M52 6l-3 8 14 20 14-20-3-8M60 6l-4 8 7 20 7-20-4-8" fill="none" />
      </g>
      <g fill={`url(#g${id})`}>
        {/* Crescent sweep into the top of the stem */}
        <path d="M10 72C17 49 38 37 66 38l-1 6C42 43 24 52 10 72Z" />
        {/* Stem and the J's hook curling left */}
        <path d="M58 40h12v66c0 20-14 30-31 30-14 0-24-8-26-20 5 9 14 13 24 13 13 0 21-9 21-25Z" />
        {/* The P's bowl */}
        <path d="M66 38c28-3 46 9 46 27 0 17-16 28-38 27l-1-7c15 1 27-7 27-20 0-14-13-21-34-20Z" />
      </g>
    </svg>
  );
}

// Full lockup. `compact` is the header version: monogram beside PRAKASH / JEWELLERS.
export function Logo({ compact, light }: { compact?: boolean; light?: boolean }) {
  return (
    <span className={`logo${compact ? " logo-compact" : ""}${light ? " logo-light" : ""}`}>
      <Monogram className="logo-mark" size={compact ? 34 : 56} />
      <span className="logo-words">
        <span className="logo-name">Prakash</span>
        <span className="logo-sub">Jewellers</span>
        {!compact && (
          <>
            <span className="logo-place">Nagothane</span>
            <span className="logo-tagline">Tradition | Trust | Timeless Beauty</span>
          </>
        )}
      </span>
    </span>
  );
}
