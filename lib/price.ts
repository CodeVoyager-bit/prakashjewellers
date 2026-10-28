// Pricing for weight-based pieces, using the store's own settings (nothing statutory is assumed):
//   metal = billable weight × rate per gram for the piece's rate category
//   making = metal × making %
//   subtotal = metal + making + additional charges
//   tax = subtotal × tax %
//   total = subtotal + tax
// Each line is rounded to the rupee so the breakdown adds up. The owner confirms this before launch.

export type Rate = { key: string; label: string; perGram: number; updatedAt: Date | null; updatedBy: string };
export type PricingConfig = { makingPct: number; taxPct: number };
export type Priceable = {
  pricing: "weight" | "fixed";
  rateKey: string;
  weight: number;
  netWeight: number | null;
  making: number | null;
  extraCharge: number | null;
  fixedPrice: number | null;
};
export type Price = {
  fixed: boolean;
  total: number;
  rate: Rate | null;
  billable: number;
  metal: number;
  makingPct: number;
  making: number;
  extra: number;
  taxPct: number;
  tax: number;
  stale: boolean; // the rate wasn't updated today
};

export const billableWeight = (p: Pick<Priceable, "weight" | "netWeight">) => p.netWeight || p.weight;

// Null means "price on request": no fixed price, no weight, or no rate set for the category.
export function priceOf(item: Priceable, rates: Rate[], cfg: PricingConfig): Price | null {
  if (item.pricing === "fixed")
    return item.fixedPrice
      ? { fixed: true, total: item.fixedPrice, rate: null, billable: 0, metal: 0, makingPct: 0, making: 0, extra: 0, taxPct: 0, tax: 0, stale: false }
      : null;
  const rate = rates.find((r) => r.key === item.rateKey);
  const billable = billableWeight(item);
  if (!rate?.perGram || !billable) return null;
  const metal = Math.round(billable * rate.perGram);
  const makingPct = item.making ?? cfg.makingPct;
  const making = Math.round((metal * makingPct) / 100);
  const extra = Math.round(item.extraCharge ?? 0);
  const tax = Math.round(((metal + making + extra) * cfg.taxPct) / 100);
  return { fixed: false, total: metal + making + extra + tax, rate, billable, metal, makingPct, making, extra, taxPct: cfg.taxPct, tax, stale: !isToday(rate.updatedAt) };
}

// The rate editor accepts either unit; everything is stored per gram.
export const perGram = (value: number, unit: "g" | "10g") => (unit === "10g" ? value / 10 : value);

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const rupees = (n: number) => inr.format(n);

const ist = { timeZone: "Asia/Kolkata" } as const;
const day = new Intl.DateTimeFormat("en-IN", { ...ist, day: "numeric", month: "short", year: "numeric" });
const dayTime = new Intl.DateTimeFormat("en-IN", { ...ist, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const time = new Intl.DateTimeFormat("en-IN", { ...ist, hour: "numeric", minute: "2-digit" });
export const formatDay = (d: Date) => day.format(d);
export const formatTime = (d: Date) => time.format(d);
export const formatDayTime = (d: Date) => dayTime.format(d);
export const isToday = (d: Date | null | undefined) => !!d && formatDay(new Date(d)) === formatDay(new Date());

export const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
