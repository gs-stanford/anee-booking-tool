import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { isSharedImpact, validateSafetySlot } from "../src/lib/home-calendar";

async function main() {
  assert.equal(validateSafetySlot("2026-11-21", "09:00"), null, "No Saturday slots");
  assert.equal(validateSafetySlot("2026-11-22", "18:00"), null, "No Sunday slots");
  assert.equal(validateSafetySlot("2026-02-30", "09:00"), null, "Reject impossible dates");
  assert.equal(validateSafetySlot("2026-11-23", "10:00"), null, "Reject arbitrary times");
  assert.equal(validateSafetySlot("2026-11-23", "09:00")?.toISOString(), "2026-11-23T17:00:00.000Z");
  assert.equal(validateSafetySlot("2026-07-20", "18:00")?.toISOString(), "2026-07-21T01:00:00.000Z", "Honor daylight saving time");
  for (const impactCategory of ["LASER", "CNT_REACTOR", "FUMEHOOD"]) assert.ok(isSharedImpact({ impactCategory, crossShared: false }));
  assert.ok(isSharedImpact({ impactCategory: "GENERAL", crossShared: true }));
  assert.equal(isSharedImpact({ impactCategory: "GENERAL", crossShared: false }), false);
  // The database test is opt-in and only runs against an explicitly disposable database.
  if (process.env.DATABASE_URL !== "file:/private/tmp/lab-calendar-test.db") throw new Error("Use the isolated lab-calendar-test.db database");
  const db = new PrismaClient();
  try {
    const user = await db.user.upsert({
      where: { email: "calendar-test@example.test" },
      update: {},
      create: { name: "Calendar Test Member", email: "calendar-test@example.test", passwordHash: "no-login-test-fixture" }
    });
    const outcomes = await Promise.allSettled([1, 2].map(() => db.safetySignup.create({ data: { date: "2099-01-05", time: "09:00", userId: user.id } })));
    assert.equal(outcomes.filter(outcome => outcome.status === "fulfilled").length, 1, "Exactly one concurrent claim succeeds");
    assert.equal(await db.safetySignup.count({ where: { date: "2099-01-05", time: "09:00" } }), 1);
    assert.equal((await db.safetySignup.deleteMany({ where: { date: "2099-01-05", userId: "another-user" } })).count, 0, "Another member cannot release the slot");
    await db.safetySignup.deleteMany({ where: { date: "2099-01-05", userId: user.id } });
  } finally { await db.$disconnect(); }
  console.log("PASS: weekday/time/date validation, Pacific DST, impact filtering, atomic claims and ownership-scoped release.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
