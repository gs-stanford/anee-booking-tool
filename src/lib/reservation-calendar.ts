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
  userId: string;
  userName: string;
  date: string;
  isAllDay: boolean;
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
    isAllDay: isAllDayReservation(reservation)
  }));
}
