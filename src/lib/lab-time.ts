import { fromZonedTime } from "date-fns-tz";

const DEFAULT_LAB_TIMEZONE = "America/Los_Angeles";

export function getLabTimeZone() {
  return process.env.LAB_TIMEZONE || DEFAULT_LAB_TIMEZONE;
}

function incrementDateString(date: string) {
  const [year, month, day] = date.split("-").map((value) => Number(value));
  const normalized = new Date(Date.UTC(year, month - 1, day));
  normalized.setUTCDate(normalized.getUTCDate() + 1);

  return [
    normalized.getUTCFullYear(),
    String(normalized.getUTCMonth() + 1).padStart(2, "0"),
    String(normalized.getUTCDate()).padStart(2, "0")
  ].join("-");
}

export function parseLabDateTime(date: string, time: string) {
  if (time === "24:00") {
    return fromZonedTime(`${incrementDateString(date)}T00:00:00`, getLabTimeZone());
  }

  return fromZonedTime(`${date}T${time}:00`, getLabTimeZone());
}
