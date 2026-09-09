import { emptyData, type Profile } from "./types";
import { localDate } from "./calendar";
export function demoWorkspace() {
  const data = emptyData();
  const day = new Date();
  const due = (n: number) => {
    const d = new Date(day);
    d.setDate(d.getDate() + n);
    return localDate(d);
  };
  const profile: Profile = {
    id: "demo-user",
    first_name: "Oleksandr",
    university: "National University",
    program: "Law",
    year: 1,
    week_a_start: "2026-09-07",
  };
  data.groups = [
    {
      id: "demo-group",
      owner_id: profile.id,
      name: "PR-11",
      invite_code: "DEMO-ONLY",
    },
  ];
  data.group_members = [
    {
      id: "demo-member",
      group_id: "demo-group",
      user_id: profile.id,
      role: "owner",
    },
  ];
  data.subjects = [
    "History of State and Law",
    "Professional English",
    "Professional Ukrainian",
    "Theory & Philosophy of Law",
  ].map((name, i) => ({
    id: `subject-${i}`,
    owner_id: profile.id,
    group_id: null,
    name,
    teacher: [
      "Dr. I. Kovalenko",
      "Ms. O. Bondar",
      "Dr. L. Melnyk",
      "Prof. A. Shevchenko",
    ][i],
    classroom: ["204", "312", "108", "201"][i],
    color: ["#7776d8", "#c18449", "#598f8b", "#bd6d87"][i],
    description:
      "Course materials, assignments, and everything you need for class.",
  }));
  data.classes = [
    ["09:00", "10:20", 0, "Lecture"],
    ["10:40", "12:00", 1, "Seminar"],
    ["13:00", "14:20", 3, "Lecture"],
  ].map(([start, end, sub, type], i) => ({
    id: `class-${i}`,
    owner_id: profile.id,
    group_id: null,
    subject_id: `subject-${sub}`,
    title: data.subjects[Number(sub)].name,
    start_time: start,
    end_time: end,
    weekday: day.getDay(),
    date: due(0),
    repeat: "every",
    type,
    teacher: data.subjects[Number(sub)].teacher,
    classroom: data.subjects[Number(sub)].classroom,
  }));
  data.assignments = [
    ["Prepare questions 1–5", 0, 1, "High"],
    ["Complete exercises 4–7", 1, 3, "Medium"],
    ["Read: foundations of human rights", 3, 5, "Medium"],
    ["Review lecture notes", 0, 0, "Low"],
  ].map(([title, sub, n, priority], i) => ({
    id: `task-${i}`,
    owner_id: profile.id,
    group_id: null,
    subject_id: `subject-${sub}`,
    title: String(title),
    deadline: due(Number(n)),
    priority,
    status: "Not started",
    description:
      "Review the course material and bring your notes to the next class.",
  }));
  data.notes = [
    {
      id: "demo-note",
      owner_id: profile.id,
      group_id: null,
      subject_id: "subject-0",
      title: "Sources of law — lecture notes",
      body: "Primary sources: legislation, precedent, and custom.\n\nReview the relationship between legal systems and historical context.",
      created_at: day.toISOString(),
    },
  ];
  return { data, profile };
}
