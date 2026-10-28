import { createHash } from "node:crypto";

// Cloudinary signed-request rule: sort params, join as k=v&k=v, append the secret, SHA-1 hex.
// Plain JS so scripts/demo-data.mjs can share it.
export function sign(params, secret) {
  const str = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return createHash("sha1").update(str + secret).digest("hex");
}
