import Link from "next/link";
import { AdminBar } from "@/components/admin-bar";
import { ActivityChart, StatTile } from "@/components/dashboard";
import { AlertIcon, CheckIcon, DownloadIcon, PlusIcon } from "@/components/icons";
import { Photo } from "@/components/photo";
import { CountUp } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { ENQUIRY_STATUSES, enquiryRef, getAllItems, getEnquiries, getSettings, getStats } from "@/lib/data";
import { formatDay, formatDayTime, formatTime, isToday, rupees } from "@/lib/price";

export const metadata = { title: "Staff Dashboard", robots: { index: false } };

const greeting = () => {
  const h = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

export default async function Dashboard() {
  const session = await requireStaff();
  const [s, items, recent, month, enquiries] = await Promise.all([getSettings(), getAllItems(), getStats(14), getStats(30), getEnquiries(5)]);
  const live = items.filter((i) => i.status === "live");
  // Tiles and chart both cover the last 14 days including today, so they always agree.
  const series = (k: "visits" | "views" | "cartAdds" | "whatsapp") => recent.days.map((d) => d[k] ?? 0);
  const main = s.rates.find((r) => r.perGram) ?? s.rates[0];
  const fresh = main.perGram > 0 && isToday(main.updatedAt);
  const top = [...live].sort((a, b) => b.views - a.views || b.enquiries - a.enquiries).slice(0, 5);
  const attention = [
    ...s.rates.filter((r) => !r.perGram).map((r) => `${r.label} rate isn’t set, so its pieces show “price on request”.`),
    ...(live.some((i) => i.pricing === "weight" && !i.weight) ? ["Some live pieces have no weight."] : []),
    ...(items.some((i) => i.demo) ? ["Sample pieces are still in the catalogue. Remove them before launch (see the Staff Guide)."] : []),
    ...(!s.whatsapp ? ["No WhatsApp number is set, so customers can’t send enquiries yet. Add it in Settings."] : []),
  ];

  return (
    <div className="admin-shell">
      <AdminBar name={s.name} current="/admin" />
      <main className="admin dash">
        <div className="dash-head rise">
          <div>
            <p className="dash-date">{formatDay(new Date())}</p>
            <h1>
              {greeting()}, {session.user.name.split(" ")[0] || "there"}
            </h1>
          </div>
          <div className="dash-actions">
            <Link href="/admin/rates" className="btn btn-primary">
              Update Rates
            </Link>
            <Link href="/admin/item/new" className="btn btn-quiet">
              <PlusIcon size={16} /> Add Product
            </Link>
          </div>
        </div>

        {attention.length > 0 && (
          <section className="dash-alert rise" aria-label="Needs attention">
            <AlertIcon size={18} />
            <ul>
              {attention.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="dash-top" aria-label="Today">
          <div className="dash-card rate-hero rise" style={{ "--i": 0 } as React.CSSProperties}>
            <div className="rate-hero-head">
              <p className="stat-label">Today’s {main.label} rate</p>
              <span className={`state-chip ${fresh ? "state-good" : "state-warn"}`}>
                {fresh ? <CheckIcon size={14} /> : <AlertIcon size={14} />} {fresh ? "Updated today" : "Not updated today"}
              </span>
            </div>
            <p className="hero-figure">
              {main.perGram ? (
                <>
                  <CountUp value={main.perGram} from={0} />
                  <span className="hero-unit">/g</span>
                </>
              ) : (
                "Not set"
              )}
            </p>
            <p className="help">{main.updatedAt ? `${isToday(main.updatedAt) ? `Today, ${formatTime(main.updatedAt)}` : formatDayTime(main.updatedAt)} · by ${main.updatedBy || "staff"}` : "Never updated"}</p>
            {s.rates.length > 1 && (
              <ul className="rate-others">
                {s.rates
                  .filter((r) => r !== main)
                  .map((r) => (
                    <li key={r.key}>
                      <span>{r.label}</span>
                      <span>{r.perGram ? `${rupees(r.perGram)}/g` : "Not set"}</span>
                    </li>
                  ))}
              </ul>
            )}
            <Link href="/admin/rates" className="text-link">
              Update Rates
            </Link>
          </div>
          <div className="stat-grid">
            <StatTile label="Visits" values={series("visits")} i={1} />
            <StatTile label="Product views" values={series("views")} i={2} />
            <StatTile label="Added to enquiry cart" values={series("cartAdds")} i={3} />
            <StatTile label="WhatsApp opens" values={series("whatsapp")} i={4} />
          </div>
        </section>

        <section className="dash-mid">
          <div className="dash-card rise" style={{ "--i": 5 } as React.CSSProperties} aria-labelledby="activity-title">
            <ActivityChart days={recent.days} />
          </div>
          <div className="dash-card rise" style={{ "--i": 6 } as React.CSSProperties} aria-labelledby="top-title">
            <div className="card-head">
              <h2 id="top-title">Most Viewed Pieces</h2>
              <Link href="/admin/products" className="text-link">
                All Products
              </Link>
            </div>
            {top.length ? (
              <ol className="top-list">
                {top.map((it, n) => (
                  <li key={it.id}>
                    <span className="top-rank">{n + 1}</span>
                    <Link href={`/admin/item/${it.id}`} className="top-thumb" tabIndex={-1} aria-hidden="true">
                      <Photo id={it.photos[0]} alt="" sizes="48px" w={96} h={120} />
                    </Link>
                    <span className="top-info">
                      <Link href={`/admin/item/${it.id}`}>{it.name}</Link>
                      <span className="help">{[it.code, it.piece && `#${it.piece}`].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="top-num">
                      <span>
                        <strong>{it.views}</strong> {it.views === 1 ? "view" : "views"}
                      </span>
                      <span className="help">
                        {it.enquiries} {it.enquiries === 1 ? "enquiry" : "enquiries"}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">No live pieces yet.</p>
            )}
          </div>
        </section>

        <section className="dash-bottom">
          <div className="dash-card rise" style={{ "--i": 7 } as React.CSSProperties} aria-labelledby="enq-title">
            <div className="card-head">
              <h2 id="enq-title">Latest Enquiries</h2>
              <Link href="/admin/enquiries" className="text-link">
                All Enquiries
              </Link>
            </div>
            {enquiries.length ? (
              <ul className="enq-list">
                {enquiries.map((e) => (
                  <li key={e._id.toHexString()}>
                    <p className="help">
                      {formatDayTime(e.createdAt)} · Ref {enquiryRef(e._id)} · {ENQUIRY_STATUSES[e.status]}
                    </p>
                    <p>{e.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}</p>
                    <p className="line-price">{rupees(e.total)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No WhatsApp enquiries yet. Print the counter QR so walk-in customers can browse.</p>
            )}
          </div>
          <div className="dash-card rise" style={{ "--i": 8 } as React.CSSProperties} aria-labelledby="sales-title">
            <div className="card-head">
              <h2 id="sales-title">Last 30 Days</h2>
            </div>
            <dl className="kv">
              <div>
                <dt>Enquiries confirmed or sold</dt>
                <dd>{month.confirmed}</dd>
              </div>
              <div>
                <dt>Pieces marked sold</dt>
                <dd>{month.sold}</dd>
              </div>
              <div>
                <dt>Estimated value sold</dt>
                <dd>{rupees(month.soldValue)}</dd>
              </div>
              <div>
                <dt>WhatsApp opens</dt>
                <dd>{month.whatsapp}</dd>
              </div>
            </dl>
            <p className="help">A WhatsApp open means the customer reached WhatsApp; it doesn’t mean they sent the message.</p>
            <div className="exports">
              <a href="/admin/export/backup.json" className="btn btn-quiet btn-sm">
                <DownloadIcon size={16} /> Backup
              </a>
              <a href="/admin/export/items.csv" className="text-link">
                Products CSV
              </a>
              <a href="/admin/export/enquiries.csv" className="text-link">
                Enquiries CSV
              </a>
              <a href="/admin/export/stats.csv" className="text-link">
                Daily Stats CSV
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
