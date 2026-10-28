import { headers } from "next/headers";
import Link from "next/link";
import { signOut } from "@/app/admin/actions";
import { auth } from "@/lib/auth";
import { Monogram } from "./logo";

const LINKS = [
  ["/admin", "Dashboard"],
  ["/admin/rates", "Rates"],
  ["/admin/products", "Products"],
  ["/admin/enquiries", "Enquiries"],
  ["/admin/staff", "Staff"],
  ["/admin/settings", "Settings"],
  ["/admin/guide", "Guide"],
] as const;

export const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// Staff top bar: monogram and store name, tab pills, the signed-in person.
export async function AdminBar({ name, current }: { name: string; current?: string }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const who = session?.user.name || "Staff";
  return (
    <header className="admin-bar no-print">
      <div className="admin-bar-row">
        <Link href="/admin" className="admin-brand" aria-label={`${name}, staff dashboard`}>
          <Monogram size={30} />
          <span translate="no">{name}</span>
        </Link>
        <nav className="admin-nav" aria-label="Staff">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={current === href ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-user">
          <Link href="/" className="admin-link">
            View Site
          </Link>
          <span className="avatar" title={who} aria-label={`Signed in as ${who}`}>
            {initials(who)}
          </span>
          <form action={signOut}>
            <button type="submit" className="admin-link">
              Sign Out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
