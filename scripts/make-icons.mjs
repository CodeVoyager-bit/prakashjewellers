// Draws every brand image from the PJ monogram: the favicon, the iPhone and Android home-screen icons, and the
// card WhatsApp/Instagram/Google show when a link is shared. Run after changing the logo: npm run icons
// The monogram paths match components/logo.tsx; update both if the store supplies its original artwork.
import { writeFile } from "node:fs/promises";
import { ImageResponse } from "next/og.js";

const BG = "radial-gradient(circle at 50% 38%, #6b1522 0%, #4a0a12 55%, #330609 100%)";
const GOLD = "#e7c77f";
const PATHS = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6df9f"/><stop offset="0.45" stop-color="#d6aa4e"/><stop offset="1" stop-color="#9a7024"/></linearGradient></defs><g stroke="#9c9c9c" stroke-width="0.9" stroke-linejoin="round"><path d="M52 6h22l7 8-18 20-18-20Z" fill="#fff"/><path d="M45 14h36M52 6l-3 8 14 20 14-20-3-8M60 6l-4 8 7 20 7-20-4-8" fill="none"/></g><g fill="url(#g)"><path d="M10 72C17 49 38 37 66 38l-1 6C42 43 24 52 10 72Z"/><path d="M58 40h12v66c0 20-14 30-31 30-14 0-24-8-26-20 5 9 14 13 24 13 13 0 21-9 21-25Z"/><path d="M66 38c28-3 46 9 46 27 0 17-16 28-38 27l-1-7c15 1 27-7 27-20 0-14-13-21-34-20Z"/></g>`;
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140">${PATHS}</svg>`;

const el = (type, style, children) => ({ type, props: { style, children } });
const mark = (h) => ({ type: "img", props: { src: `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`, width: (h * 120) / 140, height: h } });
const font = async (family, weight) => {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}:wght@${weight}`)).text();
  return (await fetch(css.match(/src: url\((.+?)\)/)[1])).arrayBuffer();
};
const png = async (file, node, width, height, fonts) => {
  await writeFile(file, Buffer.from(await new ImageResponse(node, { width, height, fonts }).arrayBuffer()));
  console.log(`${file} ${width}×${height}`);
};

// Home-screen icons fill the square (phones round the corners); the mark stays inside the maskable safe circle.
const icon = (size) => el("div", { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundImage: BG }, [mark(Math.round(size * 0.6))]);
await png("public/icon-512.png", icon(512), 512, 512);
await png("public/icon-192.png", icon(192), 192, 192);
await png("app/apple-icon.png", icon(180), 180, 180);

// Browser-tab favicon: vector, so it stays sharp at any size.
await writeFile("app/icon.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#4a0a12"/><svg x="11" y="6" width="42" height="52" viewBox="0 0 120 140">${PATHS}</svg></svg>\n`);
console.log("app/icon.svg");

// Link preview, 1200×630. Everything sits in the middle square, since WhatsApp often crops to a square thumbnail.
const [cinzel, jost] = await Promise.all([font("Cinzel", 600), font("Jost", 400)]);
const caps = (text, size, spacing, color, extra = {}) =>
  // Letter spacing trails the last letter too; matching left padding keeps the word centred.
  el("div", { fontSize: size, letterSpacing: spacing, paddingLeft: spacing, color, lineHeight: 1, ...extra }, text);
await png(
  "app/opengraph-image.png",
  el("div", { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundImage: BG, fontFamily: "Cinzel" }, [
    mark(200),
    caps("PRAKASH", 88, 6, GOLD, { marginTop: 28 }),
    caps("JEWELLERS", 26, 17, "#d4b163", { marginTop: 14 }),
    el("div", { display: "flex", alignItems: "center", gap: 18, marginTop: 30 }, [
      el("div", { width: 56, height: 1, backgroundColor: "#d4b163", opacity: 0.6 }),
      caps("NAGOTHANE", 20, 6, "#f3e7d3", { fontFamily: "Jost" }),
      el("div", { width: 56, height: 1, backgroundColor: "#d4b163", opacity: 0.6 }),
    ]),
  ]),
  1200,
  630,
  [
    { name: "Cinzel", data: cinzel, weight: 600 },
    { name: "Jost", data: jost, weight: 400 },
  ],
);
