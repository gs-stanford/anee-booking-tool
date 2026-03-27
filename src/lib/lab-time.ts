import { fromZonedTime } from "date-fns-tz";

const DEFAULT_LAB_TIMEZONE = "America/Los_Angeles";

export function getLabTimeZone() {
  return process.env.LAB_TIMEZONE || DEFAULT_LAB_TIMEZONE;
}

export function parseLabDateTime(date: string, time: string) {
  return fromZonedTime(`${date}T${time}:00`, getLabTimeZone());
}
