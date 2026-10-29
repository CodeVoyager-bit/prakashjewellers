"use client";

import { useEffect, useRef, useState } from "react";
import { CountUp } from "./ui";

// Staff dashboard charts. One series at a time (no dual axes): a 2px line, a 10% area wash, a ringed end dot
// with its value, recessive hairline grid, a crosshair tooltip on hover/focus, and a table view.

export type Day = { day: string; visits?: number; views?: number; cartAdds?: number; whatsapp?: number };
const METRICS = { visits: "Visits", views: "Product views", cartAdds: "Added to cart", whatsapp: "WhatsApp opens" } as const;
type Metric = keyof typeof METRICS;

const LINE = "#8e2436"; // brand burgundy, one step lighter for a line on white
const MUTED = "#8f857f"; // de-emphasis, ≥3:1 on white

const shortDay = (d: string) => new Date(`${d}T12:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}K` : String(n));

// A clean axis top: 1, 2 or 5 × a power of ten.
function niceMax(v: number) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 5, 10].map((m) => m * p).find((m) => m >= v)!;
}

// Monotone cubic path (Fritsch–Carlson): smooth, but never overshoots below zero or above a peak.
function smooth(pts: [number, number][]) {
  if (pts.length < 2) return "";
  const n = pts.length;
  const d = pts.slice(1).map(([x, y], i) => (y - pts[i][1]) / (x - pts[i][0]));
  const m = pts.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  let path = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const h = (x1 - x0) / 3;
    path += `C${x0 + h},${y0 + m[i] * h} ${x1 - h},${y1 - m[i + 1] * h} ${x1},${y1}`;
  }
  return path;
}

