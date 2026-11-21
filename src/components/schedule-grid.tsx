"use client";
import { useScheduleDrag } from "@/components/use-schedule-drag";
import type { MoveBooking } from "@/lib/calendar-move";
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CalendarBookingForm, type BookingDraft, type CalendarBookingOptions } from "@/components/calendar-booking-form";
import { CalendarDialog } from "@/components/calendar-dialog";
export type ScheduleEvent = { id: string; date: string; start: number; end: number; title: string; person: string; kind: string; content: ReactNode; allDay?: boolean; move?: Omit<MoveBooking, "date" | "time"> };
export function ScheduleGrid({ days, events, today, booking, minimumDate }: { booking: CalendarBookingOptions; minimumDate: string; days: { date: string; label: string }[]; events: ScheduleEvent[]; today: string }) {
  const [selected, setSelected] = useState(days.some(day => day.date === today) ? today : (days.find(day => day.date >= minimumDate)?.date ?? days[0].date));
  const active = days.some(day => day.date === selected) ? selected : days[0].date;
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const openBooking = useCallback((value: BookingDraft) => setDraft(value), []);
  const drag = useScheduleDrag(events, minimumDate, openBooking);
  const scroll = useRef<HTMLDivElement>(null);
  const firstDate = days[0].date;
  useLayoutEffect(() => {
    const element = scroll.current;
    if (!element) return;
    let positioned = false;
    const position = () => {
      // Streaming/hydration can run before styles give the track its final height.
      if (!positioned && element.clientHeight > 0 && element.scrollHeight >= 1152) {
        element.scrollTop = 8 * 48;
        positioned = true;
      }
    };
    const observer = new ResizeObserver(position);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    const frame = requestAnimationFrame(position);
    const restore = () => { positioned = false; position(); };
    window.addEventListener("pageshow", restore);
    position();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener("pageshow", restore); };
  }, [firstDate]);
  return <div className={`schedule-interaction${drag.preview ? " is-dragging" : ""}`} onPointerDownCapture={drag.onPointerDownCapture} onClickCapture={drag.onClickCapture}>
    {(drag.pending || drag.message) && <p role="status" className="schedule-message">{drag.pending ? "Rescheduling…" : drag.message}</p>}
    <div className="schedule-day-picker" role="group" aria-label="Choose calendar day">{days.map(day => <button type="button" key={day.date} aria-pressed={active === day.date} onClick={() => setSelected(day.date)}><span>{day.label.slice(0, 3)}</span><strong>{Number(day.date.slice(-2))}</strong></button>)}</div>
    <div className="schedule-grid schedule-dates">
      <div className="schedule-heading" />
      {days.map(day => <div key={day.date} className={`schedule-day${day.date === active ? " is-selected" : ""}${day.date === today ? " is-today" : ""}`}><div className="schedule-heading"><span>{day.label.slice(0, 3)}</span><strong>{Number(day.date.slice(-2))}</strong></div></div>)}
    </div>
    <div className="schedule-grid schedule-all-day">
      <span className="schedule-all-day-label">All day</span>
      {days.map(day => <div key={day.date} data-all-day-date={day.date} data-drag-selected={Boolean(drag.preview?.allDay && drag.range(day.date))} className={`schedule-day${day.date === active ? " is-selected" : ""}`}>
        <button type="button" className="schedule-all-day-add" data-slot-date={day.date} data-slot="0" data-all-day="true" aria-label={`New all-day reservation ${day.date}`} disabled={day.date < minimumDate} onClick={() => openBooking({ date: day.date, allDay: true })}>+</button>
        {events.filter(event => event.date === day.date && event.allDay).map(event => <CalendarDialog key={event.id} title={event.title} label={<><strong>{event.title}</strong>{event.person && <span>{event.person}</span>}</>} triggerClassName={`schedule-banner schedule-event-${event.kind}${event.move ? " is-movable" : ""}`} triggerProps={event.move ? {"data-move-id":event.id,"data-move-date":event.date} as React.ButtonHTMLAttributes<HTMLButtonElement> : undefined}><p className="muted">{day.date} · All day · Pacific time</p>{event.content}</CalendarDialog>)}
      </div>)}
    </div>
    <div className="schedule-scroll" ref={scroll} tabIndex={0} role="region" aria-label="Lab calendar, scroll for more hours">
      <div className="schedule-grid">
        <div className="schedule-hours"><div className="schedule-time-track">{Array.from({ length: 24 }, (_, hour) => <span key={hour} style={{ top: hour * 48 }}>{hour === 0 ? "12 am" : hour < 12 ? `${hour} am` : hour === 12 ? "12 pm" : `${hour - 12} pm`}</span>)}</div></div>
        {days.map(day => {
          const items = events.filter(event => event.date === day.date && !event.allDay).sort((a, b) => a.start - b.start || b.end - a.end);
          const positioned: { event: ScheduleEvent; lane: number; lanes: number }[] = [];
          for (let index = 0; index < items.length;) {
            let last = index + 1;
            let end = Math.max(items[index].end, items[index].start + 30);
            while (last < items.length && items[last].start < end) { end = Math.max(end, items[last].end, items[last].start + 30); last++; }
            const ends: number[] = [];
            const group = items.slice(index, last).map(event => {
              let lane = ends.findIndex(value => value <= event.start);
              if (lane < 0) lane = ends.length;
              ends[lane] = Math.max(event.end, event.start + 30);
              return { event, lane };
            });
            positioned.push(...group.map(item => ({ ...item, lanes: ends.length })));
            index = last;
          }
          return <div key={day.date} className={`schedule-day${day.date === active ? " is-selected" : ""}${day.date === today ? " is-today" : ""}`}>
            <div className="schedule-track" data-track-date={day.date}>
              {Array.from({ length: 48 }, (_, slot) => {
                const time = `${String(Math.floor(slot / 2)).padStart(2, "0")}:${slot % 2 ? "30" : "00"}`;
                return <button key={slot} type="button" className="schedule-empty-slot" data-slot-date={day.date} data-slot={slot} style={{ top: slot * 24 }} aria-label={`New reservation ${day.date} ${time}`} disabled={day.date < minimumDate} onClick={() => openBooking({ date: day.date, time })} />;
              })}
              {!drag.preview?.allDay && drag.range(day.date) && <div className="schedule-drag-preview" style={{top:drag.range(day.date)!.start*.8,height:(drag.range(day.date)!.end-drag.range(day.date)!.start)*.8}}>{drag.range(day.date)!.label}</div>}
              {positioned.map(({ event, lane, lanes }) => <CalendarDialog key={event.id} title={event.title} label={<><strong>{event.title}</strong><span>{event.person}</span></>} triggerClassName={`schedule-event schedule-event-${event.kind}${event.move ? " is-movable" : ""}`} triggerProps={event.move ? {"data-move-id":event.id,"data-move-date":event.date} as React.ButtonHTMLAttributes<HTMLButtonElement> : undefined} triggerStyle={{ top: event.start * .8, height: Math.max(24, (event.end - event.start) * .8) - 1, left: `calc(${lane * 100 / lanes}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }} triggerTitle={`${event.title} · ${event.person}`}><p className="muted">{day.date} · {String(Math.floor(event.start / 60)).padStart(2, "0")}:{String(event.start % 60).padStart(2, "0")}–{String(Math.floor(event.end / 60)).padStart(2, "0")}:{String(event.end % 60).padStart(2, "0")} · Pacific time</p>{event.content}</CalendarDialog>)}</div>
          </div>;
        })}
      </div>
    </div>
    {draft && <CalendarBookingForm key={`${draft.date}-${draft.time}-${draft.allDay}`} {...booking} date={draft.date} draft={draft} onClose={() => setDraft(null)} />}
  </div>;
}
