import { PrismaClient, Role } from "@prisma/client";
import { z } from "zod";
import { getLabDateKey, getLabTimeKey, parseLabDateTime } from "@/lib/lab-time";
import { doesInstrumentUnavailabilityOverlap } from "@/lib/instrument-availability";
import { SAFETY_SCHEDULE_START } from "@/lib/home-schedule";
import { isSharedImpact } from "@/lib/home-calendar";

export const calendarBookingSchema = z.object({
  kind: z.enum(["instrument", "event"]),
  instrumentId: z.string().optional(),
  title: z.string().trim().max(120).optional(),
  location: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
  impact: z.string().trim().max(2000).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)
});
export async function saveCalendarBooking(client: PrismaClient, user: { id: string; role: Role }, raw: unknown, edit?: { id: string; version: number }, now = new Date()) {
  if (user.role === Role.TEMP) throw new Error("Only lab members can create shared calendar events.");
  const input = calendarBookingSchema.parse(raw);
  if (input.startDate < SAFETY_SCHEDULE_START) throw new Error("The homepage schedule begins January 4, 2027.");
  const startAt = parseLabDateTime(input.startDate, input.startTime);
  const endAt = parseLabDateTime(input.endDate, input.endTime);
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || startAt <= now || endAt <= startAt || getLabDateKey(startAt) !== input.startDate || getLabDateKey(endAt) !== input.endDate || getLabTimeKey(startAt) !== input.startTime || getLabTimeKey(endAt) !== input.endTime) throw new Error("Choose valid future start and end times in the lab timezone.");
  return client.$transaction(async tx => {
    if (input.kind === "instrument") {
      if (edit) throw new Error("Edit instrument reservations from the instrument calendar.");
      const instrument = await tx.instrument.findUnique({ where: { id: input.instrumentId || "" } });
      if (!instrument || !isSharedImpact(instrument)) throw new Error("Choose a shared or cross-impact instrument.");
      if (doesInstrumentUnavailabilityOverlap(instrument, startAt, endAt)) throw new Error("This instrument is unavailable during that time.");
      if (await tx.reservation.findFirst({ where: { instrumentId: instrument.id, startAt: { lt: endAt }, endAt: { gt: startAt } } })) throw new Error("That instrument is already reserved during this time.");
      await tx.reservation.create({ data: { instrumentId: instrument.id, userId: user.id, startAt, endAt, purpose: input.notes || null } });
    } else {
      if (!input.title || !input.location || !input.impact) throw new Error("Add an event title, location and impact on the lab.");
      const data = { title: input.title, location: input.location, impact: input.impact, startAt, endAt };
      if (edit) {
        const result = await tx.labEvent.updateMany({ where: { id: edit.id, version: edit.version, ...(user.role === Role.ADMIN ? {} : { ownerId: user.id }) }, data: { ...data, version: { increment: 1 } } });
        if (!result.count) throw new Error("The event changed or you do not have permission to edit it.");
      } else await tx.labEvent.create({ data: { ...data, ownerId: user.id } });
    }
  });
}
