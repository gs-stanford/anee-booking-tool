import assert from "node:assert/strict";
import { homeScheduleWeek, minimumHomeWeek, isUpcomingSafetySlot } from "../src/lib/home-schedule";
import { getStartOfLabWeekDateKey, shiftDateString } from "../src/lib/lab-time";
const beforeLaunch = new Date("2026-11-20T22:00:00Z");
assert.equal(shiftDateString(getStartOfLabWeekDateKey(beforeLaunch), homeScheduleWeek(0, beforeLaunch) * 7), "2027-01-03");
assert.equal(homeScheduleWeek(-100, beforeLaunch), minimumHomeWeek(beforeLaunch));
assert.equal(homeScheduleWeek(NaN, beforeLaunch), minimumHomeWeek(beforeLaunch));
assert.equal(isUpcomingSafetySlot("2026-12-07", "09:00", beforeLaunch), false);
assert.equal(isUpcomingSafetySlot("2027-01-04", "09:00", beforeLaunch), true);
const duringQuarter = new Date("2027-01-06T18:00:00Z"); // Wednesday 10 am Pacific
assert.equal(homeScheduleWeek(0, duringQuarter), 0);
assert.equal(isUpcomingSafetySlot("2027-01-04", "18:00", duringQuarter), false);
assert.equal(isUpcomingSafetySlot("2027-01-06", "09:00", duringQuarter), false);
assert.equal(isUpcomingSafetySlot("2027-01-06", "18:00", duringQuarter), true);
assert.equal(isUpcomingSafetySlot("2027-01-09", "09:00", duringQuarter), false);
assert.equal(isUpcomingSafetySlot("2027-01-06", "18:00", new Date("2027-01-07T02:00:00Z")), false);
console.log("PASS: Winter 2027 launch, navigation bounds, elapsed slots, Pacific times and weekends.");

assert.equal(getStartOfLabWeekDateKey(new Date("2027-01-10T20:00:00Z")), "2027-01-10");
assert.equal(getStartOfLabWeekDateKey(new Date("2027-01-09T20:00:00Z")), "2027-01-03");
assert.equal(isUpcomingSafetySlot("2027-01-08", "09:00", beforeLaunch), true);

// Viewing Today before launch must not change the separate booking boundary.
import {calendarNavigationWeek} from "../src/lib/calendar-navigation";
assert.equal(calendarNavigationWeek("2026-11-20",undefined,beforeLaunch),0);
assert.equal(calendarNavigationWeek(undefined,undefined,beforeLaunch),minimumHomeWeek(beforeLaunch));
assert.equal(calendarNavigationWeek(undefined,"0",beforeLaunch),0);
assert.equal(calendarNavigationWeek("2027-02-30",undefined,beforeLaunch),minimumHomeWeek(beforeLaunch));
assert.equal(calendarNavigationWeek("2027-01-18",undefined,beforeLaunch),9);
assert.equal(calendarNavigationWeek(undefined,"999",beforeLaunch),156);
assert.equal(calendarNavigationWeek("2026-01-01",undefined,beforeLaunch),0);
console.log("PASS: Today before launch, explicit week navigation, real-date validation and range limits.");
