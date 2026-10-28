import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { LoginForm } from "@/components/admin";
import { auth } from "@/lib/auth";
import { getSettings } from "@/lib/data";

export const metadata = { title: "Staff Sign In", robots: { index: false } };

export default async function LoginPage() {
  if (await auth.api.getSession({ headers: await headers() })) redirect("/admin");
  const s = await getSettings();
  return (
    <main className="login">
      <div className="login-card">
        <p className="eyebrow" translate="no">
          {s.name}
        </p>
        <h1>Staff Sign In</h1>
        <p className="help">For shop staff only. Customers don’t need an account to enquire.</p>
        <LoginForm />
      </div>
    </main>
  );
}
