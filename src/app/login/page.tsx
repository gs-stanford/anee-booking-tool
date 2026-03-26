import { loginAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { getCurrentUser } from "@/lib/auth";
import { getNotice } from "@/lib/utils";
import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function LoginPage({
  searchParams
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/instruments");
  }

  const notice = getNotice(await searchParams);

  return (
    <section className="auth-card">
      <h1>Log in</h1>
      <p className="muted">Use your lab account to reserve instruments and view internal resources.</p>
      {notice ? <Notice type={notice.type} message={notice.message} /> : null}

      <form action={loginAction} className="form-grid">
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" placeholder="name@lab.local" required />
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required />
        </div>

        <button className="button button-primary" type="submit">
          Continue
        </button>
      </form>
    </section>
  );
}
