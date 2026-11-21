import { PrismaClient, Role } from "@prisma/client";
import { parseLabDateTime } from "@/lib/lab-time";

export function teaTimeIsUpcoming(date: string, now = new Date()) {
  return parseLabDateTime(date, "14:00") > now;
}

export async function updateTeaTimeSignup(client: PrismaClient, user: { id: string; role: Role }, date: string, operation: string, now = new Date()) {
  if (user.role === Role.TEMP || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !(parseLabDateTime(date, "13:00") > now)) return false;
  if (operation === "claim") {
    const result = await client.teaTimeSession.updateMany({
      where: { date, signupEnabled: true, presenterName: null, presenterId: null },
      data: { presenterId: user.id, version: { increment: 1 } }
    });
    return result.count === 1;
  }
  if (operation === "release") {
    const result = await client.teaTimeSession.updateMany({
      where: { date, signupEnabled: true, presenterId: user.role === Role.ADMIN ? { not: null } : user.id },
      data: { presenterId: null, presenterName: null, version: { increment: 1 } }
    });
    return result.count === 1;
  }
  return false;
}

export type PresenterAccount = { id: string; name: string };
type TeaAssignment = { presenterId: string | null; presenterName: string | null };
export function resolvePresenterId(session: TeaAssignment, members: PresenterAccount[]) {
  if (session.presenterId) return session.presenterId;
  const name = session.presenterName?.trim().toLowerCase();
  if (!name) return null;
  const matches = members.filter(member => {
    const accountName = member.name.trim().toLowerCase();
    return accountName === name || (!name.includes(" ") && accountName.split(/\s+/)[0] === name);
  });
  return matches.length === 1 ? matches[0].id : null;
}
export function canManageTea(session: TeaAssignment, user: { id: string; role: Role }, members: PresenterAccount[]) {
  return user.role === Role.ADMIN || (user.role !== Role.TEMP && resolvePresenterId(session, members) === user.id);
}
export async function changeTeaPresenter(client: PrismaClient, user: { id: string; role: Role }, input: { date: string; version: number; presenterId?: string; swapDate?: string; swapVersion?: number }, now = new Date()) {
  return client.$transaction(async tx => {
    const session = await tx.teaTimeSession.findUnique({ where: { date: input.date } });
    const members = await tx.user.findMany({ where: { role: { not: Role.TEMP } }, select: { id: true, name: true } });
    if (!session || session.version !== input.version || !canManageTea(session, user, members) || parseLabDateTime(session.date, "13:00") <= now) throw new Error("This session changed or you do not have permission to edit it.");
    if (input.swapDate) {
      const other = await tx.teaTimeSession.findUnique({ where: { date: input.swapDate } });
      if (!other || other.date === session.date || other.version !== input.swapVersion || !(other.presenterId || other.presenterName) || parseLabDateTime(other.date, "13:00") <= now) throw new Error("Choose another upcoming presentation. Refresh if the schedule changed.");
      await tx.teaTimeSession.update({ where: { date: session.date }, data: { presenterId: resolvePresenterId(other, members), presenterName: other.presenterName, version: { increment: 1 } } });
      await tx.teaTimeSession.update({ where: { date: other.date }, data: { presenterId: resolvePresenterId(session, members), presenterName: session.presenterName, version: { increment: 1 } } });
    } else {
      const member = members.find(m => m.id === input.presenterId);
      if (!member) throw new Error("Choose a lab member account.");
      await tx.teaTimeSession.update({ where: { date: session.date }, data: { presenterId: member.id, presenterName: null, version: { increment: 1 } } });
    }
  });
}
