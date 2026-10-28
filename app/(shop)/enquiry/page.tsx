import { EnquiryList } from "@/components/enquiry-list";
import { getSettings } from "@/lib/data";

export const metadata = { title: "Your Enquiry" };

export default async function EnquiryPage() {
  const s = await getSettings();
  return <EnquiryList phone={s.phone} />;
}
