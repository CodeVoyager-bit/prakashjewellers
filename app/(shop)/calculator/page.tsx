import { Calculator } from "@/components/calculator";
import { RateTag } from "@/components/shop";
import { getSettings } from "@/lib/data";

export const metadata = { title: "Price Calculator" };

export default async function CalculatorPage() {
  const s = await getSettings();
  return (
    <div className="wrap page-narrow">
      <p className="eyebrow rise">Price calculator</p>
      <h1 className="rise" style={{ "--i": 1 } as React.CSSProperties}>
        How Estimates Are Worked Out
      </h1>
      <p className="muted lede-sm rise" style={{ "--i": 2 } as React.CSSProperties}>
        Try any weight. The rate, making charge and tax come from the store’s settings, so you see the same estimate the
        store would.
      </p>
      <div className="calc-rate rise" style={{ "--i": 3 } as React.CSSProperties}>
        <RateTag rate={s.rates.find((r) => r.perGram) ?? s.rates[0]} />
      </div>
      <Calculator rates={s.rates} makingPct={s.makingPct} taxPct={s.taxPct} />
    </div>
  );
}
