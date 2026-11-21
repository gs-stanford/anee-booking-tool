import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { QUARTERS, quarterForDate, quarterSignupDates } from "../src/lib/academic-quarters";
import { validateSafetySlot } from "../src/lib/home-calendar";

async function main() {
  const before = new Date("2025-01-01T00:00:00Z");
  assert.equal(QUARTERS.length, 12);
  assert.equal(quarterForDate("2026-12-12"), undefined);
  assert.deepEqual(quarterSignupDates("2026-11-23", "09:00", before), ["2026-11-23", "2026-11-30", "2026-12-07"]);
  assert.deepEqual(quarterSignupDates("2026-12-11", "18:00", before), ["2026-12-11"]);
  assert.deepEqual(quarterSignupDates("2026-12-14", "09:00", before), []);
  assert.deepEqual(quarterSignupDates("2026-11-21", "09:00", before), []);
  assert.deepEqual(quarterSignupDates("2026-11-23", "09:00", new Date("2026-11-24T00:00Z")), ["2026-11-30", "2026-12-07"]);
  const leapDates = quarterSignupDates("2028-01-03", "09:00", before);
  assert.ok(leapDates.includes("2028-02-28"));
  assert.equal(leapDates.at(-1), "2028-03-13");
  assert.equal(validateSafetySlot("2028-03-06", "09:00")?.toISOString(), "2028-03-06T17:00:00.000Z");
  assert.equal(validateSafetySlot("2028-03-13", "09:00")?.toISOString(), "2028-03-13T16:00:00.000Z");
  for (const quarter of QUARTERS) assert.ok(quarter.start < quarter.end);
  if (process.env.DATABASE_URL !== "file:/private/tmp/lab-calendar-test.db") throw new Error("Use isolated test DB");
  const db = new PrismaClient();
  const user = await db.user.findUniqueOrThrow({ where: { email: "calendar-test@example.test" } });
  const seriesId = `quarter-test-${Date.now()}`;
  const dates = quarterSignupDates("2028-01-04", "18:00", before);
  try {
    await db.safetySignup.create({ data: { date: dates[2], time: "18:00", userId: user.id, seriesId } });
    await assert.rejects(db.$transaction(dates.map(date => db.safetySignup.create({ data: { date, time: "18:00", userId: user.id, seriesId } }))));
    assert.equal(await db.safetySignup.count({ where: { seriesId } }), 1, "Conflict rolls back whole series");
    await db.safetySignup.deleteMany({ where: { seriesId } });
    await db.$transaction(dates.map(date => db.safetySignup.create({ data: { date, time: "18:00", userId: user.id, seriesId } })));
    await db.safetySignup.deleteMany({ where: { seriesId, date: dates[2], userId: user.id } });
    assert.equal(await db.safetySignup.count({ where: { seriesId } }), dates.length - 1, "Single cancellation preserves other dates");
    await db.safetySignup.deleteMany({ where: { seriesId, date: { gt: dates[1] }, userId: user.id } });
    assert.equal(await db.safetySignup.count({ where: { seriesId } }), 2, "Remaining cancellation preserves history");
  } finally { await db.safetySignup.deleteMany({ where: { seriesId } }); await db.$disconnect(); }
  console.log("PASS: quarter boundaries, breaks, holidays, leap year, DST, transaction rollback, single and series cancellation.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
