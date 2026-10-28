import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import { getSettings, type Theme } from "@/lib/data";
import "./globals.css";

// Every page reads today's rate and stock from MongoDB, so nothing is prerendered.
export const dynamic = "force-dynamic";

const display = Bodoni_Moda({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Jost({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

const HEADER: Record<Theme, string> = { red: "#4A0A12", green: "#08332A", black: "#0F0D0B", white: "#FBF7F1" };

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return {
    title: { default: `${s.name} · Gold Jewellery at Today’s Rate`, template: `%s · ${s.name}` },
    description: `Handcrafted 22K gold jewellery from ${s.name}, priced live at today’s gold rate. Send your enquiry on WhatsApp.`,
  };
}

export async function generateViewport(): Promise<Viewport> {
  return { themeColor: HEADER[(await getSettings()).theme] };
}

// Preview another colour theme before switching it in admin: open any page with ?theme=green.
const previewTheme = `try{var t=new URLSearchParams(location.search).get("theme")||sessionStorage.getItem("theme");if(t){sessionStorage.setItem("theme",t);document.documentElement.dataset.theme=t}}catch(e){}`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const s = await getSettings();
  return (
    <html lang="en-IN" data-theme={s.theme} className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <script dangerouslySetInnerHTML={{ __html: previewTheme }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
