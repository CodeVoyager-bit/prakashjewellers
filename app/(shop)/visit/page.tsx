import { ChatIcon, ClockIcon, InstagramIcon, PhoneIcon, PinIcon } from "@/components/icons";
import { RateTag } from "@/components/shop";
import { InstallApp } from "@/components/ui";
import { getSettings } from "@/lib/data";

export const metadata = { title: "Visit & Contact" };

// Unconfirmed details show as labelled placeholders rather than invented values.
export default async function VisitPage() {
  const s = await getSettings();
  const place = `${s.name}, ${s.address}`;
  const ways = [
    { Icon: PinIcon, label: "Address", value: s.address, href: s.address && `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`, action: "Open in Maps" },
    { Icon: ClockIcon, label: "Opening hours", value: s.hours, href: "", action: "" },
    { Icon: PhoneIcon, label: "Call", value: s.phone, href: s.phone && `tel:${s.phone}`, action: "Call Now" },
    { Icon: ChatIcon, label: "WhatsApp", value: s.whatsapp.replace(/^91(\d{5})(\d{5})$/, "+91 $1 $2"), href: s.whatsapp && `https://wa.me/${s.whatsapp}`, action: "Chat on WhatsApp" },
    { Icon: InstagramIcon, label: "Instagram", value: s.instagram && `@${s.instagram}`, href: s.instagram && `https://instagram.com/${s.instagram}`, action: "See New Designs" },
  ];

  return (
    <div className="wrap page-narrow visit">
      <p className="eyebrow rise">Visit &amp; contact</p>
      <h1 className="rise" translate="no" style={{ "--i": 1 } as React.CSSProperties}>
        {s.name}
      </h1>
      <p className="muted lede-sm rise" style={{ "--i": 2 } as React.CSSProperties}>
        Come in to see the pieces in person, or message first to check that a piece is still available.
      </p>
      <ul className="contact-list">
        {ways.map(({ Icon, label, value, href, action }, i) => (
          <li key={label} className="reveal" style={{ "--i": i } as React.CSSProperties}>
            <span className="contact-icon">
              <Icon size={22} />
            </span>
            <div>
              <p className="contact-label">{label}</p>
              <p className="contact-value">{value || <span className="placeholder">To be confirmed by the store</span>}</p>
            </div>
            {href && action && (
              <a href={href} className="btn btn-quiet btn-sm" {...(href.startsWith("http") && { target: "_blank", rel: "noopener noreferrer" })}>
                {action}
              </a>
            )}
          </li>
        ))}
        <InstallApp name={s.name} />
      </ul>
      {s.address && (
        <iframe
          className="map reveal"
          title={`Map showing ${s.name}`}
          src={`https://www.google.com/maps?q=${encodeURIComponent(place)}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
      <div className="visit-rate">
        <RateTag rate={s.rates.find((r) => r.perGram) ?? s.rates[0]} />
      </div>
    </div>
  );
}
