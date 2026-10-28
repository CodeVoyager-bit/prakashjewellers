// Plain constants shared by server code and client forms (no database imports here).

// Palettes from the design lookbook; the layout is shared, the owner picks one in admin.
export const THEMES = {
  profile: "Profile: ivory, green & gold",
  rose: "Rose & Pearl",
  emerald: "Emerald Art Deco",
  maroon: "Maroon velvet",
} as const;
export type Theme = keyof typeof THEMES;
export const isTheme = (t: unknown): t is Theme => typeof t === "string" && t in THEMES;

// Optional rows in the product details table, in display order.
export const DETAILS = {
  metal: "Metal",
  stones: "Stones",
  finish: "Finish",
  occasion: "Occasion",
  includes: "Set includes",
} as const;
export type DetailKey = keyof typeof DETAILS;
