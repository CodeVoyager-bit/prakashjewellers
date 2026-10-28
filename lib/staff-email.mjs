// Staff sign in with a phone number. better-auth keys password logins by email, so the number
// is stored as an internal address on the reserved .invalid domain (never mailed).
// Shared by the login form and scripts/add-staff.mjs.
export function staffEmail(phone) {
  const d = String(phone).replace(/\D/g, "").replace(/^0+/, "");
  return `${d.length === 10 ? `91${d}` : d}@staff.invalid`;
}
