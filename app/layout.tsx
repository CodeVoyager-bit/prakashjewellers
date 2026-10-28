import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Cinzel, Jost } from "next/font/google";
import { getSettings } from "@/lib/data";
import { THEME_COLORS } from "@/lib/fields";
import "./globals.css";

// Every page reads today's rate and stock from MongoDB, so nothing is prerendered.
export const dynamic = "force-dynamic";

const display = Bodoni_Moda({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Jost({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Roman capitals for the logo lockup only, matching the store's artwork.
const logo = Cinzel({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-logo", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: `${s.name} · Gold Jewellery at Today’s Rate`, template: `%s · ${s.name}` },
    description: `Handcrafted 22K gold jewellery from ${s.name}, priced live at today’s gold rate. Send your enquiry on WhatsApp.`,
  };
}

// viewportFit "cover" so the header and tab bar pad around the notch when the site runs as an installed app.
export async function generateViewport(): Promise<Viewport> {
  return { themeColor: THEME_COLORS[(await getSettings()).theme].head, viewportFit: "cover" };
}

// Preview another theme before switching it in admin: open any page with ?theme=rose (or emerald, profile, burgundy).
// Also keeps Chrome's install prompt for the Contact page's "Install App" button.
const inlineScript = `try{var t=new URLSearchParams(location.search).get("theme")||sessionStorage.getItem("theme");if(t){sessionStorage.setItem("theme",t);document.documentElement.dataset.theme=t}}catch(e){}addEventListener("beforeinstallprompt",function(e){window.pwaPrompt=e})`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const s = await getSettings();
  return (
    <html lang="en-IN" data-theme={s.theme} className={`${display.variable} ${sans.variable} ${logo.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <script dangerouslySetInnerHTML={{ __html: inlineScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
