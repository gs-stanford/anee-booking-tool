import { canManageTea, type PresenterAccount } from "@/lib/tea-time";
import { CalendarDialog } from "@/components/calendar-dialog";
import { Role } from "@prisma/client";
import { changeTeaPresenterAction, teaTimeSignupAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { parseLabDateTime } from "@/lib/lab-time";

type Session = { version: number; date: string; presenterName: string | null; signupEnabled: boolean; presenterId: string | null; presenter: { name: string } | null };
export function TeaTimeSlot({ session, user, week, now, members, sessions }: { session: Session; user: { id: string; role: Role }; week: number; now: Date; members: PresenterAccount[]; sessions: Session[] }) {
  const name = session.presenter?.name ?? session.presenterName;
  const canChange = session.signupEnabled && parseLabDateTime(session.date, "13:00") > now && (!name || session.presenterId === user.id || user.role === Role.ADMIN);
  return <div className="tea-time-details">
    <h3>{name ?? "Open · Quals practice"}</h3>
    <div className="safety-slot-options">
      <small>{session.signupEnabled ? "Quals practice presentation" : "Scheduled presentation"}</small>
      {parseLabDateTime(session.date, "13:00") > now && canManageTea(session, user, members) && <CalendarDialog title="Change Tea Time presenter" label="Change / swap presenter">
        <form action={changeTeaPresenterAction} className="form-grid">
          <input type="hidden" name="date" value={session.date} /><input type="hidden" name="version" value={session.version} /><input type="hidden" name="week" value={week} />
          <label>New presenter<select name="presenterId" required defaultValue=""><option value="">Choose a lab member</option>{members.map(member => <option value={member.id} key={member.id}>{member.name}</option>)}</select></label>
          <SubmitButton label="Assign presenter" />
        </form>
        <hr />
        <form action={changeTeaPresenterAction} className="form-grid">
          <input type="hidden" name="date" value={session.date} /><input type="hidden" name="version" value={session.version} /><input type="hidden" name="week" value={week} />
          <label>Swap with another presentation<select name="swap" required defaultValue=""><option value="">Choose another date</option>{sessions.filter(other => other.date !== session.date && (other.presenterId || other.presenterName) && parseLabDateTime(other.date, "13:00") > now).map(other => <option value={`${other.date}|${other.version}`} key={other.date}>{other.date} · {other.presenter?.name ?? other.presenterName}</option>)}</select></label>
          <small>This exchanges the presenters on both dates.</small><SubmitButton label="Swap presenters" />
        </form>
      </CalendarDialog>}
      {canChange && <form action={teaTimeSignupAction}>
        <input type="hidden" name="date" value={session.date} />
        <input type="hidden" name="week" value={week} />
        <input type="hidden" name="operation" value={session.presenterId ? "release" : "claim"} />
        <SubmitButton label={session.presenterId ? "Cancel my signup" : "Sign up to present"} />
      </form>}
    </div>
  </div>;
}
