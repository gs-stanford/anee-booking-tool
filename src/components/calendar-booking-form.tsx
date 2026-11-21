"use client";
import { useId, useState } from "react";
import { saveCalendarBookingAction } from "@/app/actions";
import { CalendarDialog } from "@/components/calendar-dialog";
import { SubmitButton } from "@/components/submit-button";
export type EventEdit = { id: string; version: number; title: string; location: string; impact: string; startDate: string; endDate: string; startTime: string; endTime: string };
export function CalendarBookingForm({ date, week, instruments, timeZone, event }: { date: string; week: number; instruments: { id: string; name: string }[]; timeZone: string; event?: EventEdit }) {
  const [kind, setKind] = useState(event || !instruments.length ? "event" : "instrument");
  const id = useId();
  return <CalendarDialog title={event ? "Edit cross-impact event" : "New reservation"} label={event ? "Edit event" : "+ New reservation"}>
    <form action={saveCalendarBookingAction} className="form-grid">
      <input type="hidden" name="week" value={week} />
      {event && <><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="version" value={event.version} /></>}
      <p className="muted">All times are in {timeZone}.</p>
      <div className="field"><label htmlFor={`${id}-kind`}>Booking type</label><select id={`${id}-kind`} name="kind" value={kind} onChange={e => setKind(e.target.value)}>
        {!event && instruments.length > 0 && <option value="instrument">Shared instrument reservation</option>}<option value="event">Cross-impact lab event</option>
      </select></div>
      {kind === "instrument" ? <div className="field"><label htmlFor={`${id}-instrument`}>Instrument</label><select id={`${id}-instrument`} name="instrumentId" required><option value="">Choose an instrument</option>{instruments.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div> : <>
        <div className="field"><label htmlFor={`${id}-title`}>Event title</label><input id={`${id}-title`} name="title" required maxLength={120} defaultValue={event?.title} /></div>
        <div className="field"><label htmlFor={`${id}-location`}>Location / affected area</label><input id={`${id}-location`} name="location" required maxLength={160} defaultValue={event?.location} /></div>
        <div className="field"><label htmlFor={`${id}-impact`}>Impact on other lab users</label><textarea id={`${id}-impact`} name="impact" required maxLength={2000} defaultValue={event?.impact} placeholder="For example: keep this area clear during the experiment." /></div>
        <small>For exclusive equipment time, choose a shared instrument reservation.</small>
      </>}
      <div className="form-grid two-up">
        <div className="field"><label htmlFor={`${id}-start-date`}>Start date</label><input id={`${id}-start-date`} type="date" name="startDate" defaultValue={event?.startDate ?? date} required /></div>
        <div className="field"><label htmlFor={`${id}-start-time`}>Start time</label><input id={`${id}-start-time`} type="time" name="startTime" defaultValue={event?.startTime ?? "13:00"} required /></div>
        <div className="field"><label htmlFor={`${id}-end-date`}>End date</label><input id={`${id}-end-date`} type="date" name="endDate" defaultValue={event?.endDate ?? date} required /></div>
        <div className="field"><label htmlFor={`${id}-end-time`}>End time</label><input id={`${id}-end-time`} type="time" name="endTime" defaultValue={event?.endTime ?? "14:00"} required /></div>
      </div>
      {kind === "instrument" && <div className="field"><label htmlFor={`${id}-notes`}>Notes (optional)</label><textarea id={`${id}-notes`} name="notes" maxLength={2000} placeholder="Setup, experiment details, or anything other lab users should know." /></div>}
      <SubmitButton label={event ? "Save event changes" : "Save booking"} />
    </form>
  </CalendarDialog>;
}
