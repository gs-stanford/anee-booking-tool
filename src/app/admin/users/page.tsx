import { Role } from "@prisma/client";

import { createUserAction } from "@/app/actions";
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
  await requireAdmin();
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
        <p className="muted">Admins create accounts for lab members. Public self-signup is intentionally disabled.</p>
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
              <h4>{user.name}</h4>
              <div className="meta">
                <span>{user.email}</span>
                <span>{user.role}</span>
                <span>Created {user.createdAt.toLocaleDateString("en-US")}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
