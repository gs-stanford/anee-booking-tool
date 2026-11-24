import { academicCalendarForDate } from "@/lib/academic-calendar";
import { calendarInviteRecipients, calendarInvitationsEnabled } from "@/lib/calendar-invitations";
import { teamsConfigured } from "@/lib/outlook";
import { CalendarMoveForm } from "@/components/calendar-move-form";
import { ScheduleGrid, type ScheduleEvent } from "@/components/schedule-grid";
import { CalendarBookingForm } from "@/components/calendar-booking-form";
import { cancelLabEventAction } from "@/app/actions";
import { TeaTimeSlot } from "@/components/tea-time-slot";
import { teaTimeIsUpcoming } from "@/lib/tea-time";
import { isUpcomingSafetySlot, SAFETY_SCHEDULE_START } from "@/lib/home-schedule";
import { quarterForDate } from "@/lib/academic-quarters";
import Link from "next/link";
import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { safetySignupAction } from "@/app/actions";
import { isSharedImpact } from "@/lib/home-calendar";
import { formatDateKeyLong, formatDateKeyShortDay, getLabDateKey, getLabTimeKey, getLabTimeZone, getStartOfLabWeekDateKey, parseLabDateTime, shiftDateString } from "@/lib/lab-time";
import { serializeInstrumentUnavailabilityCalendarItems, isAllDayReservation } from "@/lib/reservation-calendar";
import { SubmitButton } from "@/components/submit-button";

