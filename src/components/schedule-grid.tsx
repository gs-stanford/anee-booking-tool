"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CalendarDialog } from "@/components/calendar-dialog";
export type ScheduleEvent = { id: string; date: string; start: number; end: number; title: string; person: string; kind: string; content: ReactNode; allDay?: boolean };
export function ScheduleGrid({ days, events, today }: { days: { date: string; label: string }[]; events: ScheduleEvent[]; today: string }) {
  const [selected, setSelected] = useState(days.some(day => day.date === today) ? today : days[0].date);
  const active = days.some(day => day.date === selected) ? selected : days[0].date;
  const scroll = useRef<HTMLDivElement>(null);
  const firstDate = days[0].date;
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = 8 * 72; }, [firstDate]);
  return <>
    <div className="schedule-day-picker" role="group" aria-label="Choose calendar day">{days.map(day => <button type="button" key={day.date} aria-pressed={active === day.date} onClick={() => setSelected(day.date)}><span>{day.label.slice(0, 3)}</span><strong>{Number(day.date.slice(-2))}</strong></button>)}</div>
    <div className="schedule-scroll" ref={scroll} tabIndex={0} role="region" aria-label="Lab calendar, scroll for more hours">
      <div className="schedule-grid">
        <div className="schedule-hours"><div className="schedule-heading" /><div className="schedule-time-track">{Array.from({ length: 24 }, (_, hour) => <span key={hour} style={{ top: hour * 72 }}>{hour === 0 ? "12 am" : hour < 12 ? `${hour} am` : hour === 12 ? "12 pm" : `${hour - 12} pm`}</span>)}</div></div>
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
            <div className="schedule-heading"><span>{day.label.slice(0, 3)}</span><strong>{Number(day.date.slice(-2))}</strong>{events.filter(event => event.date === day.date && event.allDay).map(event => <CalendarDialog key={event.id} title={event.title} label={event.title} triggerClassName="schedule-outage">{event.content}</CalendarDialog>)}</div>
            <div className="schedule-track">{positioned.map(({ event, lane, lanes }) => <CalendarDialog key={event.id} title={event.title} label={<><strong>{event.title}</strong><span>{event.person}</span></>} triggerClassName={`schedule-event schedule-event-${event.kind}`} triggerStyle={{ top: event.start * 1.2, height: Math.max(36, (event.end - event.start) * 1.2) - 2, left: `calc(${lane * 100 / lanes}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }} triggerTitle={`${event.title} · ${event.person}`}><p className="muted">{day.date} · {String(Math.floor(event.start / 60)).padStart(2, "0")}:{String(event.start % 60).padStart(2, "0")}–{String(Math.floor(event.end / 60)).padStart(2, "0")}:{String(event.end % 60).padStart(2, "0")} · Pacific time</p>{event.content}</CalendarDialog>)}</div>
          </div>;
        })}
      </div>
    </div>
  </>;
}
