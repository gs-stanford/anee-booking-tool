import { Role } from "@prisma/client";
import { teaTimeSignupAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { parseLabDateTime } from "@/lib/lab-time";

type Session = { date: string; presenterName: string | null; signupEnabled: boolean; presenterId: string | null; presenter: { name: string } | null };
export function TeaTimeSlot({ session, user, week, now }: { session: Session; user: { id: string; role: Role }; week: number; now: Date }) {
  const name = session.presenter?.name ?? session.presenterName;
  const canChange = session.signupEnabled && parseLabDateTime(session.date, "13:00") > now && (!session.presenterId || session.presenterId === user.id || user.role === Role.ADMIN);
  return <details className="safety-slot tea-time-slot" name="safety-slot">
    <summary className="safety-slot-summary"><span className="event-kind">Tea Time · 1–2 pm</span><strong>{name ?? "Open · Quals practice"}</strong></summary>
    <div className="safety-slot-options">
      <small>{session.signupEnabled ? "Quals practice presentation" : "Scheduled presentation"}</small>
      {canChange && <form action={teaTimeSignupAction}>
        <input type="hidden" name="date" value={session.date} />
        <input type="hidden" name="week" value={week} />
        <input type="hidden" name="operation" value={session.presenterId ? "release" : "claim"} />
        <SubmitButton label={session.presenterId ? "Cancel my signup" : "Sign up to present"} />
      </form>}
    </div>
  </details>;
}
