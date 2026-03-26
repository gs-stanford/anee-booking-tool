import { changePasswordAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { getNotice } from "@/lib/utils";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AccountPage({
  searchParams
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const user = await requireUser();
  const notice = getNotice(await searchParams);

  return (
    <div className="two-column">
      <section className="panel">
        <h1>Account</h1>
        <p className="muted">Review your lab account details and update your password when you move off a temporary one.</p>
        {notice ? <Notice message={notice.message} type={notice.type} /> : null}

        <div className="sheet-row">
          <h4>{user.name}</h4>
          <div className="meta">
            <span>{user.email}</span>
            <span>{user.role}</span>
            <span>Member since {user.createdAt.toLocaleDateString("en-US")}</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>Change password</h2>
        <p className="muted">Enter your current password once, then choose a new password with at least 8 characters.</p>

        <form action={changePasswordAction} className="form-grid">
          <input type="hidden" name="returnTo" value="/account" />

          <div className="field">
            <label htmlFor="currentPassword">Current password</label>
            <input id="currentPassword" name="currentPassword" type="password" required />
          </div>

          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <input id="newPassword" name="newPassword" type="password" minLength={8} required />
          </div>

          <div className="field">
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" minLength={8} required />
          </div>

          <button className="button button-primary" type="submit">
            Save new password
          </button>
        </form>
      </section>
    </div>
  );
}
