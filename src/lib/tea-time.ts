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
      data: { presenterId: user.id }
    });
    return result.count === 1;
  }
  if (operation === "release") {
    const result = await client.teaTimeSession.updateMany({
      where: { date, signupEnabled: true, presenterName: null, presenterId: user.role === Role.ADMIN ? { not: null } : user.id },
      data: { presenterId: null }
    });
    return result.count === 1;
  }
  return false;
}
