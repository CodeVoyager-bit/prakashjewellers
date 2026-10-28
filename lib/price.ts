export const MAKING_PCT = 10;
export const GST_PCT = 3;

export type Price = { fixed: boolean; gold: number; making: number; gst: number; total: number };

type Priceable = { weight: number; making: number | null; fixedPrice: number | null };

// price = weight × rate × (1 + making%) × 1.03, rounded per line so the breakdown adds up.
// A fixed price is treated as final (GST included). Null means "price on request".
export function priceOf(item: Priceable, rate: number): Price | null {
  if (item.fixedPrice) return { fixed: true, gold: 0, making: 0, gst: 0, total: item.fixedPrice };
  if (!rate || !item.weight) return null;
  const gold = Math.round(item.weight * rate);
  const making = Math.round((gold * (item.making ?? MAKING_PCT)) / 100);
  const gst = Math.round(((gold + making) * GST_PCT) / 100);
  return { fixed: false, gold, making, gst, total: gold + making + gst };
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const rupees = (n: number) => inr.format(n);

const ist = { timeZone: "Asia/Kolkata" } as const;
const day = new Intl.DateTimeFormat("en-IN", { ...ist, day: "numeric", month: "short", year: "numeric" });
const dayTime = new Intl.DateTimeFormat("en-IN", { ...ist, day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const formatDay = (d: Date) => day.format(d);
export const formatDayTime = (d: Date) => dayTime.format(d);
export const isToday = (d: Date | null) => !!d && formatDay(d) === formatDay(new Date());

export const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
