import { test } from "node:test";
import assert from "node:assert/strict";
import { classesOn, weekType, localDate } from "../lib/calendar";
test("A/B parity works before and after the semester anchor", () => {
  assert.equal(weekType(new Date("2026-09-07T12:00"), "2026-09-07"), "A");
  assert.equal(weekType(new Date("2026-09-14T12:00"), "2026-09-07"), "B");
  assert.equal(weekType(new Date("2026-08-31T12:00"), "2026-09-07"), "B");
  assert.equal(weekType(new Date("2026-09-21T12:00"), "2026-09-07"), "A");
});
test("one-time and alternating classes only appear on applicable dates", () => {
  const rows = [
    { id: "a", weekday: 1, repeat: "A", start_time: "10:00" },
    { id: "b", weekday: 1, repeat: "B", start_time: "09:00" },
    { id: "every", weekday: 1, repeat: "every", start_time: "08:00" },
    { id: "once", repeat: "once", date: "2026-09-07", start_time: "07:00" },
  ];
  assert.deepEqual(
    classesOn(rows, new Date("2026-09-07T12:00"), "2026-09-07").map(
      (r) => r.id,
    ),
    ["once", "every", "a"],
  );
  assert.deepEqual(
    classesOn(rows, new Date("2026-09-14T12:00"), "2026-09-07").map(
      (r) => r.id,
    ),
    ["every", "b"],
  );
  assert.deepEqual(
    classesOn(rows, new Date("2026-09-08T12:00"), "2026-09-07"),
    [],
  );
});
test("local date preserves the calendar day", () =>
  assert.equal(localDate(new Date(2026, 8, 9, 23, 59)), "2026-09-09"));
test("recurring classes do not appear before their first date", () => {
  assert.equal(
    classesOn(
      [
        {
          id: "future",
          weekday: 1,
          repeat: "every",
          date: "2026-09-21",
          start_time: "09:00",
        },
      ],
      new Date("2026-09-07T12:00"),
      "2026-09-07",
    ).length,
    0,
  );
});
