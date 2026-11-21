"use client";
import { useId, useState } from "react";
import { saveCalendarBookingAction } from "@/app/actions";
import { CalendarDialog } from "@/components/calendar-dialog";
import { shiftDateString } from "@/lib/lab-time";
import { SubmitButton } from "@/components/submit-button";
export type EventEdit = { inviteeIds?: string[]; id: string; version: number; title: string; location: string; impact: string; startDate: string; endDate: string; startTime: string; endTime: string };
export type BookingDraft = { date: string; time?: string; endDate?: string; endTime?: string; allDay?: boolean };
export type CalendarBookingOptions = { week: number; instruments: { id: string; name: string }[]; timeZone: string; members?: {id:string;name:string}[] };
export function CalendarBookingForm({ date, week, instruments, timeZone, members = [], event, draft, onClose }: CalendarBookingOptions & { date: string; event?: EventEdit; draft?: BookingDraft; onClose?: () => void }) {
  const [kind, setKind] = useState(event || !instruments.length ? "event" : "instrument");
  const id = useId();
  const isAllDay = Boolean(event && event.startTime === "00:00" && event.endTime === "00:00" && event.endDate > event.startDate);
  const initialTime = event?.startTime ?? draft?.time ?? "08:00";
  const [startDate, setStartDate] = useState(event?.startDate ?? date);
  const [startTime, setStartTime] = useState(initialTime);
  const [allDay, setAllDay] = useState(isAllDay || Boolean(draft?.allDay));
  const initialMinutes = Number(initialTime.slice(0, 2)) * 60 + Number(initialTime.slice(3)) + 60;
  const [endDate, setEndDate] = useState(event ? (isAllDay ? shiftDateString(event.endDate, -1) : event.endDate) : draft?.endDate ?? shiftDateString(date, initialMinutes >= 1440 && !draft?.allDay ? 1 : 0));
  const [endTime, setEndTime] = useState(event?.endTime ?? draft?.endTime ?? `${String(Math.floor(initialMinutes / 60) % 24).padStart(2, "0")}:${String(initialMinutes % 60).padStart(2, "0")}`);
  function updateStartDate(value: string) {
    if (value && startDate) {
      const offset = Math.round((Date.parse(`${endDate}T12:00Z`) - Date.parse(`${startDate}T12:00Z`)) / 86400000);
      setEndDate(shiftDateString(value, Math.max(0, offset || 0)));
    }
    setStartDate(value);
  }
  function updateEndTime(value: string) {
    setEndTime(value);
    if (value && value <= startTime && endDate === startDate) setEndDate(shiftDateString(startDate, 1));
  }
  return <CalendarDialog title={event ? "Edit cross-impact event" : "New reservation"} label={draft ? null : event ? "Edit event" : "+ New reservation"} autoOpen={Boolean(draft)} onClose={onClose}>
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
      <label className="calendar-all-day-toggle"><input type="checkbox" name="allDay" checked={allDay} onChange={e => setAllDay(e.target.checked)} />All day</label>
      <div className="form-grid two-up">
        <div className="field"><label htmlFor={`${id}-start-date`}>Start date</label><input id={`${id}-start-date`} type="date" name="startDate" value={startDate} onChange={e => updateStartDate(e.target.value)} required /></div>
        {!allDay && <div className="field"><label htmlFor={`${id}-start-time`}>Start time</label><input id={`${id}-start-time`} type="time" name="startTime" value={startTime} onChange={e => { setStartTime(e.target.value); if (e.target.value >= endTime && endDate === startDate) setEndDate(shiftDateString(startDate, 1)); }} required /></div>}
        <div className="field"><label htmlFor={`${id}-end-date`}>End date</label><input id={`${id}-end-date`} type="date" name="endDate" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required /></div>
        {!allDay && <div className="field"><label htmlFor={`${id}-end-time`}>End time</label><input id={`${id}-end-time`} type="time" name="endTime" value={endTime} onChange={e => updateEndTime(e.target.value)} required /></div>}
      </div>
      {allDay ? <small>Includes every selected date, from midnight through midnight after the end date.</small> : endDate > startDate && <small>Overnight / multi-day booking · ends {endDate} at {endTime}.</small>}
      {kind === "instrument" && <div className="field"><label htmlFor={`${id}-notes`}>Notes (optional)</label><textarea id={`${id}-notes`} name="notes" maxLength={2000} placeholder="Setup, experiment details, or anything other lab users should know." /></div>}
      {members.length > 0 && <details className="calendar-invitees"><summary>Invite lab members</summary><p className="muted">Selected members can include this event in their connected Outlook calendar.</p>{members.map(member => <label className="calendar-all-day-toggle" key={member.id}><input type="checkbox" name="inviteeIds" value={member.id} defaultChecked={event?.inviteeIds?.includes(member.id)} />{member.name}</label>)}</details>}
      <SubmitButton label={event ? "Save event changes" : "Save booking"} />
    </form>
  </CalendarDialog>;
}
