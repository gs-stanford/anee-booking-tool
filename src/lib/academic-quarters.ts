import { shiftDateString } from "@/lib/lab-time";
import { validateSafetySlot } from "@/lib/home-calendar";

// Verified 2026-11-20. Detailed calendars take precedence over the older projection.
// 2025-26: https://studentservices.stanford.edu/calendar/academic-dates/previous_calendars/stanford-academic-calendar-2025-2026
// 2026-27: https://studentservices.stanford.edu/calendar-events/academic-calendars/stanford-academic-calendar-2026-2027
// 2027-28 and Autumn 2028: Registrar's September 2024 projection linked from the future calendars page:
// https://drive.google.com/file/d/1WEJDxXgxD8NjmKoqg9olvdsTFLCcFwk_/view
export const QUARTERS = [
  { name: "Winter 2026", start: "2026-01-05", end: "2026-03-20" },
  { name: "Spring 2026", start: "2026-03-30", end: "2026-06-10" },
  { name: "Summer 2026", start: "2026-06-22", end: "2026-08-15" },
  { name: "Autumn 2026", start: "2026-09-22", end: "2026-12-11" },
  { name: "Winter 2027", start: "2027-01-04", end: "2027-03-19" },
  { name: "Spring 2027", start: "2027-03-29", end: "2027-06-09" },
  { name: "Summer 2027", start: "2027-06-21", end: "2027-08-14" },
  { name: "Autumn 2027", start: "2027-09-20", end: "2027-12-10" },
  { name: "Winter 2028", start: "2028-01-03", end: "2028-03-17" },
  { name: "Spring 2028", start: "2028-03-27", end: "2028-06-07" },
  { name: "Summer 2028", start: "2028-06-19", end: "2028-08-12" },
  { name: "Autumn 2028", start: "2028-09-25", end: "2028-12-15" }
];
export function quarterForDate(date: string) {
  return QUARTERS.find(q => date >= q.start && date <= q.end);
}
export function quarterSignupDates(date: string, time: string, now = new Date()) {
  const quarter = quarterForDate(date);
  if (!quarter || !validateSafetySlot(date, time)) return [];
  const dates: string[] = [];
  for (let day = date; day <= quarter.end; day = shiftDateString(day, 7)) {
    const slot = validateSafetySlot(day, time);
    if (slot && slot > now) dates.push(day);
  }
  return dates;
}