export function ActivityChart({ days }: { days: Day[] }) {
  const [metric, setMetric] = useState<Metric>("visits");
  const [active, setActive] = useState<number | null>(null);
  const [width, setWidth] = useState(640);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(200, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 220;
  const pad = { l: 34, r: 40, t: 16, b: 28 };
  const values = days.map((d) => d[metric] ?? 0);
  const top = niceMax(Math.max(...values));
  const x = (i: number) => pad.l + (i * (width - pad.l - pad.r)) / Math.max(1, days.length - 1);
  const y = (v: number) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const pts = values.map((v, i) => [x(i), y(v)] as [number, number]);
  const line = smooth(pts);
  const area = `${line}L${x(days.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const last = values.length - 1;
  const total = values.reduce((a, b) => a + b, 0);
  const at = active ?? null;

  const pick = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    const i = Math.round(((clientX - r.left - pad.l) / (width - pad.l - pad.r)) * (days.length - 1));
    setActive(Math.min(days.length - 1, Math.max(0, i)));
  };

  return (
    <div className="chart">
      <div className="chart-head">
        <div>
          <h2 id="activity-title">{METRICS[metric]}, last 14 days</h2>
          <p className="chart-total">
            <CountUp value={total} kind="number" from={0} /> in total
          </p>
        </div>
        <div className="seg" role="group" aria-label="Measure">
          {Object.entries(METRICS).map(([k, label]) => (
            <button key={k} type="button" aria-pressed={metric === k} className="seg-btn" onClick={() => setMetric(k as Metric)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={box}
        className="chart-plot"
        tabIndex={0}
        role="img"
        aria-label={`${METRICS[metric]} per day for the last 14 days, ${total} in total. Use the arrow keys to read each day, or open the table.`}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        // A finger lifting fires pointerleave at once; on touch the reading stays until a tap elsewhere.
        onPointerLeave={(e) => e.pointerType !== "touch" && setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((i) => Math.min(last, (i ?? -1) + 1));
          if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? last + 1) - 1));
          if (e.key === "Escape") setActive(null);
        }}
        onBlur={() => setActive(null)}
      >
        {/* viewBox: scales to fit before the first measurement, so phones never scroll sideways. */}
        <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} aria-hidden="true">
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={pad.l} x2={width - pad.r} y1={y(top * f)} y2={y(top * f)} className="chart-grid" />
              <text x={pad.l - 8} y={y(top * f)} className="chart-axis" textAnchor="end" dominantBaseline="middle">
                {compact(top * f)}
              </text>
            </g>
          ))}
          {[0, Math.floor(last / 2), last].map((i) => (
            <text key={i} x={x(i)} y={H - 8} className="chart-axis" textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}>
              {i === last ? "Today" : shortDay(days[i].day)}
            </text>
          ))}
          <g key={metric}>
            <path d={area} fill={LINE} opacity={0.1} className="chart-area" />
            <path d={line} fill="none" stroke={LINE} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="chart-line" />
            <circle cx={pts[last][0]} cy={pts[last][1]} r={4.5} fill={LINE} stroke="#fff" strokeWidth={2} className="chart-end" />
            <text x={pts[last][0] + 9} y={pts[last][1]} className="chart-value" dominantBaseline="middle">
              {values[last]}
            </text>
          </g>
          {at !== null && (
            <g>
              <line x1={pts[at][0]} x2={pts[at][0]} y1={pad.t} y2={H - pad.b} className="chart-cross" />
              <circle cx={pts[at][0]} cy={pts[at][1]} r={5} fill={LINE} stroke="#fff" strokeWidth={2} />
            </g>
          )}
        </svg>
        {at !== null && (
          // Kept inside the card sideways, and flipped below the point near the top so it never covers the tabs.
          <div className={`chart-tip${pts[at][1] < 70 ? " is-below" : ""}`} style={{ left: Math.min(Math.max(pts[at][0], 96), width - 96), top: pts[at][1] }}>
            <strong>{values[at].toLocaleString("en-IN")}</strong>
            <span>
              <i style={{ background: LINE }} /> {METRICS[metric]} · {shortDay(days[at].day)}
            </span>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {at !== null ? `${shortDay(days[at].day)}: ${values[at].toLocaleString("en-IN")} ${METRICS[metric].toLowerCase()}` : ""}
      </p>
      <details className="chart-table">
        <summary>Show as table</summary>
        <div className="table-scroll">
          <table className="stats-table">
            <thead>
              <tr>
                <th scope="col">Day</th>
                {Object.values(METRICS).map((l) => (
                  <th key={l} scope="col">
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.day}>
                  <th scope="row">{shortDay(d.day)}</th>
                  {(Object.keys(METRICS) as Metric[]).map((k) => (
                    <td key={k}>{d[k] ?? 0}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// Stat tile trend: the previous 7 days in the de-emphasis grey, the current 7 in the accent.
export function Sparkline({ values }: { values: number[] }) {
  const w = 120;
  const h = 36;
  const top = Math.max(1, ...values);
  const pts = values.map((v, i) => [2 + (i * (w - 4)) / Math.max(1, values.length - 1), h - 3 - (v / top) * (h - 6)] as [number, number]);
  const mid = Math.floor(values.length / 2);
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path d={smooth(pts.slice(0, mid + 1))} fill="none" stroke={MUTED} strokeWidth={2} strokeLinecap="round" />
      <path d={smooth(pts.slice(mid))} fill="none" stroke={LINE} strokeWidth={2} strokeLinecap="round" pathLength={1} className="chart-line" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r={3.5} fill={LINE} stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
}

export function StatTile({ label, values, i }: { label: string; values: number[]; i: number }) {
  const now = values.slice(7).reduce((a, b) => a + b, 0);
  const before = values.slice(0, 7).reduce((a, b) => a + b, 0);
  const diff = now - before;
  const pct = before ? Math.round((diff / before) * 100) : null;
  const dir = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
  return (
    <div className="dash-card stat rise" style={{ "--i": i } as React.CSSProperties}>
      <p className="stat-label">{label}</p>
      <p className="stat-value">
        <CountUp value={now} kind="number" from={0} />
      </p>
      <div className="stat-foot">
        <p className={`delta delta-${dir}`}>
          <span aria-hidden="true">{dir === "up" ? "↑" : dir === "down" ? "↓" : "→"}</span>{" "}
          {dir === "flat" ? "No change" : pct !== null ? `${diff > 0 ? "+" : ""}${pct}%` : `+${diff}`}
          <span className="delta-vs"> in the last 7 full days, vs the 7 before</span>
        </p>
        <Sparkline values={values} />
      </div>
    </div>
  );
}
