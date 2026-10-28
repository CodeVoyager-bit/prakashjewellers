import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin";
import { BackIcon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { auth } from "@/lib/auth";

export const metadata = { title: "Staff Sign In", robots: { index: false } };

export default async function LoginPage() {
  if (await auth.api.getSession({ headers: await headers() })) redirect("/admin");
  return (
    <main className="login">
      <section className="login-brand">
        <Logo light />
      </section>
      <section className="login-panel">
        <Link href="/" className="back">
          <BackIcon size={16} /> Back to the Store
        </Link>
        <div className="login-card">
          <p className="eyebrow">Staff portal</p>
          <h1>Sign In</h1>
          <p className="help">For store staff only. Customers don’t need an account to enquire.</p>
          <LoginForm />
          <p className="help login-forgot">Forgot your password? Ask the store owner to reset it.</p>
        </div>
      </section>
    </main>
  );
}
