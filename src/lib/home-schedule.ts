import { getStartOfLabWeekDateKey, parseLabDateTime } from "@/lib/lab-time";
import { validateSafetySlot } from "@/lib/home-calendar";

export const SAFETY_SCHEDULE_START = "2027-01-04";
export function minimumHomeWeek(now = new Date()) {
  const currentWeek = getStartOfLabWeekDateKey(now);
  return Math.max(0, Math.round((Date.parse(`${getStartOfLabWeekDateKey(parseLabDateTime(SAFETY_SCHEDULE_START, "12:00"))}T12:00:00Z`) - Date.parse(`${currentWeek}T12:00:00Z`)) / 604800000));
}
export function homeScheduleWeek(value: number, now = new Date()) {
  const minimum = minimumHomeWeek(now);
  return Number.isInteger(value) ? Math.max(minimum, Math.min(156, value)) : minimum;
}
export function isUpcomingSafetySlot(date: string, time: string, now = new Date()) {
  const slot = validateSafetySlot(date, time);
  return date >= SAFETY_SCHEDULE_START && Boolean(slot && slot > now);
}
