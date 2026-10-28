import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";

export const auth = betterAuth({
  database: mongodbAdapter(db),
  // Staff only: logins are created by an owner on the Staff page or with `npm run add-staff`, never by sign-up.
  emailAndPassword: { enabled: true, disableSignUp: true },
  // "owner" manages staff logins, "staff" can't. Logins made with `npm run add-staff` have no role and are owners.
  user: {
    additionalFields: {
      role: { type: "string", required: false, input: false },
      // Kept on the login, since sessions are deleted on sign-out and expiry.
      lastSignInAt: { type: "date", required: false, input: false },
    },
  },
  databaseHooks: {
    session: { create: { after: async (session, ctx) => void (await ctx?.context.internalAdapter.updateUser(session.userId, { lastSignInAt: new Date() })) } },
  },
  // Serverless instances don't share memory, so login attempts are counted in MongoDB.
  rateLimit: { storage: "database" },
  plugins: [nextCookies()],
});

export const isOwner = (user: { role?: string | null }) => user.role !== "staff";

export async function requireStaff() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/admin/login");
  return session;
}
