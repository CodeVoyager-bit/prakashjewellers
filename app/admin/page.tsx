import Link from "next/link";
import { AdminBar } from "@/components/admin-bar";
import { AlertIcon, CheckIcon, DownloadIcon, PlusIcon } from "@/components/icons";
import { requireStaff } from "@/lib/auth";
import { ENQUIRY_STATUSES, getAllItems, getEnquiries, getSettings, getStats } from "@/lib/data";
import { formatDayTime, isToday, rupees } from "@/lib/price";

export const metadata = { title: "Staff Dashboard", robots: { index: false } };

export default async function Dashboard() {
  const session = await requireStaff();
  const [s, items, week, month, enquiries] = await Promise.all([getSettings(), getAllItems(), getStats(7), getStats(30), getEnquiries(5)]);
  const live = items.filter((i) => i.status === "live");
  const attention = [
    ...s.rates.filter((r) => !r.perGram).map((r) => `${r.label} rate isn’t set, so its pieces show “price on request”.`),
    ...(live.some((i) => i.pricing === "weight" && !i.weight) ? ["Some live pieces have no weight."] : []),
    ...(items.some((i) => i.demo) ? ["Sample pieces are still in the catalogue. Remove them before launch (see the Staff Guide)."] : []),
  ];

  return (
    <>
      <AdminBar name={s.name} current="/admin" />
      <main className="wrap admin">
        <h1>Good day, {session.user.name.split(" ")[0] || "there"}</h1>

        <section className="panel rate-panel" aria-labelledby="rates-title">
          <div className="panel-head">
            <h2 id="rates-title">Today’s Rates</h2>
            <Link href="/admin/rates" className="btn btn-primary btn-sm">
              Update Rates
            </Link>
          </div>
          <ul className="rate-cards">
            {s.rates.map((r) => {
              const fresh = r.perGram > 0 && isToday(r.updatedAt);
              return (
                <li key={r.key} className={fresh ? "is-fresh" : "is-stale"}>
                  <p className="rate-name">{r.label}</p>
                  <p className="rate-value">{r.perGram ? `${rupees(r.perGram)}/g` : "Not set"}</p>
                  <p className="help">
                    {fresh ? <CheckIcon size={14} /> : <AlertIcon size={14} />} {r.updatedAt ? `${formatDayTime(r.updatedAt)} by ${r.updatedBy || "staff"}` : "Never updated"}
                  </p>
                  {!fresh && r.perGram > 0 && <p className="badge-warn">Not updated today: customers see a warning</p>}
                </li>
              );
            })}
          </ul>
        </section>

        {attention.length > 0 && (
          <section className="notice notice-warn" aria-label="Needs attention">
            <ul>
              {attention.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="quick-actions" aria-label="Shortcuts">
          <Link href="/admin/item/new" className="btn btn-primary">
            <PlusIcon size={18} /> Add Product
          </Link>
          <Link href="/admin/products" className="btn btn-quiet">
            Manage Stock
          </Link>
          <Link href="/admin/qr" className="btn btn-quiet">
            Counter QR
          </Link>
          <a href="/admin/export/backup.json" className="btn btn-quiet">
            <DownloadIcon size={18} /> Backup
          </a>
        </section>

        <section className="panel" aria-labelledby="pilot-title">
          <h2 id="pilot-title">Pilot Report</h2>
          <p className="help">Counts are from this site only. A WhatsApp “open” means the customer reached WhatsApp; it doesn’t mean they sent the message.</p>
          <div className="table-scroll">
            <table className="stats-table">
              <thead>
                <tr>
                  <th scope="col">Measure</th>
                  <th scope="col">Last 7 days</th>
                  <th scope="col">Last 30 days</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Catalogue visits", week.visits, month.visits],
                    ["Product views", week.views, month.views],
                    ["Added to enquiry cart", week.cartAdds, month.cartAdds],
                    ["WhatsApp opened", week.whatsapp, month.whatsapp],
                    ["Enquiries confirmed by staff", week.confirmed, month.confirmed],
                    ["Pieces marked sold", week.sold, month.sold],
                    ["Estimated value sold", rupees(week.soldValue), rupees(month.soldValue)],
                  ] as const
                ).map(([k, a, b]) => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td>{a}</td>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="help">
            Export for the client review: <a href="/admin/export/items.csv">Products CSV</a> · <a href="/admin/export/enquiries.csv">Enquiries CSV</a> ·{" "}
            <a href="/admin/export/sales.csv">Sales CSV</a> · <a href="/admin/export/stats.csv">Daily stats CSV</a>
          </p>
        </section>

        <section className="panel" aria-labelledby="enq-title">
          <div className="panel-head">
            <h2 id="enq-title">Latest Enquiries</h2>
            <Link href="/admin/enquiries" className="text-link">
              All Enquiries
            </Link>
          </div>
          {enquiries.length ? (
            <ul className="enq-list">
              {enquiries.map((e) => (
                <li key={e._id.toHexString()}>
                  <p className="code">
                    {formatDayTime(e.createdAt)} · Ref PJ-{e._id.toHexString().slice(-6).toUpperCase()} · {ENQUIRY_STATUSES[e.status]}
                  </p>
                  <p>{e.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}</p>
                  <p className="line-price">{rupees(e.total)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No WhatsApp enquiries yet. Print the counter QR so walk-in customers can browse.</p>
          )}
        </section>
      </main>
    </>
  );
}
