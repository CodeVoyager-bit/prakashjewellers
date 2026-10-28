import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/data";
import { THEME_COLORS } from "@/lib/fields";

// Lets phones install the site as an app (Android: Install; iPhone: Share → Add to Home Screen).
// Nothing is cached offline on purpose: every price must be today's.
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  const c = THEME_COLORS[s.theme];
  return {
    name: s.name,
    // Home-screen labels truncate past ~12 characters.
    short_name: s.name.length > 12 ? s.name.split(" ")[0] : s.name,
    description: "Gold jewellery priced at today’s rate. Save pieces and enquire on WhatsApp.",
    start_url: "/",
    display: "standalone",
    background_color: c.bg,
    theme_color: c.head,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
