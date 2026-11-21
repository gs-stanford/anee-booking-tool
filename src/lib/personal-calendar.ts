import { PrismaClient, Role } from "@prisma/client";
import { getLabDateKey, parseLabDateTime } from "@/lib/lab-time";
import { resolvePresenterId } from "@/lib/tea-time";
export type PersonalEvent = { key:string; title:string; location:string; notes:string; startAt:Date; endAt:Date };
export async function personalCalendarEvents(client:PrismaClient,userId:string,now=new Date()):Promise<PersonalEvent[]> {
  const [reservations,events,safety,tea,members] = await Promise.all([
    client.reservation.findMany({where:{endAt:{gt:now},OR:[{userId},{invitees:{some:{userId}}}]},include:{instrument:true}}),
    client.labEvent.findMany({where:{endAt:{gt:now},OR:[{ownerId:userId},{invitees:{some:{userId}}}]},include:{teamsMeeting:true}}),
    client.safetySignup.findMany({where:{userId,date:{gte:getLabDateKey(now)}}}),
    client.teaTimeSession.findMany({where:{date:{gte:getLabDateKey(now)}}}),
    client.user.findMany({where:{role:{not:Role.TEMP}},select:{id:true,name:true}})
  ]);
  return [
    ...reservations.map(r=>({key:`reservation:${r.id}`,title:r.instrument.name,location:r.instrument.location,notes:r.purpose??"",startAt:r.startAt,endAt:r.endAt})),
    ...events.map(e=>({key:`event:${e.id}`,title:e.title,location:e.location,notes:[e.impact,e.notes,e.teamsEnabled && e.teamsMeeting ? `Join Teams: ${e.teamsMeeting.joinUrl}` : ""].filter(Boolean).join("\n\n"),startAt:e.startAt,endAt:e.endAt})),
    ...safety.map(s=>({key:`safety:${s.id}`,title:"Lab safety check",location:"Boies Lab",notes:"Your assigned lab safety evaluation.",startAt:parseLabDateTime(s.date,s.time),endAt:new Date(parseLabDateTime(s.date,s.time).getTime()+30*60000)})),
    ...tea.filter(t=>resolvePresenterId(t,members)===userId).map(t=>({key:`tea:${t.date}`,title:"Tea Time — presenting",location:"Boies Lab",notes:t.signupEnabled?"Quals practice presentation":"Your Tea Time presentation.",startAt:parseLabDateTime(t.date,"13:00"),endAt:parseLabDateTime(t.date,"14:00")}))
  ].filter(e=>e.endAt>now);
}
