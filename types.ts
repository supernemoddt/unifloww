export type Row = {
  id: string;
  owner_id?: string;
  group_id?: string | null;
  subject_id?: string | null;
  title?: string;
  name?: string;
  description?: string;
  body?: string;
  created_at?: string;
  [key: string]: unknown;
};
export type Profile = {
  id: string;
  first_name: string;
  university: string;
  program: string;
  year: number;
  week_a_start: string;
};
export const tables = [
  "subjects",
  "classes",
  "assignments",
  "assignment_members",
  "notes",
  "files",
  "groups",
  "group_members",
  "announcements",
  "notifications",
  "activity_log",
] as const;
export type Table = (typeof tables)[number];
export type Data = Record<Table, Row[]>;
export const emptyData = (): Data => ({
  subjects: [],
  classes: [],
  assignments: [],
  assignment_members: [],
  notes: [],
  files: [],
  groups: [],
  group_members: [],
  announcements: [],
  notifications: [],
  activity_log: [],
});
