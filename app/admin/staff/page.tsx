import type { ObjectId } from "mongodb";
import { AdminBar, initials } from "@/components/admin-bar";
import { AddStaffForm, StaffActions } from "@/components/admin";
import { isOwner, requireStaff } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { db } from "@/lib/db";
import { formatDayTime } from "@/lib/price";

export const metadata = { title: "Staff", robots: { index: false } };

type UserDoc = { _id: ObjectId; name: string; email: string; role?: string; lastSignInAt?: Date };

// Logins are keyed by 91XXXXXXXXXX@staff.invalid; show the number, or the raw key for older logins.
const phoneOf = (email: string) => email.replace(/^91(\d{5})(\d{5})@staff\.invalid$/, "+91 $1 $2");

export default async function StaffPage() {
  const session = await requireStaff();
  const canManage = isOwner(session.user);
  const [s, users] = await Promise.all([getSettings(), db.collection<UserDoc>("user").find().sort({ createdAt: 1 }).toArray()]);

  return (
    <>
      <AdminBar name={s.name} current="/admin/staff" />
      <main className="wrap admin narrow">
        <h1>Staff</h1>
        <p className="muted">
          Everyone here signs in at Staff Login with their mobile number and password.{" "}
          {canManage ? "As an owner, you can add people, reset passwords and remove logins." : "Ask an owner to add someone or reset a password."}
        </p>

        <section className="panel" aria-labelledby="logins">
          <h2 id="logins">Logins</h2>
          <ul className="staff-list">
            {users.map((u) => {
              const id = String(u._id);
              const me = id === session.user.id;
              return (
                <li key={id}>
                  <span className="avatar" aria-hidden="true">
                    {initials(u.name || "Staff")}
                  </span>
                  <div className="staff-info">
                    <p className="staff-name">
                      {u.name || "Staff"} {me && <span className="badge-muted">You</span>}
                    </p>
                    <p className="help">
                      {phoneOf(u.email)} · {isOwner(u) ? "Owner" : "Staff"} · {u.lastSignInAt ? `Last signed in ${formatDayTime(u.lastSignInAt)}` : "No sign-in recorded yet"}
                    </p>
                  </div>
                  {canManage && <StaffActions id={id} name={u.name || "Staff"} me={me} />}
                </li>
              );
            })}
          </ul>
        </section>

        {canManage && (
          <section className="panel form-grid" aria-labelledby="add-staff">
            <h2 id="add-staff">Add a Staff Login</h2>
            <AddStaffForm />
          </section>
        )}
      </main>
    </>
  );
}
