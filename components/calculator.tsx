"use client";

import { useState } from "react";
import { formatDay, isToday, priceOf, rupees, type Rate } from "@/lib/price";
import { CountUp } from "./ui";

// Customers can try any weight; the rate, making and tax come from the store and are read-only here.
export function Calculator({ rates, makingPct, taxPct }: { rates: Rate[]; makingPct: number; taxPct: number }) {
  const usable = rates.filter((r) => r.perGram > 0);
  const [key, setKey] = useState(usable[0]?.key ?? "");
  const [grams, setGrams] = useState("10");
  const rate = usable.find((r) => r.key === key);
  const weight = Number(grams.replace(/,/g, ""));
  const p = rate && weight > 0 && weight < 10000 ? priceOf({ pricing: "weight", rateKey: key, weight, netWeight: null, making: null, extraCharge: null, fixedPrice: null }, usable, { makingPct, taxPct }) : null;

  if (!usable.length) return <p className="notice notice-warn">Today’s rates are being updated. The calculator will work as soon as the store publishes them.</p>;

  return (
    <div className="calc">
      <div className="calc-inputs">
        <div className="field">
          <label htmlFor="calc-rate">Metal and purity</label>
          <select id="calc-rate" value={key} onChange={(e) => setKey(e.target.value)}>
            {usable.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label} · {rupees(r.perGram)}/g
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="calc-weight">Weight in grams</label>
          <input id="calc-weight" type="text" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)} autoComplete="off" aria-describedby="calc-hint" />
          <p id="calc-hint" className="help">
            Billable gold weight, as weighed by the store.
          </p>
        </div>
      </div>

      {rate && !isToday(rate.updatedAt) && rate.updatedAt && (
        <p className="notice notice-warn">Today’s {rate.label} rate isn’t published yet; this uses the {formatDay(rate.updatedAt)} rate.</p>
      )}

      <dl className="breakdown calc-out">
        <div>
          <dt>Rate (set by the store)</dt>
          <dd>{rate ? `${rupees(rate.perGram)}/g` : "–"}</dd>
        </div>
        <div>
          <dt>Metal value</dt>
          <dd>{p ? <CountUp value={p.metal} /> : "–"}</dd>
        </div>
        <div>
          <dt>Making charge ({makingPct}%, usual rate)</dt>
          <dd>{p ? <CountUp value={p.making} /> : "–"}</dd>
        </div>
        <div>
          <dt>Tax ({taxPct}%)</dt>
          <dd>{p ? <CountUp value={p.tax} /> : "–"}</dd>
        </div>
        <div className="total">
          <dt>Estimated total</dt>
          <dd>{p ? <CountUp value={p.total} /> : "Enter a weight"}</dd>
        </div>
      </dl>
      {/* The figures above count up frame by frame; screen readers hear only the settled total. */}
      <p className="sr-only" aria-live="polite">
        {p ? `Estimated total ${rupees(p.total)}` : ""}
      </p>
      <p className="fine">Some pieces have their own making charge or stone charges, shown on their page. Final price and availability will be confirmed by the store.</p>
    </div>
  );
}
