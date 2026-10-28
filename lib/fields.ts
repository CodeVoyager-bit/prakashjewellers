// Plain constants shared by server code and client forms (no database imports here).

// Burgundy follows the UI brief; the other three come from the design lookbook. One shared layout.
export const THEMES = {
  burgundy: "Burgundy (recommended)",
  profile: "Profile: ivory, green & gold",
  rose: "Rose & Pearl",
  emerald: "Emerald Art Deco",
} as const;
export type Theme = keyof typeof THEMES;
export const isTheme = (t: unknown): t is Theme => typeof t === "string" && t in THEMES;

// Optional rows in the product details table, in display order.
export const DETAILS = {
  stones: "Stones",
  finish: "Finish",
  occasion: "Occasion",
  includes: "Set includes",
} as const;
export type DetailKey = keyof typeof DETAILS;

export const STATUSES = {
  live: "Live: shown to customers",
  draft: "Draft: hidden, staff can preview",
  archived: "Archived: hidden, kept for records",
} as const;
export type Status = keyof typeof STATUSES;

export const ENQUIRY_STATUSES = {
  opened: "Opened WhatsApp",
  confirmed: "Confirmed with customer",
  closed: "Not proceeding",
} as const;
export type EnquiryStatus = keyof typeof ENQUIRY_STATUSES;

// Browser chrome (header surface) and page background per theme; also the installed app's splash colours.
export const THEME_COLORS: Record<Theme, { head: string; bg: string }> = {
  profile: { head: "#FFFDF8", bg: "#f7f3ea" },
  rose: { head: "#FFF8F6", bg: "#f6e9e6" },
  emerald: { head: "#FBF7EC", bg: "#f4eedf" },
  burgundy: { head: "#FFFFFF", bg: "#FAF6EF" },
};
