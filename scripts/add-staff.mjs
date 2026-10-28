// Creates an owner login (no role = owner), or resets the password if the phone number already has one.
// Usage: npm run add-staff -- 9876543210 'a-strong-password' "Owner Name"
import { MongoClient } from "mongodb";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { staffEmail } from "../lib/staff-email.mjs";

const [phone, password, name] = process.argv.slice(2);
const email = phone && staffEmail(phone);
if (!/^91\d{10}@/.test(email ?? "") || !password || password.length < 8) {
  console.error("Usage: npm run add-staff -- <10-digit mobile> <password, 8+ chars> [name]");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);
const auth = betterAuth({
  database: mongodbAdapter(client.db("prakashjewellers")),
  emailAndPassword: { enabled: true },
});

const ctx = await auth.$context;
const found = await ctx.internalAdapter.findUserByEmail(email);
if (found) {
  await ctx.internalAdapter.updatePassword(found.user.id, await ctx.password.hash(password));
  console.log(`Password reset for +${email.split("@")[0]}`);
} else {
  await auth.api.signUpEmail({ body: { email, password, name: name ?? "Staff" } });
  console.log(`Staff login created for +${email.split("@")[0]}`);
}
await client.close();
