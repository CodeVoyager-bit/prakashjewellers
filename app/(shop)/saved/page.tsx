import { SavedList } from "@/components/saved";
import { getSettings } from "@/lib/data";

export const metadata = { title: "Saved" };

export default async function SavedPage() {
  const s = await getSettings();
  return (
    <div className="wrap page-narrow">
      <p className="eyebrow">Your shortlist</p>
      <h1>Saved</h1>
      <p className="muted lede-sm">Pieces you’ve hearted, priced at today’s rate. Send them to the shop together on WhatsApp. Nothing is booked or paid here.</p>
      <SavedList phone={s.phone} />
    </div>
  );
}
