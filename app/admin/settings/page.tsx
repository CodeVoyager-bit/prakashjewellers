import Link from "next/link";
import { AdminBar } from "@/components/admin-bar";
import { Submit } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { getSettings, THEMES } from "@/lib/data";
import { saveSettings } from "../actions";

export const metadata = { title: "Settings", robots: { index: false } };

export default async function SettingsPage() {
  await requireStaff();
  const s = await getSettings();
  return (
    <>
      <AdminBar name={s.name} current="/admin/settings" />
      <main className="wrap admin narrow">
        <h1>Settings</h1>
        <form action={saveSettings} className="form-grid">
          <section className="panel form-grid">
            <h2>Pricing</h2>
            <p className="help">
              Estimate = metal value + making + additional charges, then tax on that subtotal, each rounded to the rupee. Confirm
              these figures and the order with the owner before launch; they’re store settings, not legal advice.
            </p>
            <div className="form-grid two">
              <div className="field">
                <label htmlFor="makingPct">Default making charge (%)</label>
                <input id="makingPct" name="makingPct" type="number" inputMode="decimal" min="0" max="100" step="0.1" required defaultValue={s.makingPct} />
                <p className="help">A product can override this.</p>
              </div>
              <div className="field">
                <label htmlFor="taxPct">Tax (%)</label>
                <input id="taxPct" name="taxPct" type="number" inputMode="decimal" min="0" max="100" step="0.01" required defaultValue={s.taxPct} />
              </div>
            </div>
          </section>

          <section className="panel form-grid">
            <h2>Store Details</h2>
            <p className="help">Leave anything unconfirmed empty; the site shows “to be confirmed” instead of a guess.</p>
            <div className="field">
              <label htmlFor="name">Store name</label>
              <input id="name" name="name" defaultValue={s.name} autoComplete="organization" required />
            </div>
            <div className="form-grid two">
              <div className="field">
                <label htmlFor="whatsapp">WhatsApp number for enquiries</label>
                <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={s.whatsapp} autoComplete="off" placeholder="98765 43210…" />
              </div>
              <div className="field">
                <label htmlFor="phone">Phone for calls</label>
                <input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={s.phone} autoComplete="off" placeholder="+91 98765 43210…" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="address">Address</label>
              <textarea id="address" name="address" rows={2} defaultValue={s.address} autoComplete="off" />
              <p className="help">Also used for the map on the Contact page.</p>
            </div>
            <div className="field">
              <label htmlFor="hours">Opening hours</label>
              <textarea id="hours" name="hours" rows={2} defaultValue={s.hours} autoComplete="off" placeholder="Mon–Sat 10:30 am – 8:30 pm…" />
            </div>
            <div className="field">
              <label htmlFor="instagram">Instagram handle</label>
              <input id="instagram" name="instagram" defaultValue={s.instagram} autoComplete="off" spellCheck={false} />
            </div>
          </section>

          <section className="panel form-grid">
            <h2>Look</h2>
            <div className="field">
              <label htmlFor="theme">Theme</label>
              <select id="theme" name="theme" defaultValue={s.theme} key={s.theme}>
                {Object.entries(THEMES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="help">
                Preview first:{" "}
                {Object.entries(THEMES).map(([value, label], i) => (
                  <span key={value}>
                    {i > 0 && " · "}
                    <Link href={`/?theme=${value}`} target="_blank">
                      {label.split(/[:(]/)[0].trim()}
                    </Link>
                  </span>
                ))}
              </p>
            </div>
          </section>
          <Submit>Save Settings</Submit>
        </form>
      </main>
    </>
  );
}
