import assert from "node:assert/strict";
import { PrismaClient, Role } from "@prisma/client";
import { changeTeaPresenter, resolvePresenterId } from "../src/lib/tea-time";
import { saveCalendarBooking } from "../src/lib/calendar-booking";
async function main() {
  if (process.env.DATABASE_URL !== "file:/private/tmp/lab-calendar-test.db") throw new Error("Use isolated DB");
  const db = new PrismaClient();
  const user = await db.user.findUniqueOrThrow({ where: { email: "calendar-test@example.test" } });
  const other = await db.user.create({ data: { name: "Other Test Presenter", email: `other-${Date.now()}@example.test`, passwordHash: "test-only" } });
  const original = await db.teaTimeSession.findMany({ where: { date: { in: ["2027-01-04", "2027-01-11"] } } });
  const instrument = await db.instrument.create({ data: { name: `Calendar test ${Date.now()}`, location: "Test", description: "Test", crossShared: true } });
  const now = new Date("2026-11-20T22:00:00Z");
  try {
    assert.equal(resolvePresenterId({ presenterId: null, presenterName: "Michael" }, [{ id: "one", name: "Michael Smith" }]), "one");
    assert.equal(resolvePresenterId({ presenterId: null, presenterName: "Michael" }, [{ id: "one", name: "Michael Smith" }, { id: "two", name: "Michael Jones" }]), null);
    await db.teaTimeSession.update({ where: { date: "2027-01-04" }, data: { presenterId: user.id, presenterName: null } });
    const source = await db.teaTimeSession.findUniqueOrThrow({ where: { date: "2027-01-04" } });
    const target = await db.teaTimeSession.findUniqueOrThrow({ where: { date: "2027-01-11" } });
    await assert.rejects(changeTeaPresenter(db, other, { date: source.date, version: source.version, presenterId: other.id }, now));
    await changeTeaPresenter(db, user, { date: source.date, version: source.version, swapDate: target.date, swapVersion: target.version }, now);
    assert.equal((await db.teaTimeSession.findUniqueOrThrow({ where: { date: target.date } })).presenterId, user.id);
    assert.equal((await db.teaTimeSession.findUniqueOrThrow({ where: { date: source.date } })).presenterName, target.presenterName);
    await assert.rejects(changeTeaPresenter(db, { ...user, role: Role.ADMIN }, { date: source.date, version: source.version, presenterId: other.id }, now), "Stale version rejected");
    const swapped = await db.teaTimeSession.findUniqueOrThrow({ where: { date: target.date } });
    await changeTeaPresenter(db, user, { date: target.date, version: swapped.version, presenterId: other.id }, now);
    assert.equal((await db.teaTimeSession.findUniqueOrThrow({ where: { date: target.date } })).presenterId, other.id);
    const booking = { kind: "instrument", instrumentId: instrument.id, startDate: "2027-01-04", endDate: "2027-01-04", startTime: "10:00", endTime: "11:00" };
    const race = await Promise.allSettled([user, other].map(member => saveCalendarBooking(db, member, booking, undefined, now)));
    assert.equal(race.filter(r => r.status === "fulfilled").length, 1);
    assert.equal(await db.reservation.count({ where: { instrumentId: instrument.id } }), 1);
    await assert.rejects(saveCalendarBooking(db, user, { ...booking, startTime: "10:30" }, undefined, now));
    await db.instrument.update({ where: { id: instrument.id }, data: { status: "UNAVAILABLE" } });
    await assert.rejects(saveCalendarBooking(db, user, { ...booking, startTime: "12:00", endTime: "13:00" }, undefined, now));
    const event = { ...booking, kind: "event", title: "Test cross-impact", location: "Test bay", impact: "Keep area clear" };
    await saveCalendarBooking(db, user, event, undefined, now);
    const saved = await db.labEvent.findFirstOrThrow({ where: { ownerId: user.id, title: event.title } });
    await assert.rejects(saveCalendarBooking(db, other, event, { id: saved.id, version: saved.version }, now));
    await saveCalendarBooking(db, user, { ...event, title: "Updated cross-impact" }, { id: saved.id, version: saved.version }, now);
    await assert.rejects(saveCalendarBooking(db, user, event, { id: saved.id, version: saved.version }, now));
    await assert.rejects(saveCalendarBooking(db, { ...user, role: Role.TEMP }, event, undefined, now));
    await assert.rejects(saveCalendarBooking(db, user, { ...event, startDate: "2027-02-30" }, undefined, now));
    await assert.rejects(saveCalendarBooking(db, user, { ...event, endTime: "09:00" }, undefined, now));
    console.log("PASS: presenter ownership/reassignment/swaps, ambiguous names, stale edits, concurrent booking, unavailability, event permissions and time validation.");
  } finally {
    for (const session of original) await db.teaTimeSession.update({ where: { date: session.date }, data: session });
    await db.labEvent.deleteMany({ where: { title: { in: ["Test cross-impact", "Updated cross-impact"] }, ownerId: user.id } });
    await db.instrument.delete({ where: { id: instrument.id } });
    await db.user.delete({ where: { id: other.id } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
