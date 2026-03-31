import { formatDateTime, formatTime } from "@/lib/utils";
import { getLabDateKey, getLabTimeKey, shiftDateString } from "@/lib/lab-time";

type ReservationSummarySource = {
  id: string;
  purpose: string | null;
  startAt: Date;
  endAt: Date;
  instrument: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    name: string;
  };
};

export type ReservationSummary = {
  id: string;
  instrumentName: string;
  userName: string;
  purpose: string | null;
  label: string;
};

type InternalReservationSummary = ReservationSummary & {
  _allDay?: boolean;
  _startDate?: string;
  _endDate?: string;
  _instrumentId?: string;
  _userId?: string;
};

function formatDateKey(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00Z`));
}

function formatDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);

  const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
  const sameMonth = sameYear && start.getUTCMonth() === end.getUTCMonth();

  if (sameMonth) {
    return `${new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    }).format(start)}-${end.getUTCDate()}, ${end.getUTCFullYear()}`;
  }

  if (sameYear) {
    return `${new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC"
    }).format(start)} to ${new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    }).format(end)}`;
  }

  return `${formatDateKey(startDate)} to ${formatDateKey(endDate)}`;
}

function isAllDayReservation(reservation: ReservationSummarySource) {
  return (
    getLabTimeKey(reservation.startAt) === "06:00" &&
    getLabTimeKey(reservation.endAt) === "00:00" &&
    getLabDateKey(reservation.endAt) === shiftDateString(getLabDateKey(reservation.startAt), 1)
  );
}

export function summarizeReservations(reservations: ReservationSummarySource[]) {
  const grouped: InternalReservationSummary[] = [];

  for (const reservation of reservations) {
    const allDay = isAllDayReservation(reservation);
    const reservationDate = getLabDateKey(reservation.startAt);
    const last = grouped[grouped.length - 1];

    if (
      allDay &&
      last?._allDay &&
      last._instrumentId === reservation.instrument.id &&
      last._userId === reservation.user.id &&
      last.purpose === reservation.purpose &&
      last._endDate &&
      reservationDate === shiftDateString(last._endDate, 1)
    ) {
      last._endDate = reservationDate;
      last.label = `${formatDateRange(last._startDate ?? reservationDate, reservationDate)} (All day)`;
      continue;
    }

    const summary: InternalReservationSummary = {
      id: reservation.id,
      instrumentName: reservation.instrument.name,
      userName: reservation.user.name,
      purpose: reservation.purpose,
      label: allDay
        ? `${formatDateKey(reservationDate)} (All day)`
        : `${formatDateTime(reservation.startAt)} to ${formatTime(reservation.endAt)}`,
      _allDay: allDay,
      _startDate: reservationDate,
      _endDate: reservationDate,
      _instrumentId: reservation.instrument.id,
      _userId: reservation.user.id
    };

    grouped.push(summary);
  }

  return grouped.map((summary) => ({
    id: summary.id,
    instrumentName: summary.instrumentName,
    userName: summary.userName,
    purpose: summary.purpose,
    label: summary.label
  }));
}
