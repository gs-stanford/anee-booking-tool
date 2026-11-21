import assert from "node:assert/strict";
import { PrismaClient, Role } from "@prisma/client";
import { teaTimeIsUpcoming, updateTeaTimeSignup } from "../src/lib/tea-time";
import { parseLabDateTime } from "../src/lib/lab-time";
async function main() {
  if (process.env.DATABASE_URL !== "file:/private/tmp/lab-calendar-test.db") throw new Error("Use isolated test database");
  const db = new PrismaClient();
  const now = new Date("2026-11-20T22:00:00Z");
  try {
    const sessions = await db.teaTimeSession.findMany({ orderBy: { date: "asc" } });
    assert.equal(sessions.length, 10);
    assert.equal(sessions.filter(s => s.signupEnabled).length, 1);
    assert.equal(sessions.find(s => s.signupEnabled)?.date, "2027-03-29");
    assert.ok(sessions.every(s => new Date(`${s.date}T12:00:00Z`).getUTCDay() === 1));
    const user = await db.user.findUniqueOrThrow({ where: { email: "calendar-test@example.test" } });
    assert.equal(await updateTeaTimeSignup(db, user, "2027-01-04", "claim", now), false, "Fixed presenter cannot be replaced");
    assert.equal(await updateTeaTimeSignup(db, user, "2027-01-18", "claim", now), false, "No invented meetings");
    assert.equal(await updateTeaTimeSignup(db, { ...user, role: Role.TEMP }, "2027-03-29", "claim", now), false);
    const claims = await Promise.all([1, 2].map(() => updateTeaTimeSignup(db, user, "2027-03-29", "claim", now)));
    assert.equal(claims.filter(Boolean).length, 1, "Only one concurrent claim succeeds");
    assert.equal(await updateTeaTimeSignup(db, { id: "other-member", role: Role.MEMBER }, "2027-03-29", "release", now), false);
    assert.equal(await updateTeaTimeSignup(db, user, "2027-03-29", "release", now), true);
    assert.equal(await updateTeaTimeSignup(db, user, "2027-03-29", "claim", new Date("2027-03-29T20:00:00Z")), false, "Closed when meeting begins");
    assert.equal(parseLabDateTime("2027-01-04", "13:00").toISOString(), "2027-01-04T21:00:00.000Z");
    assert.equal(parseLabDateTime("2027-03-29", "13:00").toISOString(), "2027-03-29T20:00:00.000Z");
    assert.equal(teaTimeIsUpcoming("2027-03-29", new Date("2027-03-29T20:30:00Z")), true);
    assert.equal(teaTimeIsUpcoming("2027-03-29", new Date("2027-03-29T21:00:00Z")), false);
    console.log("PASS: exact schedule, fixed presenters, concurrent signup, ownership, cancellation, DST and elapsed meetings.");
  } finally { await db.teaTimeSession.updateMany({ where: { date: "2027-03-29" }, data: { presenterId: null } }); await db.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
