"use client";
import { useEffect, useRef, useState, useTransition, type PointerEvent, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { moveCalendarBookingAction } from "@/app/actions";
import type { BookingDraft } from "@/components/calendar-booking-form";
import type { ScheduleEvent } from "@/components/schedule-grid";
import { getLabDateKey, getLabTimeKey, shiftDateString } from "@/lib/lab-time";
type Point = { date: string; slot: number };
type Gesture = { origin: Point; target: Point; x: number; y: number; dragging: boolean; event?: ScheduleEvent; allDay: boolean; grabOffset: number };
const stamp = (point: Point) => Date.parse(`${point.date}T00:00Z`) / 60000 + point.slot * 30;
const time = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2,"0")}:${String(minute % 60).padStart(2,"0")}`;
export function useScheduleDrag(events: ScheduleEvent[], minimumDate: string, openBooking: (draft: BookingDraft) => void) {
  const gesture = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const [preview, setPreview] = useState<Gesture | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  function onPointerDownCapture(e: PointerEvent<HTMLDivElement>) {
    if (pending || e.button !== 0 || e.pointerType === "touch" || !(e.target instanceof Element)) return;
    const button = e.target.closest<HTMLElement>("[data-slot-date], [data-move-id]");
    if (!button || button.matches(":disabled")) return;
    const event = button.dataset.moveId ? events.find(item => item.id === button.dataset.moveId && item.date === button.dataset.moveDate) : undefined;
    if (button.dataset.moveId && !event?.move) return;
    const date = event?.date ?? button.dataset.slotDate!;
    const slot = event ? Math.floor(event.start / 30) : Number(button.dataset.slot);
    const origin = { date, slot };
    gesture.current = { origin, target: origin, x:e.clientX, y:e.clientY, dragging:false, event, allDay:Boolean(event?.allDay || button.dataset.allDay), grabOffset: event && !event.allDay ? Math.floor((e.clientY-button.closest<HTMLElement>("[data-track-date]")!.getBoundingClientRect().top)/24)-slot : 0 };
    suppressClick.current = false;
  }
  useEffect(() => {
    let pointer = {x:0,y:0};
    let frame = 0;
    function update(x: number, y: number) {
      const current = gesture.current;
      if (!current) return;
      if (!current.dragging && Math.hypot(x-current.x,y-current.y)<5) return;
      current.dragging = true;
      const target = document.elementFromPoint(x,y)?.closest<HTMLElement>("[data-track-date], [data-all-day-date]");
      if (target) {
        const date = target.dataset.trackDate ?? target.dataset.allDayDate!;
        if (date >= minimumDate && (current.allDay || target.dataset.trackDate)) {
          const slot = current.allDay ? 0 : Math.max(0, Math.min(47,Math.floor((y-target.getBoundingClientRect().top)/24)-current.grabOffset));
          current.target = {date,slot};
        }
      }
      setPreview({...current});
    }
    function autoScroll() {
      const current = gesture.current;
      const scroller = document.querySelector<HTMLElement>(".schedule-scroll");
      if (current?.dragging && !current.allDay && scroller) {
        const box = scroller.getBoundingClientRect();
        if (pointer.x >= box.left && pointer.x <= box.right) {
          const delta = pointer.y < box.top+35 ? -9 : pointer.y > box.bottom-35 ? 9 : 0;
          if (delta) { scroller.scrollTop += delta; update(pointer.x, Math.max(box.top+1,Math.min(box.bottom-1,pointer.y))); }
        }
      }
      frame = requestAnimationFrame(autoScroll);
    }
    function move(e: globalThis.PointerEvent) { pointer = {x:e.clientX,y:e.clientY}; update(e.clientX,e.clientY); if (gesture.current?.dragging) e.preventDefault(); }
    function cancel() { gesture.current=null; setPreview(null); }
    function finish(e:globalThis.PointerEvent) {
      const current = gesture.current;
      cancel();
      if (!current?.dragging) return;
      if (!document.elementFromPoint(e.clientX,e.clientY)?.closest("[data-track-date], [data-all-day-date]")) return;
      suppressClick.current=true;
      setTimeout(()=>{suppressClick.current=false;},0);
      if (current.event?.move) {
        if (stamp(current.origin) === stamp(current.target)) return;
        const booking = current.event.move;
        setMessage("");
        startTransition(async () => {
          const original = new Date(booking.originalStart);
          const wall = Date.parse(`${getLabDateKey(original)}T${getLabTimeKey(original)}:00Z`) + (stamp(current.target)-stamp(current.origin))*60000;
          const moved = new Date(wall).toISOString();
          const result = await moveCalendarBookingAction({ ...booking, date:moved.slice(0,10), time:moved.slice(11,16) });
          setMessage(result.error ?? result.success ?? "");
          router.refresh();
        });
      } else {
        const [start,end] = stamp(current.origin) <= stamp(current.target) ? [current.origin,current.target] : [current.target,current.origin];
        const endMinutes = (end.slot+1)*30;
        openBooking({date:start.date,time:time(start.slot*30),endDate:current.allDay ? end.date : endMinutes === 1440 ? shiftDateString(end.date,1) : end.date,endTime:time(endMinutes%1440),allDay:current.allDay});
      }
    }
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") cancel(); };
    window.addEventListener("pointermove",move,{passive:false});
    window.addEventListener("pointerup",finish);
    window.addEventListener("pointercancel",cancel);
    window.addEventListener("keydown",escape);
    window.addEventListener("blur",cancel);
    frame=requestAnimationFrame(autoScroll);
    return () => { window.removeEventListener("pointermove",move); window.removeEventListener("pointerup",finish); window.removeEventListener("pointercancel",cancel); window.removeEventListener("keydown",escape); window.removeEventListener("blur",cancel); cancelAnimationFrame(frame); };
  }, [minimumDate, openBooking, router]);
  function onClickCapture(e: MouseEvent<HTMLDivElement>) { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current=false; } }
  function range(date: string) {
    if (!preview) return null;
    if (preview.event) {
      const move=preview.event.move!;
      const wall=(iso:string)=>{const value=new Date(iso);return Date.parse(`${getLabDateKey(value)}T${getLabTimeKey(value)}:00Z`)/60000;};
      const delta=stamp(preview.target)-stamp(preview.origin);
      const low=wall(move.originalStart)+delta, high=wall(move.originalEnd)+delta;
      const day=Date.parse(`${date}T00:00Z`)/60000;
      if(day>=high || day+1440<=low) return null;
      return {start:Math.max(0,low-day),end:Math.min(1440,high-day),label:`Move ${preview.event.title}`};
    }
    const low=Math.min(stamp(preview.origin),stamp(preview.target));
    const high=Math.max(stamp(preview.origin),stamp(preview.target))+30;
    const day=Date.parse(`${date}T00:00Z`)/60000;
    if (day>=high || day+1440<=low) return null;
    return {start:Math.max(0,low-day),end:Math.min(1440,high-day),label:"New reservation"};
  }
  return {onPointerDownCapture,onClickCapture,range,preview,pending,message};
}
