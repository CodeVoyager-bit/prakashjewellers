import { RatesForm } from "@/components/admin";
import { AdminBar } from "@/components/admin-bar";
import { requireStaff } from "@/lib/auth";
import { getSettings, itemsDb } from "@/lib/data";
import { removeRate } from "../actions";

export const metadata = { title: "Daily Rates", robots: { index: false } };

export default async function RatesPage() {
  await requireStaff();
  const s = await getSettings();
  const inUse = new Set((await itemsDb.distinct("rateKey")) as string[]);
  return (
    <>
      <AdminBar name={s.name} current="/admin/rates" />
      <main className="wrap admin narrow">
        <h1>Daily Rates</h1>
        <p className="muted">
          Every weight-based price on the site comes from these numbers. Type only the rates that changed, choose the unit, and
          check the preview before saving. Each purity has its own rate; the site never converts one purity into another.
        </p>
        <RatesForm rates={s.rates} makingPct={s.makingPct} taxPct={s.taxPct} />
        {s.rates.length > 1 && (
          <section className="panel">
            <h2>Remove a Category</h2>
            <p className="help">Only categories no product uses can be removed.</p>
            <ul className="remove-rates">
              {s.rates.map((r) => (
                <li key={r.key}>
                  <span>{r.label}</span>
                  {inUse.has(r.key) ? (
                    <span className="muted small">In use</span>
                  ) : (
                    <form action={removeRate.bind(null, r.key)}>
                      <button type="submit" className="btn btn-danger btn-sm">
                        Remove
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
