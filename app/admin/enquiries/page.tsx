import Link from "next/link";
import { CopyRef, EnquiryNote, EnquiryStatusSelect } from "@/components/admin";
import { AdminBar } from "@/components/admin-bar";
import { Photo } from "@/components/photo";
import { ConfirmForm } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { ENQUIRY_STATUSES, OPEN_ENQUIRY, enquiryCounts, enquiryRef, getEnquiries, getSettings, isEnquiryStatus, itemsDb, oid, priceFor, salesDb, toItem, type EnquiryStatus } from "@/lib/data";
import { formatDayTime, rupees } from "@/lib/price";
import { markSold } from "../actions";

// "Name (PJ-002 #2)", or just the name when a piece has no code or number yet.
const label = (name: string, ...parts: unknown[]) => {
  const tag = parts.filter(Boolean).join(" ");
  return tag ? `${name} (${tag})` : name;
};
// "12 min ago", "3 h ago", "2 days ago": how long a customer has been waiting.
const ago = (d: Date) => {
  const min = Math.round((Date.now() - d.getTime()) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 1440) return `${Math.round(min / 60)} h ago`;
  const days = Math.round(min / 1440);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

export const metadata = { title: "Enquiries & Sales", robots: { index: false } };

export default async function EnquiriesPage({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  await requireStaff();
  const raw = (await searchParams).status;
  const picked = Array.isArray(raw) ? raw[0] : raw;
  const status: EnquiryStatus | undefined = isEnquiryStatus(picked) ? picked : undefined;
  const [s, enquiries, counts, sales] = await Promise.all([getSettings(), getEnquiries(100, status), enquiryCounts(), salesDb.find().sort({ at: -1 }).limit(50).toArray()]);

  // Each enquired piece as it is now: stock, photo and today's price.
  const ids = [...new Set(enquiries.flatMap((e) => e.items.map((i) => i.id)))].map(oid).filter((x) => x !== null);
  const current = new Map((await itemsDb.find({ _id: { $in: ids } }).toArray()).map((d) => [d._id.toHexString(), toItem(d)]));

  const n = (k: EnquiryStatus) => counts[k]?.n ?? 0;
  const all = Object.values(counts).reduce((t, c) => t + (c?.n ?? 0), 0);
  const openValue = OPEN_ENQUIRY.reduce((t, k) => t + (counts[k]?.value ?? 0), 0);

  return (
    <>
      <AdminBar name={s.name} current="/admin/enquiries" />
      <main className="wrap admin">
        <div className="dash-head">
          <div>
            <h1>Enquiries &amp; Sales</h1>
            <p className="muted">Every customer who sent their selection to your WhatsApp. Work each one from New to Sold.</p>
          </div>
        </div>

        <section className="enq-summary" aria-label="Summary">
          <div className={`enq-tile${n("opened") ? " is-urgent" : ""}`}>
            <p className="stat-label">Need a reply</p>
            <p className="stat-value">{n("opened")}</p>
            <p className="help">New, not yet answered</p>
          </div>
          <div className="enq-tile">
            <p className="stat-label">In progress</p>
            <p className="stat-value">{n("replied") + n("confirmed")}</p>
            <p className="help">
              {n("replied")} replied · {n("confirmed")} confirmed
            </p>
          </div>
          <div className="enq-tile">
            <p className="stat-label">Open value</p>
            <p className="stat-value">{rupees(openValue)}</p>
            <p className="help">Estimates of every open enquiry</p>
          </div>
          <div className="enq-tile">
            <p className="stat-label">Sold</p>
            <p className="stat-value">{n("sold")}</p>
            <p className="help">{n("closed")} not proceeding</p>
          </div>
        </section>

        <section className="panel" aria-labelledby="enq">
          <div className="card-head">
            <h2 id="enq">WhatsApp Enquiries</h2>
          </div>
          <nav className="chips enq-filter" aria-label="Show">
            <Link href="/admin/enquiries" className="chip" aria-current={status ? undefined : "page"}>
              All · {all}
            </Link>
            {(Object.keys(ENQUIRY_STATUSES) as EnquiryStatus[]).map((k) => (
              <Link key={k} href={`/admin/enquiries?status=${k}`} className="chip" aria-current={status === k ? "page" : undefined}>
                {ENQUIRY_STATUSES[k]} · {n(k)}
              </Link>
            ))}
          </nav>

          {enquiries.length ? (
            <ul className="enq-cards">
              {enquiries.map((e) => {
                const id = e._id.toHexString();
                const ref = enquiryRef(e._id);
                return (
                  <li key={id} className="enq-card">
                    <div className="enq-head">
                      <span className={`enq-pill pill-${e.status}`}>{ENQUIRY_STATUSES[e.status]}</span>
                      <span className="enq-ref">
                        {ref} <CopyRef text={ref} />
                      </span>
                      <span className="enq-when" title={formatDayTime(e.createdAt)}>
                        {ago(e.createdAt)}
                      </span>
                      <span className="enq-total">{rupees(e.total)}</span>
                    </div>

                    <ul className="enq-pieces">
                      {e.items.map((line) => {
                        const it = current.get(line.id);
                        const today = it && priceFor(it, s);
                        const then = line.total != null ? line.total * line.qty : null;
                        const now = today ? today.total * line.qty : null;
                        const inStock = !!it && it.status === "live" && it.qty > 0;
                        const stock = !it ? "Removed" : it.status === "archived" ? "Archived" : it.status === "draft" ? "Hidden (draft)" : it.qty > 0 ? `${it.qty} in stock` : "Sold out";
                        return (
                          <li key={line.id}>
                            <Link href={`/admin/item/${line.id}`} className="enq-thumb" tabIndex={-1} aria-hidden="true">
                              <Photo id={it?.photos[0]} alt="" sizes="56px" w={112} h={140} />
                            </Link>
                            <div className="enq-piece">
                              <Link href={`/admin/item/${line.id}`}>{line.name}</Link>
                              <p className="code">{[line.code, line.piece && `#${line.piece}`, line.weight && `${line.weight} g`, line.qty > 1 && `×${line.qty}`].filter(Boolean).join(" · ")}</p>
                              <p className="small">
                                Estimate sent {then != null ? rupees(then) : "on request"}
                                {now != null && now !== then && <span className="muted"> · today {rupees(now)}</span>}
                              </p>
                            </div>
                            <div className="enq-stock">
                              <span className={`stock-badge ${inStock ? "is-in" : "is-out"}`}>{stock}</span>
                              {inStock && (
                                <ConfirmForm action={markSold.bind(null, line.id, id)} message={`Mark one “${line.name}” as sold? Stock goes down by 1, the sale is logged and this enquiry moves to Sold.`}>
                                  <button type="submit" className="btn btn-quiet btn-sm">
                                    Mark Sold
                                  </button>
                                </ConfirmForm>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="enq-foot">
                      <EnquiryStatusSelect id={id} status={e.status} />
                      <EnquiryNote id={id} note={e.note ?? ""} />
                    </div>
                    {e.status === "opened" && <p className="help">Find the customer’s chat in WhatsApp by searching {ref}, then set the status to Replied.</p>}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted empty-small">{status ? `No enquiries are ${ENQUIRY_STATUSES[status].toLowerCase()} right now.` : "No enquiries yet. They appear here when a customer sends their selection on WhatsApp."}</p>
          )}
        </section>

        <section className="panel" aria-labelledby="sales">
          <h2 id="sales">Sales Log</h2>
          <p className="help">Every Mark Sold, with the estimate at that moment. Use it for the pilot review; the bill in the store is the record.</p>
          {sales.length ? (
            <ul className="enq-list">
              {sales.map((x) => (
                <li key={x._id.toHexString()}>
                  <p className="code">
                    {formatDayTime(x.at)} · by {x.by}
                    {x.ref && ` · from enquiry ${x.ref}`}
                  </p>
                  <p>{label(x.name, x.code, x.piece && `#${x.piece}`)}</p>
                  <p className="small muted">{x.estimate != null ? `Estimate ${rupees(x.estimate)}` : "No estimate"}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No sales marked yet.</p>
          )}
        </section>
      </main>
    </>
  );
}
