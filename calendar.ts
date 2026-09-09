import type { Row } from "./types";
export function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function weekType(date: Date, anchor: string) {
  const utc = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const start = new Date(anchor + "T12:00:00");
  return ((Math.floor((utc(date) - utc(start)) / 604800000) % 2) + 2) % 2 === 0
    ? "A"
    : "B";
}
export function classesOn(rows: Row[], date: Date, anchor: string) {
  return rows
    .filter((r) =>
      r.repeat === "once"
        ? r.date === localDate(date)
        : (!r.date || String(r.date) <= localDate(date)) &&
          Number(r.weekday) === date.getDay() &&
          (r.repeat === "every" || r.repeat === weekType(date, anchor)),
    )
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
}
export function dueLabel(value: unknown) {
  if (!value) return "No deadline";
  const d = new Date(String(value) + "T12:00:00");
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  const days = Math.round((d.getTime() - now.getTime()) / 86400000);
  return days < 0
    ? `${-days}d overdue`
    : days === 0
      ? "Today"
      : days === 1
        ? "Tomorrow"
        : `In ${days} days`;
}
