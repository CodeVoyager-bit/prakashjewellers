import { notFound } from "next/navigation";

// The 404 boundary's own title is replaced on the client by this route's, so it carries the same one.
export const metadata = { title: "Page Not Found" };

// Unknown URLs land here so the 404 page renders inside the shop header and footer.
export default function Missing() {
  notFound();
}
