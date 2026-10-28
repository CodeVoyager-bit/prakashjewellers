import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

export const auth = betterAuth({
  database: mongodbAdapter(db),
  // Staff only: accounts are created with `npm run add-staff`, never through the site.
  emailAndPassword: { enabled: true, disableSignUp: true },
  // Serverless instances don't share memory, so login attempts are counted in MongoDB.
  rateLimit: { storage: "database" },
  plugins: [nextCookies()],
});

export async function requireStaff() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");
  return session;
}
