import { InstrumentStatus } from "@prisma/client";

import { getLabDateKey, parseLabDateTime, shiftDateString } from "@/lib/lab-time";

type InstrumentAvailabilitySource = {
  status: InstrumentStatus;
  unavailableFrom: Date | null;
  unavailableUntil: Date | null;
};

export function getUnavailableDateRange(
  instrument: InstrumentAvailabilitySource,
  todayDateKey = getLabDateKey(new Date())
) {
  if (instrument.status !== InstrumentStatus.UNAVAILABLE) {
    return null;
  }

  const startDateKey = instrument.unavailableFrom ? getLabDateKey(instrument.unavailableFrom) : todayDateKey;
  const endDateKey = instrument.unavailableUntil ? getLabDateKey(instrument.unavailableUntil) : null;

  if (endDateKey && endDateKey < startDateKey) {
    return null;
  }

  return {
    startDateKey,
    endDateKey
  };
}

export function isInstrumentUnavailableOnDate(
  instrument: InstrumentAvailabilitySource,
  dateKey: string,
  todayDateKey = getLabDateKey(new Date())
) {
  const range = getUnavailableDateRange(instrument, todayDateKey);

  if (!range) {
    return false;
  }

  if (dateKey < range.startDateKey) {
    return false;
  }

  if (range.endDateKey && dateKey > range.endDateKey) {
    return false;
  }

  return true;
}

export function doesInstrumentUnavailabilityOverlap(
  instrument: InstrumentAvailabilitySource,
  startAt: Date,
  endAt: Date,
  todayDateKey = getLabDateKey(new Date())
) {
  const range = getUnavailableDateRange(instrument, todayDateKey);

  if (!range) {
    return false;
  }

  const unavailableStartAt = parseLabDateTime(range.startDateKey, "06:00");
  const unavailableEndAt = range.endDateKey
    ? parseLabDateTime(shiftDateString(range.endDateKey, 1), "00:00")
    : parseLabDateTime(shiftDateString(getLabDateKey(endAt), 3650), "00:00");

  return startAt < unavailableEndAt && endAt > unavailableStartAt;
}
