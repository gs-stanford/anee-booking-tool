import assert from "node:assert/strict";
import { PrismaClient, Role } from "@prisma/client";
import { changeTeaPresenter, resolvePresenterId } from "../src/lib/tea-time";
import { serializeReservationCalendarItems, isAllDayReservation } from "../src/lib/reservation-calendar";
import { getLabDateKey, getLabTimeKey } from "../src/lib/lab-time";
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
    await db.instrument.update({ where: { id: instrument.id }, data: { status: "AVAILABLE" } });
    await saveCalendarBooking(db, user, { ...booking, startDate: "2027-01-09", endDate: "2027-01-10", startTime: "23:30", endTime: "02:00" }, undefined, now);
    const overnight = await db.reservation.findFirstOrThrow({ where: { instrumentId: instrument.id }, orderBy: { startAt: "desc" }, include: { instrument: true, user: true } });
    assert.deepEqual(serializeReservationCalendarItems([overnight]).map(item => item.date), ["2027-01-09", "2027-01-10"]);
    await assert.rejects(saveCalendarBooking(db, user, { ...booking, startDate: "2027-01-10", endDate: "2027-01-10", startTime: "01:00", endTime: "03:00" }, undefined, now));
    for (const [date, expectedHours] of [["2027-03-14", 23], ["2027-11-07", 25]] as const) {
      await saveCalendarBooking(db, user, { ...booking, allDay: "on", startDate: date, endDate: date, startTime: undefined, endTime: undefined }, undefined, now);
      const fullDay = await db.reservation.findFirstOrThrow({ where: { instrumentId: instrument.id, startAt: { gte: new Date(`${date}T00:00:00Z`) } }, orderBy: { startAt: "asc" }, include: { instrument: true, user: true } });
      assert.equal((fullDay.endAt.getTime() - fullDay.startAt.getTime()) / 3600000, expectedHours);
      assert.equal(isAllDayReservation(fullDay), true);
      assert.equal(getLabTimeKey(fullDay.startAt), "00:00");
      assert.deepEqual(serializeReservationCalendarItems([fullDay]).map(item => item.date), [date]);
      await assert.rejects(saveCalendarBooking(db, user, { ...booking, startDate: date, endDate: date, startTime: "01:00", endTime: "01:30" }, undefined, now));
    }
    await saveCalendarBooking(db, user, { ...event, allDay: "on", startDate: "2027-02-05", endDate: "2027-02-07" }, { id: saved.id, version: saved.version + 1 }, now);
    const multiDay = await db.labEvent.findUniqueOrThrow({ where: { id: saved.id } });
    assert.equal(getLabDateKey(multiDay.endAt), "2027-02-08");
    assert.equal(isAllDayReservation(multiDay), true);
    await assert.rejects(saveCalendarBooking(db, user, { ...event, allDay: "on", startDate: "2027-02-28", endDate: "2027-02-30" }, undefined, now));
    console.log("PASS: presenter ownership/reassignment/swaps, ambiguous names, stale edits, concurrent booking, unavailability, event permissions and time validation, overnight conflicts, multi-day events, midnight boundaries and 23/25-hour all-day bookings.");
  } finally {
    for (const session of original) await db.teaTimeSession.update({ where: { date: session.date }, data: session });
    await db.labEvent.deleteMany({ where: { title: { in: ["Test cross-impact", "Updated cross-impact"] }, ownerId: user.id } });
    await db.instrument.delete({ where: { id: instrument.id } });
    await db.user.delete({ where: { id: other.id } });
    await db.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
