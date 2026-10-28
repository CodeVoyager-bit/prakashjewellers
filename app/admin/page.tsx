import Link from "next/link";
import { AdminBar } from "@/components/admin-bar";
import { MinusIcon, PlusIcon } from "@/components/icons";
import { Photo } from "@/components/shop";
import { Submit } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { countEnquiriesSince, getEnquiries, getItems, getSettings, THEMES } from "@/lib/data";
import { count, formatDay, formatDayTime, isToday, priceOf, rupees } from "@/lib/price";
import { saveRate, saveSettings, setQty } from "./actions";

export const metadata = { title: "Staff", robots: { index: false } };

export default async function AdminPage() {
  await requireStaff();
  const [s, items, enquiries, week] = await Promise.all([getSettings(), getItems(), getEnquiries(), countEnquiriesSince(7)]);
  const ranked = [...items].sort((a, b) => b.enquiries - a.enquiries || b.views - a.views);
  const views = items.reduce((n, i) => n + i.views, 0);

  return (
    <>
      <AdminBar name={s.name} />
      <main className="wrap admin">
        <section className="panel rate-panel" aria-labelledby="rate-title">
          <h1 id="rate-title">Today’s 22K Gold Rate</h1>
          {!isToday(s.rateAt) && (
            <p className="warn" role="status">
              Not updated today. Prices on the site still use {s.rateAt ? `the ${formatDay(s.rateAt)} rate` : "no rate"}.
            </p>
          )}
          <form action={saveRate} className="rate-form">
            <div className="field">
              <label htmlFor="rate">₹ per gram</label>
              <input id="rate" name="rate" className="rate-input" type="number" inputMode="decimal" min="1" max="99999" step="any" required defaultValue={s.rate || ""} autoComplete="off" />
            </div>
            <Submit>Update Rate</Submit>
          </form>
          {s.rateAt && <p className="help">Last updated {formatDayTime(s.rateAt)}. Every price on the site follows this number.</p>}
        </section>

        <section className="stats" aria-label="Activity">
          <p className="stat-card">
            <span className="stat-num">{week}</span> {week === 1 ? "enquiry" : "enquiries"} in the last 7 days
          </p>
          <p className="stat-card">
            <span className="stat-num">{views}</span> item {views === 1 ? "view" : "views"} in total
          </p>
          <p className="stat-card">
            <span className="stat-num">{items.length}</span> {items.length === 1 ? "item" : "items"} in the catalogue
          </p>
        </section>

        <section className="panel" aria-labelledby="items-title">
          <div className="panel-head">
            <h2 id="items-title">Items</h2>
            <Link href="/admin/item/new" className="btn btn-primary btn-sm">
              <PlusIcon size={18} /> Add Item
            </Link>
          </div>
          <p className="help">Most enquired first. Use − after a sale; at 0 the piece shows as made to order.</p>
          {ranked.length ? (
            <ul className="admin-items">
              {ranked.map((it) => {
                const p = priceOf(it, s.rate);
                return (
                  <li key={it.id} className="admin-item">
                    <Link href={`/admin/item/${it.id}`} className="thumb" tabIndex={-1} aria-hidden="true">
                      <Photo id={it.photos[0]} alt="" sizes="56px" w={112} h={140} />
                    </Link>
                    <div className="admin-item-info">
                      <Link href={`/admin/item/${it.id}`} className="line-name">
                        {it.name}
                      </Link>
                      <p className="card-meta">
                        {[it.category, it.weight ? `${it.weight} g` : "", p ? rupees(p.total) : "Price on request"].filter(Boolean).join(" · ")}
                      </p>
                      <p className="card-meta">
                        {count(it.views, "view")} · {it.enquiries === 1 ? "1 enquiry" : `${it.enquiries} enquiries`}
                      </p>
                    </div>
                    <div className="stepper" role="group" aria-label={`Stock for ${it.name}`}>
                      <form action={setQty.bind(null, it.id, it.qty - 1)}>
                        <button type="submit" aria-label="One less in stock" disabled={it.qty === 0}>
                          <MinusIcon size={18} />
                        </button>
                      </form>
                      <output aria-label="In stock">{it.qty}</output>
                      <form action={setQty.bind(null, it.id, it.qty + 1)}>
                        <button type="submit" aria-label="One more in stock">
                          <PlusIcon size={18} />
                        </button>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">No items yet. Add the first piece with its photos and weight.</p>
          )}
        </section>

        <section className="panel" aria-labelledby="enq-title">
          <h2 id="enq-title">Recent Enquiries</h2>
          <p className="help">Each time a customer taps “Send Enquiry on WhatsApp”. The message itself arrives on WhatsApp.</p>
          {enquiries.length ? (
            <ul className="enq-list">
              {enquiries.map((e) => (
                <li key={e._id.toHexString()}>
                  <p className="card-meta">
                    {formatDayTime(e.createdAt)} · Ref PJ-{e._id.toHexString().slice(-6).toUpperCase()}
                  </p>
                  <p>{e.items.map((i) => i.name).join(", ")}</p>
                  <p className="line-price">{rupees(e.total)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No enquiries yet. Print the counter QR so walk-in customers can browse.</p>
          )}
        </section>

        <section className="panel" aria-labelledby="shop-title">
          <h2 id="shop-title">Shop Details</h2>
          <form action={saveSettings} className="form-grid settings-form">
            <div className="field">
              <label htmlFor="name">Shop name</label>
              <input id="name" name="name" defaultValue={s.name} autoComplete="organization" required />
            </div>
            <div className="form-grid two">
              <div className="field">
                <label htmlFor="whatsapp">WhatsApp number for enquiries</label>
                <input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" defaultValue={s.whatsapp} autoComplete="off" placeholder="98765 43210…" />
                <p className="help">10-digit mobile. Enquiries arrive here.</p>
              </div>
              <div className="field">
                <label htmlFor="phone">Phone for calls</label>
                <input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={s.phone} autoComplete="off" placeholder="+91 98765 43210…" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="address">Address</label>
              <textarea id="address" name="address" rows={2} defaultValue={s.address} autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="theme">Colour theme</label>
              <select id="theme" name="theme" defaultValue={s.theme}>
                {THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t[0].toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
              <p className="help">
                Preview first: <Link href="/?theme=green">green</Link>, <Link href="/?theme=black">black</Link>,{" "}
                <Link href="/?theme=white">white</Link>, <Link href="/?theme=red">red</Link>.
              </p>
            </div>
            <Submit>Save Details</Submit>
          </form>
        </section>
      </main>
    </>
  );
}
