// Creates a staff login, or resets the password if the email already exists.
// Usage: npm run add-staff -- owner@example.com 'a-strong-password' "Owner Name"
import { MongoClient } from "mongodb";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

const [email, password, name] = process.argv.slice(2);
if (!email || !password || password.length < 8) {
  console.error("Usage: npm run add-staff -- <email> <password, 8+ chars> [name]");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);
const auth = betterAuth({
  database: mongodbAdapter(client.db("prakashjewellers")),
  emailAndPassword: { enabled: true },
});

const ctx = await auth.$context;
const found = await ctx.internalAdapter.findUserByEmail(email.toLowerCase());
if (found) {
  await ctx.internalAdapter.updatePassword(found.user.id, await ctx.password.hash(password));
  console.log(`Password reset for ${email}`);
} else {
  await auth.api.signUpEmail({ body: { email, password, name: name ?? email.split("@")[0] } });
  console.log(`Staff login created for ${email}`);
}
await client.close();
