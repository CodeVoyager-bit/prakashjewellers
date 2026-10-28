import Link from "next/link";
import { signOut } from "@/app/admin/actions";

const LINKS = [
  ["/admin", "Dashboard"],
  ["/admin/rates", "Rates"],
  ["/admin/products", "Products"],
  ["/admin/enquiries", "Enquiries"],
  ["/admin/settings", "Settings"],
  ["/admin/guide", "Staff Guide"],
] as const;

export function AdminBar({ name, current }: { name: string; current?: string }) {
  return (
    <header className="admin-bar no-print">
      <div className="wrap admin-bar-row">
        <Link href="/admin" className="brand">
          <span translate="no">{name}</span>
          <span className="staff-tag">Staff</span>
        </Link>
        <div className="admin-bar-end">
          <Link href="/" className="admin-link">
            View Site
          </Link>
          <form action={signOut}>
            <button type="submit" className="linkish">
              Sign Out
            </button>
          </form>
        </div>
      </div>
      <nav className="wrap admin-nav" aria-label="Staff">
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} aria-current={current === href ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
