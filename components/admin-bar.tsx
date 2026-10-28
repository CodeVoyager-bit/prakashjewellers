import Link from "next/link";
import { signOut } from "@/app/admin/actions";

export function AdminBar({ name }: { name: string }) {
  return (
    <header className="admin-bar no-print">
      <div className="wrap head-row">
        <Link href="/admin" className="brand">
          <span translate="no">{name}</span>
          <span className="staff-tag">Staff</span>
        </Link>
        <nav aria-label="Staff">
          <Link href="/">View Site</Link>
          <Link href="/admin/qr">Counter QR</Link>
          <form action={signOut}>
            <button type="submit" className="linkish">
              Sign Out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
