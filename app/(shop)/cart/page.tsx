import { CartView } from "@/components/cart";
import { getSettings } from "@/lib/data";

export const metadata = { title: "Enquiry Cart" };

export default async function CartPage() {
  const s = await getSettings();
  return (
    <div className="wrap page-narrow">
      <p className="eyebrow rise">Your selection</p>
      <h1 className="rise" style={{ "--i": 1 } as React.CSSProperties}>
        Enquiry Cart
      </h1>
      <p className="muted lede-sm rise" style={{ "--i": 2 } as React.CSSProperties}>
        Review the pieces you like, then send one enquiry to the store on WhatsApp. Nothing is reserved, booked or paid here.
      </p>
      <CartView phone={s.phone} />
    </div>
  );
}
