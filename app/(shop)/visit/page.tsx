import { ChatIcon, InstagramIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { Empty, RateTag } from "@/components/shop";
import { getSettings } from "@/lib/data";

export const metadata = { title: "Visit & Contact" };

export default async function VisitPage() {
  const s = await getSettings();
  const ways = [
    s.address && { Icon: PinIcon, label: "Visit the shop", value: s.address, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name}, ${s.address}`)}`, action: "Open in Maps" },
    s.phone && { Icon: PhoneIcon, label: "Call", value: s.phone, href: `tel:${s.phone}`, action: "Call Now" },
    s.whatsapp && { Icon: ChatIcon, label: "WhatsApp", value: s.whatsapp.replace(/^91(\d{5})(\d{5})$/, "+91 $1 $2"), href: `https://wa.me/${s.whatsapp}`, action: "Chat on WhatsApp" },
    s.instagram && { Icon: InstagramIcon, label: "Instagram", value: `@${s.instagram}`, href: `https://instagram.com/${s.instagram}`, action: "See New Designs" },
  ].filter((w) => !!w);

  return (
    <div className="wrap page-narrow visit">
      <p className="eyebrow">Visit &amp; contact</p>
      <h1 translate="no">{s.name}</h1>
      <p className="muted lede-sm">Come in to see every piece in person, or message first and the shop will keep it ready.</p>
      {ways.length ? (
        <ul className="contact-list">
          {ways.map(({ Icon, label, value, href, action }) => (
            <li key={label}>
              <span className="contact-icon">
                <Icon size={22} />
              </span>
              <div>
                <p className="contact-label">{label}</p>
                <p>{value}</p>
              </div>
              <a href={href} className="btn btn-quiet btn-sm" {...(href.startsWith("http") && { target: "_blank", rel: "noopener noreferrer" })}>
                {action}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <Empty title="Contact details coming soon">The shop’s address and numbers will appear here.</Empty>
      )}
      <div className="visit-rate">
        <RateTag rate={s.rate} rateAt={s.rateAt} />
      </div>
    </div>
  );
}
