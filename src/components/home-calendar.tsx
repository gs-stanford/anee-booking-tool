import { isUpcomingSafetySlot, minimumHomeWeek, SAFETY_SCHEDULE_START } from "@/lib/home-schedule";
import { QUARTERS, quarterForDate } from "@/lib/academic-quarters";
import Link from "next/link";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { safetySignupAction } from "@/app/actions";
import { isSharedImpact } from "@/lib/home-calendar";
import { formatDateKeyLong, formatDateKeyShortDay, getLabDateKey, getLabTimeKey, getLabTimeZone, getStartOfLabWeekDateKey, parseLabDateTime, shiftDateString } from "@/lib/lab-time";
import { serializeInstrumentUnavailabilityCalendarItems } from "@/lib/reservation-calendar";
import { SubmitButton } from "@/components/submit-button";

type CalendarUser = { id: string; role: Role };
export async function HomeCalendar({ user, week }: { user: CalendarUser; week: number }) {
  const now = new Date();
  const minimumWeek = minimumHomeWeek(now);
  const today = getLabDateKey(now);
  const startDate = shiftDateString(getStartOfLabWeekDateKey(now), week * 7);
  const endDate = shiftDateString(startDate, 7);
  const [signups, instruments, bookings] = await Promise.all([
    db.safetySignup.findMany({ where: { date: { gte: startDate, lt: endDate } }, include: { user: { select: { name: true } } } }),
    db.instrument.findMany({ orderBy: { name: "asc" } }),
    db.reservation.findMany({ where: { startAt: { lt: parseLabDateTime(endDate, "00:00") }, endAt: { gt: parseLabDateTime(startDate, "00:00") } }, include: { instrument: true, user: { select: { name: true } } }, orderBy: { startAt: "asc" } })
  ]);
  const sharedBookings = bookings.filter(booking => isSharedImpact(booking.instrument) && booking.endAt > now);
  const outages = serializeInstrumentUnavailabilityCalendarItems(instruments.filter(isSharedImpact), startDate, endDate);
  return <section className="panel home-calendar" id="lab-calendar">
    <div className="section-head">
      <div><span className="eyebrow">Lab coordination</span><h2>Safety & shared instrument calendar</h2><p className="muted">Safety signups begin Winter 2027 (January 4). Click a slot to sign up or manage it. All times: {getLabTimeZone()}.</p></div>
      <Link className="button button-secondary" href="/instruments#reservation-calendar">Master instrument calendar ↗</Link>
    </div>
    <details><summary>Quarter dates & signup details</summary>    <p className="muted">Weekly signups repeat from the selected date through the quarter’s last exam day, including holidays. Cancel one date or all remaining dates at any time before the slot starts. During quarter breaks, sign up for individual dates.</p>
<div className="inline-actions">
      {QUARTERS.filter(q => q.start >= SAFETY_SCHEDULE_START && q.end >= today).map(q => {
        const offset = Math.floor((Date.parse(`${q.start}T12:00:00Z`) - Date.parse(`${getStartOfLabWeekDateKey(now)}T12:00:00Z`)) / 604800000);
        return <Link key={q.name} className="button button-ghost button-small" href={`/?week=${Math.max(minimumWeek, offset)}#lab-calendar`}>{q.name}</Link>;
      })}
    </div><p className="muted">Dates follow <a href="https://studentservices.stanford.edu/calendar-events/academic-calendars/future-academic-calendars">Stanford’s academic calendars</a>. Autumn 2027 onward uses the published future calendar and is subject to change.</p></details>
    <div className="calendar-toolbar"><h3>{formatDateKeyLong(startDate)} – {formatDateKeyLong(shiftDateString(startDate, 6))}</h3><nav aria-label="Calendar weeks" className="inline-actions">
      {week > minimumWeek && <Link className="button button-ghost button-small" href={`/?week=${week - 1}#lab-calendar`}>← Previous</Link>}
      <Link className="button button-secondary button-small" href="/#lab-calendar">{minimumWeek > 0 ? "Winter 2027 start" : "This week"}</Link>
      {week < 156 && <Link className="button button-ghost button-small" href={`/?week=${week + 1}#lab-calendar`}>Next →</Link>}
    </nav></div>
    <div className="lab-week-grid">
      {Array.from({ length: 7 }, (_, index) => {
        const date = shiftDateString(startDate, index);
        const dayStart = parseLabDateTime(date, "00:00");
        const dayEnd = parseLabDateTime(shiftDateString(date, 1), "00:00");
        const events = sharedBookings.filter(booking => booking.startAt < dayEnd && booking.endAt > dayStart);
        const dayOutages = outages.filter(item => item.date === date && date >= today);
        return <article className={`lab-day${date === getLabDateKey(now) ? " is-today" : ""}`} key={date}>
          <header><span>{formatDateKeyShortDay(date)}</span><strong>{Number(date.slice(-2))}</strong>{date === getLabDateKey(now) && <small>Today</small>}</header>
          {index < 5 ? ["09:00", "18:00"].filter(time => isUpcomingSafetySlot(date, time, now)).map(time => {
            const signup = signups.find(item => item.date === date && item.time === time);
            const quarter = quarterForDate(date);
            const future = parseLabDateTime(date, time) > now;
            const canRelease = signup && (signup.userId === user.id || user.role === Role.ADMIN);
            return <details className={`safety-slot${signup ? " is-claimed" : ""}`} name="safety-slot" key={`${date}-${time}`}>
              <summary className="safety-slot-summary">
              <span className="event-kind">Safety · {time === "09:00" ? "9 am" : "6 pm"}</span>
              <strong>{signup?.user.name ?? (future ? "Open slot" : "Unfilled")}</strong>
              </summary>
              <div className="safety-slot-options">
              {quarter && <small>{quarter.name} · through {formatDateKeyLong(quarter.end)}</small>}
              {signup?.seriesId && <small>Weekly signup</small>}
              {future && (!signup || canRelease) && <>
                {(signup ? ["release", ...(signup.seriesId ? ["release-series"] : [])] : [...(quarter ? ["claim"] : []), "claim-once"]).map(operation => <form action={safetySignupAction} key={operation}>
                  <input type="hidden" name="date" value={date} /><input type="hidden" name="time" value={time} /><input type="hidden" name="week" value={week} /><input type="hidden" name="operation" value={operation} />
                  <SubmitButton label={operation === "release" ? "Cancel this date" : operation === "release-series" ? "Cancel remaining quarter" : operation === "claim" ? "Reserve weekly" : "This date only"} />
                </form>)}
              </>}
              {!future && <small>This slot has passed.</small>}
              {future && signup && !canRelease && <small>Reserved by {signup.user.name}. Only the assignee or an admin can cancel.</small>}
              </div>
            </details>;
          }) : <p className="weekend-note">No safety signup slots</p>}
          {events.map(booking => <Link className="shared-event" href={`/instruments/${booking.instrumentId}?week=${week}&composeDate=${date}&reservationId=${booking.id}#booking-editor`} key={booking.id}>
            <span className="event-kind">{booking.startAt < dayStart ? "Continues" : getLabTimeKey(booking.startAt)} – {booking.endAt >= dayEnd ? "24:00" : getLabTimeKey(booking.endAt)}</span><strong>{booking.instrument.name}</strong><span>{booking.user.name}</span>
          </Link>)}
          {dayOutages.map(item => <Link className="shared-event outage-event" href={`/instruments/${item.instrumentId}`} key={item.id}><span className="event-kind">Unavailable</span><strong>{item.instrumentName}</strong></Link>)}
          {!events.length && !dayOutages.length && <p className="weekend-note">No shared instrument bookings</p>}
        </article>;
      })}
    </div>
    <p className="calendar-footnote">Shared instrument bookings appear below safety slots. Open a booking to view its instrument calendar.</p>
  </section>;
}
