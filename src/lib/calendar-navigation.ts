import {getStartOfLabWeekDateKey} from "@/lib/lab-time";
import {homeScheduleWeek} from "@/lib/home-schedule";
export function calendarNavigationWeek(date:string|undefined,week:string|undefined,now=new Date()) {
  if(date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const stamp=Date.parse(`${date}T12:00:00Z`);
    if(Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0,10)===date) return Math.max(0,Math.min(156,Math.floor((stamp-Date.parse(`${getStartOfLabWeekDateKey(now)}T12:00:00Z`))/604800000)));
  }
  if(week!==undefined && Number.isInteger(Number(week))) return Math.max(0,Math.min(156,Number(week)));
  return homeScheduleWeek(0,now);
}
