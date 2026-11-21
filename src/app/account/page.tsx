import { db } from "@/lib/db";
import { outlookConfigured } from "@/lib/outlook";
import { changePasswordAction, disconnectOutlookAction, syncMyOutlookAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { getNotice } from "@/lib/utils";
import { Role } from "@prisma/client";
import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AccountPage({
  searchParams
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const user = await requireUser();
  const notice = getNotice(await searchParams);

  if (user.role === Role.TEMP) {
    return (
      <section className="panel">
        <div className="section-head">
          <div>
            <h1>Account settings unavailable</h1>
            <p className="muted">
              Temporary account credentials are managed by the lab admin. This account is limited to safety resources
              and approved calendar booking.
            </p>
          </div>
        </div>

        {notice ? <Notice message={notice.message} type={notice.type} /> : null}

        <div className="inline-actions">
          <Link className="button button-primary" href="/instruments">
            Open calendar
          </Link>
          <Link className="button button-secondary" href="/safety">
            Open safety tools
          </Link>
        </div>
      </section>
    );
  }

  const connection=await db.outlookConnection.findUnique({where:{userId:user.id},select:{email:true,refreshToken:true,lastError:true,lastSyncedAt:true}});
  const connected=Boolean(connection?.refreshToken);
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
      <section className="panel" style={{gridColumn:"1 / -1"}}>
        <h2>Outlook calendar</h2>
        <p>Your bookings, safety shifts, Tea Time presentations, and events you’re invited to sync to a separate Boies Lab calendar. Changes flow from this site to Outlook; edit lab reservations here.</p>
        {!outlookConfigured() ? <p className="muted">Direct Outlook connection is awaiting administrator setup.</p> : <>
          {connected ? <>
            <p>Connected: {connection?.email}</p>
            {connection?.lastSyncedAt && <p className="muted">Last synced: {connection.lastSyncedAt.toLocaleString("en-US",{timeZone:"America/Los_Angeles"})} Pacific</p>}
            {connection?.lastError && <p role="alert">{connection.lastError}</p>}
            <div className="inline-actions"><form action={syncMyOutlookAction}><button className="button button-secondary">Sync now</button></form><Link className="button button-ghost" href="/api/outlook/connect" prefetch={false}>Reconnect</Link><form action={disconnectOutlookAction}><button className="button button-ghost">Disconnect</button></form></div>
            <small>Disconnecting stops updates and keeps existing entries in Outlook.</small>
          </> : <Link className="button button-primary" href="/api/outlook/connect" prefetch={false}>Connect Outlook</Link>}
        </>}
      </section>
    </div>
  );
}
