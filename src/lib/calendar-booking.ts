import { calendarInvitationsEnabled, calendarInviteRecipients } from "@/lib/calendar-invitations";
import { teamsConfigured } from "@/lib/outlook";
import { PrismaClient, Role } from "@prisma/client";
import { z } from "zod";
import { getLabDateKey, getLabTimeKey, parseLabDateTime, shiftDateString } from "@/lib/lab-time";
import { doesInstrumentUnavailabilityOverlap } from "@/lib/instrument-availability";
import { SAFETY_SCHEDULE_START } from "@/lib/home-schedule";
import { isSharedImpact } from "@/lib/home-calendar";

export const calendarBookingSchema = z.object({
  invitationsEdited: z.literal("on").optional(),
  inviteeIds: z.array(z.string().min(1)).max(100).optional(),
  kind: z.enum(["instrument", "event", "meeting"]),
  teamsEnabled: z.enum(["on", "off"]).optional(),
  allDay: z.enum(["on", "off"]).optional(),
  instrumentId: z.string().optional(),
  title: z.string().trim().max(120).optional(),
  location: z.string().trim().max(160).optional(),
  notes: z.string().trim().max(2000).optional(),
  impact: z.string().trim().max(2000).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional()
});
export async function saveCalendarBooking(client: PrismaClient, user: { id: string; role: Role }, raw: unknown, edit?: { id: string; version: number }, now = new Date()) {
  if (user.role === Role.TEMP) throw new Error("Only lab members can create shared calendar events.");
  const input = calendarBookingSchema.parse(raw);
  if (input.startDate < SAFETY_SCHEDULE_START) throw new Error("The homepage schedule begins January 4, 2027.");
  const allDay = input.allDay === "on";
  const startTime = allDay ? "00:00" : input.startTime;
  const endTime = allDay ? "00:00" : input.endTime;
  if (!startTime || !endTime || input.endDate < input.startDate) throw new Error("Choose valid start and end dates and times.");
  // All-day end dates include the selected day; persist the exclusive midnight boundary.
  const endDate = allDay ? shiftDateString(input.endDate, 1) : input.endDate;
  const startAt = parseLabDateTime(input.startDate, startTime);
  const endAt = parseLabDateTime(endDate, endTime);
  if (allDay && getLabDateKey(parseLabDateTime(input.endDate, "00:00")) !== input.endDate) throw new Error("Choose a valid end date.");
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || (allDay ? input.startDate < getLabDateKey(now) : startAt <= now) || endAt <= startAt || getLabDateKey(startAt) !== input.startDate || getLabDateKey(endAt) !== endDate || getLabTimeKey(startAt) !== startTime || getLabTimeKey(endAt) !== endTime) throw new Error("Choose valid future start and end times in the lab timezone.");
  return client.$transaction(async tx => {
    const existingEvent = edit ? await tx.labEvent.findUnique({where:{id:edit.id},include:{invitees:true}}) : null;
    if(edit && (!existingEvent || (user.role!==Role.ADMIN && existingEvent.ownerId!==user.id))) throw new Error("You do not have permission to edit this event.");
    const ownerId=existingEvent?.ownerId ?? user.id;
    const submitted=[...new Set(input.inviteeIds ?? [])].filter(id=>id!==ownerId);
    const editingInvitations=input.invitationsEdited === "on";
    if ((submitted.length || editingInvitations) && !calendarInvitationsEnabled()) throw new Error("Invitations are not enabled yet.");
    if(submitted.length && !editingInvitations) throw new Error("Use the invitation controls to select recipients.");
    const eligible=editingInvitations ? await calendarInviteRecipients(tx) : [];
    if(submitted.some(id=>!eligible.some(member=>member.id===id))) throw new Error("Invite only approved members with a connected, successfully synced Outlook account.");
    // Hidden controls must not erase earlier invitations on an ordinary event edit.
    // Preserve temporarily ineligible recipients; eligibility is also checked at sync.
    const inviteeIds=editingInvitations ? [...new Set([...submitted,...(existingEvent?.invitees ?? []).filter(invite=>!eligible.some(member=>member.id===invite.userId)).map(invite=>invite.userId)])] : (existingEvent?.invitees ?? []).map(invite=>invite.userId);
    const invitees=inviteeIds.filter(id=>id!==ownerId).map(userId=>({userId}));
    if (input.kind === "instrument") {
      if (edit) throw new Error("Edit instrument reservations from the instrument calendar.");
      const instrument = await tx.instrument.findUnique({ where: { id: input.instrumentId || "" } });
      if (!instrument || !isSharedImpact(instrument)) throw new Error("Choose a shared or cross-impact instrument.");
      if (doesInstrumentUnavailabilityOverlap(instrument, startAt, endAt)) throw new Error("This instrument is unavailable during that time.");
      if (await tx.reservation.findFirst({ where: { instrumentId: instrument.id, startAt: { lt: endAt }, endAt: { gt: startAt } } })) throw new Error("That instrument is already reserved during this time.");
      await tx.reservation.create({ data: { instrumentId: instrument.id, userId: user.id, startAt, endAt, purpose: input.notes || null, invitees:{create:invitees} } });
    } else {
      if (!input.title || (input.kind === "event" && (!input.location || !input.impact))) throw new Error("Add a title and, for cross-impact events, a location and impact on the lab.");
      const existing = edit ? await tx.labEvent.findUnique({where:{id:edit.id}}) : null;
      if (edit && (!existing || (user.role !== Role.ADMIN && existing.ownerId !== user.id))) throw new Error("You do not have permission to edit this event.");
      const teamsEnabled = input.teamsEnabled === "on";
      if (teamsEnabled && !existing?.teamsEnabled) {
        const connection = await tx.outlookConnection.findUnique({where:{userId:existing?.ownerId ?? user.id}});
        if (!teamsConfigured() || !connection?.refreshToken) throw new Error("The meeting organizer must connect Outlook and Teams must be enabled before adding a Teams meeting.");
      }
      const data = { title: input.title, location: input.location || "", impact: input.kind === "event" ? input.impact! : "", notes:input.notes || "", eventType:input.kind, teamsEnabled, startAt, endAt };
      if (edit) {
        const result = await tx.labEvent.updateMany({ where: { id: edit.id, version: edit.version, ...(user.role === Role.ADMIN ? {} : { ownerId: user.id }) }, data: { ...data, version: { increment: 1 } } });
        if (!result.count) throw new Error("The event changed or you do not have permission to edit it.");
        await tx.labEventInvite.deleteMany({where:{eventId:edit.id}});
        for (const invite of invitees) await tx.labEventInvite.create({data:{eventId:edit.id,...invite}});
      } else await tx.labEvent.create({ data: { ...data, ownerId: user.id, invitees:{create:invitees} } });
    }
  });
}