type CalendarUser = { id: string; role: Role };
export async function HomeCalendar({ user, week, focusDate, initialView, focusNow }: { user: CalendarUser; week: number; focusDate?:string; initialView:"day"|"week"; focusNow:boolean }) {
  const now = new Date();
  const today = getLabDateKey(now);
  const startDate = shiftDateString(getStartOfLabWeekDateKey(now), week * 7);
  const endDate = shiftDateString(startDate, 7);
  const [signups, instruments, bookings, teaTimeSessions, members, labEvents, connection, inviteRecipients] = await Promise.all([
    db.safetySignup.findMany({ where: { date: { gte: startDate, lt: endDate } }, include: { user: { select: { name: true } } } }),
    db.instrument.findMany({ orderBy: { name: "asc" } }),
    db.reservation.findMany({ where: { startAt: { lt: parseLabDateTime(endDate, "00:00") }, endAt: { gt: parseLabDateTime(startDate, "00:00") } }, include: { instrument: true, user: { select: { name: true } } }, orderBy: { startAt: "asc" } }),
    db.teaTimeSession.findMany({ where: { date: { gte: today } }, orderBy: { date: "asc" }, include: { presenter: { select: { name: true } } } }),
    db.user.findMany({ where: { role: { not: Role.TEMP } }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.labEvent.findMany({ where: { startAt: { lt: parseLabDateTime(endDate, "00:00") }, endAt: { gt: now > parseLabDateTime(startDate, "00:00") ? now : parseLabDateTime(startDate, "00:00") } }, include: { teamsMeeting:true, invitees:true, owner: { select: { name: true, outlookConnection:{select:{refreshToken:true}} } } }, orderBy: { startAt: "asc" } }),
    db.outlookConnection.findUnique({where:{userId:user.id},select:{refreshToken:true}}),
    calendarInviteRecipients(db)
  ]);
  const teamsAvailable = teamsConfigured() && Boolean(connection?.refreshToken);
  const sharedInstrumentOptions = instruments.filter(isSharedImpact).map(({ id, name }) => ({ id, name }));
  const sharedBookings = bookings.filter(booking => isSharedImpact(booking.instrument) && booking.endAt > now);
  const outages = serializeInstrumentUnavailabilityCalendarItems(instruments.filter(isSharedImpact), startDate, endDate);
  const minimumDate = today > SAFETY_SCHEDULE_START ? today : SAFETY_SCHEDULE_START;
  const days = Array.from({ length: 7 }, (_, index) => { const date = shiftDateString(startDate, index); return { date, label: formatDateKeyShortDay(date) }; });
  const events: ScheduleEvent[] = [];
  const minute = (value: Date) => { const [hour, min] = getLabTimeKey(value).split(":").map(Number); return hour * 60 + min; };
  for (const [index, { date }] of days.entries()) {
    for (const entry of academicCalendarForDate(date)) events.push({
      id:`academic-${entry.start}-${entry.title}`, date, start:0, end:1440, allDay:true,
      title:`${entry.title}${entry.projected ? " (projected)" : ""}`, person:"", kind:"academic",
      content:<div key={`academic-${entry.start}-${entry.title}-${date}`} className="form-grid"><p>{entry.note}</p><p>{formatDateKeyLong(entry.start)}{entry.end!==entry.start ? ` – ${formatDateKeyLong(entry.end)}` : ""}</p><p>Reservations and safety signups remain available.</p><a href={entry.source} target="_blank" rel="noopener noreferrer">Stanford calendar source ↗</a></div>
    });
    const dayStart = parseLabDateTime(date, "00:00");
    const dayEnd = parseLabDateTime(shiftDateString(date, 1), "00:00");
    if (index > 0 && index < 6) for (const time of ["09:00", "18:00"]) {
      if (!isUpcomingSafetySlot(date, time, now)) continue;
      const signup = signups.find(item => item.date === date && item.time === time);
      const quarter = quarterForDate(date);
      const canRelease = signup && (signup.userId === user.id || user.role === Role.ADMIN);
      events.push({ id: `safety-${date}-${time}`, date, start: time === "09:00" ? 540 : 1080, end: time === "09:00" ? 570 : 1110, title: "Safety check", person: signup?.user.name ?? "Open slot", kind: signup ? "safety-taken" : "safety", content: <div key={`safety-${date}-${time}`} className="form-grid">
        <h3>{signup?.user.name ?? "Open slot"}</h3>
        <p>{quarter ? `${quarter.name} · weekly signups repeat from this date through ${formatDateKeyLong(quarter.end)}, including holidays.` : "Quarter break · reserve this date only."}</p>
        {(!signup || canRelease) && (signup ? ["release", ...(signup.seriesId ? ["release-series"] : [])] : [...(quarter ? ["claim"] : []), "claim-once"]).map(operation => <form action={safetySignupAction} key={operation}>
          <input type="hidden" name="date" value={date} /><input type="hidden" name="time" value={time} /><input type="hidden" name="week" value={week} /><input type="hidden" name="operation" value={operation} />
          <SubmitButton label={operation === "release" ? "Cancel this date" : operation === "release-series" ? "Cancel remaining quarter" : operation === "claim" ? "Reserve weekly" : "This date only"} />
        </form>)}
        {signup && !canRelease && <p className="muted">Only the assignee or an admin can cancel.</p>}
      </div> });
    }
    const tea = teaTimeSessions.find(session => session.date === date && teaTimeIsUpcoming(date, now));
    if (tea) events.push({ id: `tea-${date}`, date, start: 780, end: 840, title: "Tea Time", person: tea.presenter?.name ?? tea.presenterName ?? "Open · Quals practice", kind: "tea", content: <TeaTimeSlot key={`tea-${date}`} session={tea} user={user} week={week} now={now} members={members} sessions={teaTimeSessions} /> });
    for (const booking of sharedBookings.filter(item => item.startAt < dayEnd && item.endAt > dayStart)) events.push({ id: booking.id, date, start: booking.startAt < dayStart ? 0 : minute(booking.startAt), end: booking.endAt >= dayEnd ? 1440 : minute(booking.endAt), move: booking.userId === user.id || user.role === Role.ADMIN ? {id:booking.id,kind:"instrument",originalStart:booking.startAt.toISOString(),originalEnd:booking.endAt.toISOString()} : undefined, allDay: isAllDayReservation(booking), title: booking.instrument.name, person: booking.user.name, kind: "instrument", content: <div key={`${booking.id}-${date}`} className="form-grid"><h3>{booking.user.name}</h3><p>{formatDateKeyLong(getLabDateKey(booking.startAt))} {getLabTimeKey(booking.startAt)} – {formatDateKeyLong(getLabDateKey(booking.endAt))} {getLabTimeKey(booking.endAt)}</p><p>{booking.instrument.location}</p>{(booking.userId===user.id || user.role===Role.ADMIN) && <CalendarMoveForm id={booking.id} kind="instrument" startAt={booking.startAt} endAt={booking.endAt} week={week} allDay={isAllDayReservation(booking)}/>}{booking.purpose && <p className="event-notes">{booking.purpose}</p>}<Link className="button button-secondary" href={`/instruments/${booking.instrumentId}?week=${week}&composeDate=${date}&reservationId=${booking.id}#booking-editor`}>Open instrument reservation</Link></div> });
    for (const event of labEvents.filter(item => item.startAt < dayEnd && item.endAt > dayStart)) events.push({ id: event.id, date, start: event.startAt < dayStart ? 0 : minute(event.startAt), end: event.endAt >= dayEnd ? 1440 : minute(event.endAt), move: event.ownerId === user.id || user.role === Role.ADMIN ? {id:event.id,kind:"impact",originalStart:event.startAt.toISOString(),originalEnd:event.endAt.toISOString()} : undefined, allDay: getLabTimeKey(event.startAt) === "00:00" && getLabTimeKey(event.endAt) === "00:00", title: event.title, person: event.owner.name, kind: event.eventType === "meeting" ? "meeting" : "impact", content: <div key={`${event.id}-${date}`} className="form-grid"><h3>{event.owner.name}</h3><p>{formatDateKeyLong(getLabDateKey(event.startAt))} {getLabTimeKey(event.startAt)} – {formatDateKeyLong(getLabDateKey(event.endAt))} {getLabTimeKey(event.endAt)}</p><p>{event.location}</p>{event.impact && <p className="event-notes">{event.impact}</p>}{event.notes && <p className="event-notes">{event.notes}</p>}{event.teamsEnabled && (event.teamsMeeting ? <a className="button button-secondary" href={event.teamsMeeting.joinUrl} target="_blank" rel="noopener noreferrer">Join Teams meeting</a> : <p className="muted">Teams link pending. The organizer can check Outlook sync in Account.</p>)}{(event.ownerId === user.id || user.role === Role.ADMIN) && <>
      <CalendarMoveForm id={event.id} kind="impact" startAt={event.startAt} endAt={event.endAt} week={week} allDay={isAllDayReservation(event)}/><CalendarBookingForm date={date} week={week} instruments={sharedInstrumentOptions} timeZone={getLabTimeZone()} teamsAvailable={teamsConfigured() && Boolean(event.owner.outlookConnection?.refreshToken)} members={inviteRecipients.filter(member=>member.id!==event.ownerId)} invitationsEnabled={calendarInvitationsEnabled()} organizer={{id:event.ownerId,name:event.owner.name}} event={{ eventType:event.eventType, notes:event.notes, teamsEnabled:event.teamsEnabled, inviteeIds:event.invitees.map(invite=>invite.userId), id: event.id, version: event.version, title: event.title, location: event.location, impact: event.impact, startDate: getLabDateKey(event.startAt), endDate: getLabDateKey(event.endAt), startTime: getLabTimeKey(event.startAt), endTime: getLabTimeKey(event.endAt) }} />
      <form action={cancelLabEventAction}><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="version" value={event.version} /><input type="hidden" name="week" value={week} /><SubmitButton label="Cancel event" /></form>
    </>}</div> });
    for (const item of outages.filter(item => item.date === date && date >= today)) events.push({ id: item.id, date, start: 0, end: 1440, title: `${item.instrumentName} unavailable`, person: "", kind: "outage", allDay: true, content: <Link key={item.id} href={`/instruments/${item.instrumentId}`}>View instrument availability</Link> });
  }
  return <section className="home-schedule" id="lab-calendar">
    <div className="schedule-toolbar">
      <div className="schedule-title"><h1>Calendar</h1></div>
      <CalendarBookingForm date={startDate < minimumDate ? minimumDate : startDate} week={week} instruments={sharedInstrumentOptions} timeZone={getLabTimeZone()} teamsAvailable={teamsAvailable} members={inviteRecipients.filter(member=>member.id!==user.id)} invitationsEnabled={calendarInvitationsEnabled()} organizer={members.find(member=>member.id===user.id)} />
    </div>
    <ScheduleGrid key={`${startDate}-${focusDate}-${initialView}-${focusNow}`} focusDate={focusDate} initialView={initialView} focusNow={focusNow} initialNow={now.toISOString()} days={days} events={events} today={today} minimumDate={minimumDate} booking={{ teamsAvailable, invitationsEnabled:calendarInvitationsEnabled(), organizer:members.find(member=>member.id===user.id), members:inviteRecipients.filter(member=>member.id!==user.id), week, instruments: sharedInstrumentOptions, timeZone: getLabTimeZone() }} />
  </section>;
}
