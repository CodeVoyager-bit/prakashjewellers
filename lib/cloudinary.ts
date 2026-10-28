import { createHash } from "node:crypto";

// Cloudinary signed-request rule: sort params, join as k=v&k=v, append the secret, SHA-1 hex.
export function sign(params: Record<string, string | number>, secret: string) {
  const str = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return createHash("sha1").update(str + secret).digest("hex");
}
