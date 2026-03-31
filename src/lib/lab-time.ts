import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const DEFAULT_LAB_TIMEZONE = "America/Los_Angeles";
const DATE_KEY_TIME = "T12:00:00Z";

export function getLabTimeZone() {
  return process.env.LAB_TIMEZONE || DEFAULT_LAB_TIMEZONE;
}

export function shiftDateString(date: string, days: number) {
  const [year, month, day] = date.split("-").map((value) => Number(value));
  const normalized = new Date(Date.UTC(year, month - 1, day));
  normalized.setUTCDate(normalized.getUTCDate() + days);

  return [
    normalized.getUTCFullYear(),
    String(normalized.getUTCMonth() + 1).padStart(2, "0"),
    String(normalized.getUTCDate()).padStart(2, "0")
  ].join("-");
}

export function parseLabDateTime(date: string, time: string) {
  if (time === "24:00") {
    return fromZonedTime(`${shiftDateString(date, 1)}T00:00:00`, getLabTimeZone());
  }

  return fromZonedTime(`${date}T${time}:00`, getLabTimeZone());
}

function dateKeyToDisplayDate(date: string) {
  return new Date(`${date}${DATE_KEY_TIME}`);
}

export function getLabDateKey(date: Date) {
  return formatInTimeZone(date, getLabTimeZone(), "yyyy-MM-dd");
}

export function getLabTimeKey(date: Date) {
  return formatInTimeZone(date, getLabTimeZone(), "HH:mm");
}

export function getStartOfLabWeekDateKey(date: Date) {
  const isoWeekday = Number(formatInTimeZone(date, getLabTimeZone(), "i"));
  return shiftDateString(getLabDateKey(date), -(isoWeekday - 1));
}

export function timeKeyToSlot(time: string, startHour = 6, slotMinutes = 30) {
  const [hours, minutes] = time.split(":").map((value) => Number(value));
  const totalMinutes = hours * 60 + minutes;
  return (totalMinutes - startHour * 60) / slotMinutes;
}

export function formatDateKeyShortDay(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC"
  }).format(dateKeyToDisplayDate(date));
}

export function formatDateKeyMonthDay(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  }).format(dateKeyToDisplayDate(date));
}

export function formatDateKeyLong(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(dateKeyToDisplayDate(date));
}
