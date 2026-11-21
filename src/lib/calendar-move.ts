import { PrismaClient, Role } from "@prisma/client";
import { z } from "zod";
import { getLabDateKey, getLabTimeKey, parseLabDateTime, shiftDateString } from "@/lib/lab-time";
import { isAllDayReservation } from "@/lib/reservation-calendar";
import { doesInstrumentUnavailabilityOverlap } from "@/lib/instrument-availability";
import { isSharedImpact } from "@/lib/home-calendar";
import { SAFETY_SCHEDULE_START } from "@/lib/home-schedule";
const schema = z.object({ id: z.string().min(1), kind: z.enum(["instrument", "impact"]), originalStart: z.iso.datetime(), originalEnd: z.iso.datetime(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) });
export type MoveBooking = z.infer<typeof schema>;
export async function moveCalendarBooking(client: PrismaClient, user: {id: string; role: Role}, raw: unknown, now = new Date()) {
  const input = schema.parse(raw);
  if (user.role === Role.TEMP) throw new Error("Only lab members can move bookings.");
  return client.$transaction(async tx => {
    const item = input.kind === "instrument" ? await tx.reservation.findUnique({where:{id:input.id}, include:{instrument:true}}) : await tx.labEvent.findUnique({where:{id:input.id}});
    if (!item || (user.role !== Role.ADMIN && ("userId" in item ? item.userId : item.ownerId) !== user.id)) throw new Error("You can only move your own bookings.");
    if (item.startAt.toISOString() !== input.originalStart || item.endAt.toISOString() !== input.originalEnd) throw new Error("This booking changed. Refresh and try again.");
    if (item.endAt <= now) throw new Error("This booking has ended.");
    const allDay = isAllDayReservation(item);
    const time = allDay ? getLabTimeKey(item.startAt) : input.time;
    const startAt = parseLabDateTime(input.date, time);
    if (input.date < SAFETY_SCHEDULE_START || !Number.isFinite(startAt.getTime()) || getLabDateKey(startAt) !== input.date || getLabTimeKey(startAt) !== time || (allDay ? input.date < getLabDateKey(now) : startAt <= now)) throw new Error("Choose a valid future time.");
    const days = Math.round((Date.parse(getLabDateKey(item.endAt)) - Date.parse(getLabDateKey(item.startAt))) / 86400000);
    const endAt = allDay ? parseLabDateTime(shiftDateString(input.date, days), getLabTimeKey(item.endAt)) : new Date(startAt.getTime() + item.endAt.getTime() - item.startAt.getTime());
    if (input.kind === "instrument" && "instrument" in item) {
      if (!isSharedImpact(item.instrument)) throw new Error("Use the instrument calendar to move this booking.");
      if (doesInstrumentUnavailabilityOverlap(item.instrument, startAt, endAt)) throw new Error("The instrument is unavailable during that time.");
      if (await tx.reservation.findFirst({where:{instrumentId:item.instrumentId, id:{not:item.id}, startAt:{lt:endAt},endAt:{gt:startAt}}})) throw new Error("The instrument is already reserved during that time.");
      await tx.reservation.update({where:{id:item.id},data:{startAt,endAt}});
    } else await tx.labEvent.update({where:{id:item.id},data:{startAt,endAt,version:{increment:1}}});
  });
}
