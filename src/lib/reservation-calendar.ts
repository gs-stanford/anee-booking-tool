import { getUnavailableDateRange } from "@/lib/instrument-availability";
import { getLabDateKey, getLabTimeKey, shiftDateString } from "@/lib/lab-time";

export type ReservationCalendarSource = {
  id: string;
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

export type ReservationCalendarItem = {
  id: string;
  instrumentId: string;
  instrumentName: string;
  userId: string | null;
  userName: string;
  date: string;
  isAllDay: boolean;
  kind: "reservation" | "unavailability";
};

export type InstrumentUnavailabilityCalendarSource = {
  id: string;
  name: string;
  status: "AVAILABLE" | "UNAVAILABLE";
  unavailableFrom: Date | null;
  unavailableUntil: Date | null;
};

export function isAllDayReservation(reservation: ReservationCalendarSource) {
  return (
    getLabTimeKey(reservation.startAt) === "06:00" &&
    getLabTimeKey(reservation.endAt) === "00:00" &&
    getLabDateKey(reservation.endAt) === shiftDateString(getLabDateKey(reservation.startAt), 1)
  );
}

export function serializeReservationCalendarItems(
  reservations: ReservationCalendarSource[]
): ReservationCalendarItem[] {
  return reservations.map((reservation) => ({
    id: reservation.id,
    instrumentId: reservation.instrument.id,
    instrumentName: reservation.instrument.name,
    userId: reservation.user.id,
    userName: reservation.user.name,
    date: getLabDateKey(reservation.startAt),
    isAllDay: isAllDayReservation(reservation),
    kind: "reservation"
  }));
}

export function serializeInstrumentUnavailabilityCalendarItems(
  instruments: InstrumentUnavailabilityCalendarSource[],
  windowStartDateKey: string,
  windowEndDateKey: string
) {
  return instruments.flatMap((instrument) => {
    if (!instrument.unavailableFrom && !instrument.unavailableUntil) {
      return [];
    }

    const range = getUnavailableDateRange(instrument);

    if (!range) {
      return [];
    }

    const effectiveStart = range.startDateKey > windowStartDateKey ? range.startDateKey : windowStartDateKey;
    const effectiveEnd = range.endDateKey
      ? range.endDateKey < shiftDateString(windowEndDateKey, -1)
        ? range.endDateKey
        : shiftDateString(windowEndDateKey, -1)
      : shiftDateString(windowEndDateKey, -1);

    if (effectiveEnd < effectiveStart) {
      return [];
    }

    const items: ReservationCalendarItem[] = [];
    let currentDate = effectiveStart;

    while (currentDate <= effectiveEnd) {
      items.push({
        id: `unavailable-${instrument.id}-${currentDate}`,
        instrumentId: instrument.id,
        instrumentName: instrument.name,
        userId: null,
        userName: "Unavailable",
        date: currentDate,
        isAllDay: true,
        kind: "unavailability"
      });
      currentDate = shiftDateString(currentDate, 1);
    }

    return items;
  });
}
