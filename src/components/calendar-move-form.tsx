import { moveCalendarBookingFormAction } from "@/app/actions";
import { getLabDateKey, getLabTimeKey } from "@/lib/lab-time";
import { SubmitButton } from "@/components/submit-button";
export function CalendarMoveForm({id,kind,startAt,endAt,week,allDay=false}:{id:string;kind:"instrument"|"impact";startAt:Date;endAt:Date;week:number;allDay?:boolean}) {
  return <details><summary>Reschedule</summary><form action={moveCalendarBookingFormAction} className="form-grid">
    <input type="hidden" name="id" value={id}/><input type="hidden" name="kind" value={kind}/><input type="hidden" name="originalStart" value={startAt.toISOString()}/><input type="hidden" name="originalEnd" value={endAt.toISOString()}/><input type="hidden" name="week" value={week}/>
    <label>New start date<input type="date" name="date" defaultValue={getLabDateKey(startAt)} required/></label>
    {allDay?<input type="hidden" name="time" value="00:00"/>:<label>New start time<input type="time" name="time" defaultValue={getLabTimeKey(startAt)} required/></label>}
    <small>Keeps the same duration.</small><SubmitButton label="Move booking"/>
  </form></details>;
}
