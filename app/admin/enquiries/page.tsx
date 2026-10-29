import { EnquiryStatusSelect } from "@/components/admin";
import { AdminBar } from "@/components/admin-bar";
import { requireStaff } from "@/lib/auth";
import { getEnquiries, getSettings, salesDb } from "@/lib/data";
import { formatDayTime, rupees } from "@/lib/price";

// "Name (PJ-002 #2)", or just the name when a piece has no code or number yet.
const label = (name: string, ...parts: unknown[]) => {
  const tag = parts.filter(Boolean).join(" ");
  return tag ? `${name} (${tag})` : name;
};

export const metadata = { title: "Enquiries & Sales", robots: { index: false } };

export default async function EnquiriesPage() {
  await requireStaff();
  const [s, enquiries, sales] = await Promise.all([getSettings(), getEnquiries(100), salesDb.find().sort({ at: -1 }).limit(50).toArray()]);
  return (
    <>
      <AdminBar name={s.name} current="/admin/enquiries" />
      <main className="wrap admin">
        <h1>Enquiries &amp; Sales</h1>
        <section className="panel" aria-labelledby="enq">
          <h2 id="enq">WhatsApp Enquiries</h2>
          <p className="help">
            Listed when a customer continued to WhatsApp. Match the Ref in their message, then record how it went. An enquiry never
            reserves stock: after a sale, use Mark Sold on the Products page.
          </p>
          {enquiries.length ? (
            <ul className="enq-list">
              {enquiries.map((e) => (
                <li key={e._id.toHexString()} className="enq-row">
                  <div>
                    <p className="code">
                      {formatDayTime(e.createdAt)} · Ref PJ-{e._id.toHexString().slice(-6).toUpperCase()}
                    </p>
                    <p>{e.items.map((i) => label(i.name, i.code, i.piece && `#${i.piece}`, i.qty > 1 && `×${i.qty}`)).join(", ")}</p>
                    <p className="small muted">
                      Estimate {rupees(e.total)}
                      {e.rates && ` · ${e.rates}`}
                    </p>
                  </div>
                  <EnquiryStatusSelect id={e._id.toHexString()} status={e.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No enquiries yet.</p>
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
                  </p>
                  <p>
                    {label(x.name, x.code, x.piece && `#${x.piece}`)}
                  </p>
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
