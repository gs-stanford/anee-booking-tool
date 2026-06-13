import { Role } from "@prisma/client";

import { createUserAction, deleteUserAction, updateUserCalendarHoldAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getNotice } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const admin = await requireAdmin();
  const [users, notice] = await Promise.all([
    db.user.findMany({
      orderBy: {
        createdAt: "desc"
      }
    }),
    Promise.resolve(getNotice(await searchParams))
  ]);

  return (
    <div className="two-column">
      <section className="panel">
        <h1>User accounts</h1>
        <p className="muted">
          Admins create accounts for lab members and temporary external users. Temporary accounts start with calendar
          access on hold until SDS review and glovebox walkthrough are complete.
        </p>
        {notice ? <Notice type={notice.type} message={notice.message} /> : null}

        <form action={createUserAction} className="form-grid">
          <div className="field">
            <label htmlFor="name">Full name</label>
            <input id="name" name="name" required />
          </div>

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required />
          </div>

          <div className="form-grid two-up">
            <div className="field">
              <label htmlFor="password">Temporary password</label>
              <input id="password" name="password" type="password" required />
            </div>

            <div className="field">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" defaultValue={Role.MEMBER}>
                <option value={Role.MEMBER}>Member</option>
                <option value={Role.TEMP}>Temp</option>
                <option value={Role.ADMIN}>Admin</option>
              </select>
            </div>
          </div>

          <button className="button button-primary" type="submit">
            Create account
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Existing users</h2>
        <div className="list">
          {users.map((user) => (
            <div className="sheet-row" key={user.id}>
              <div className="section-head">
                <div>
                  <h4>{user.name}</h4>
                  <div className="meta">
                    <span>{user.email}</span>
                    <span>{user.role}</span>
                    {user.role === Role.TEMP ? (
                      <span>{user.calendarAccessOnHold ? "Calendar hold" : "Calendar enabled"}</span>
                    ) : null}
                    <span>Created {user.createdAt.toLocaleDateString("en-US")}</span>
                  </div>
                </div>
                {user.id !== admin.id ? (
                  <div className="inline-actions">
                    {user.role === Role.TEMP ? (
                      <form action={updateUserCalendarHoldAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input
                          type="hidden"
                          name="calendarAccessOnHold"
                          value={user.calendarAccessOnHold ? "false" : "true"}
                        />
                        <button className="button button-secondary button-small" type="submit">
                          {user.calendarAccessOnHold ? "Enable calendar" : "Place calendar hold"}
                        </button>
                      </form>
                    ) : null}
                    <form action={deleteUserAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <button className="button button-ghost button-small" type="submit">
                        Delete user
                      </button>
                    </form>
                  </div>
                ) : (
                  <span className="tag">Current admin</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
