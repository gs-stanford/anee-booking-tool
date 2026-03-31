import { getLabTimeZone } from "@/lib/lab-time";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function startOfWeek(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  return copy;
}

export function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: getLabTimeZone()
  }).format(date);
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: getLabTimeZone()
  }).format(date);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: getLabTimeZone()
  }).format(date);
}

export function formatShortDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: getLabTimeZone()
  }).format(date);
}

export function formatMonthDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: getLabTimeZone()
  }).format(date);
}

export function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function toTimeInputValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function getNotice(searchParams?: Record<string, string | string[] | undefined>) {
  if (!searchParams) {
    return null;
  }

  const typeValue = searchParams.noticeType;
  const messageValue = searchParams.notice;

  const type = Array.isArray(typeValue) ? typeValue[0] : typeValue;
  const message = Array.isArray(messageValue) ? messageValue[0] : messageValue;

  if (!type || !message) {
    return null;
  }

  return {
    type,
    message
  };
}

export function getSingleParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
) {
  if (!searchParams) {
    return undefined;
  }

  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}
