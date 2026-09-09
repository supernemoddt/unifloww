"use client";
import { useState } from "react";
import { Trash2, Check, Upload } from "lucide-react";
import { localDate } from "@/lib/calendar";
import type { Table, Row, Data, Profile } from "@/lib/types";
const text = (r: Record<string, unknown>, k: string) => String(r[k] ?? "");
export default function RecordForm({
  kind,
  row,
  subjectId,
  data,
  profile,
  admin,
  busy,
  date,
  editable,
  onSubmit,
  onDelete,
}: {
  kind: Table;
  row?: Row;
  subjectId?: string;
  data: Data;
  profile: Profile;
  admin: boolean;
  demo: boolean;
  busy: boolean;
  date: string;
  editable: boolean;
  onSubmit: (row: Row, file?: File) => Promise<void>;
  onDelete: () => void;
}) {
  const defaultSubject = data.subjects.find(
    (s) => s.id === (row?.subject_id || subjectId),
  );
  const [scope, setScope] = useState(
    String(
      row?.group_id ||
        defaultSubject?.group_id ||
        (kind === "announcements" ? data.groups[0]?.id : "") ||
        "",
    ),
  );
  const [formError, setFormError] = useState("");
  const field = (
    label: string,
    name: string,
    type = "text",
    required = false,
    defaultVal?: string,
  ) => (
    <label>
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={row ? text(row, name) : defaultVal}
        maxLength={type === "text" ? 300 : undefined}
      />
    </label>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const values = Object.fromEntries(fd.entries());
        const value = (k: string) => String(values[k] || "");
        const out: Row = {
          ...(row || {}),
          id: row?.id || crypto.randomUUID(),
          owner_id: row?.owner_id || profile.id,
          group_id: scope || null,
        };
        setFormError("");
        if (kind === "files") {
          out.name = value("name") || (values.file as File)?.name;
          out.subject_id = value("subject_id") || null;
          out.assignment_id = value("assignment_id") || null;
        } else if (kind === "subjects") {
          Object.assign(out, {
            name: value("name"),
            teacher: value("teacher"),
            classroom: value("classroom"),
            description: value("description"),
            color: value("color"),
          });
        } else {
          out.title = value("title");
          if (kind !== "announcements")
            out.subject_id = value("subject_id") || null;
          if (kind === "assignments")
            Object.assign(out, {
              description: value("description"),
              deadline: value("deadline"),
              priority: value("priority"),
              status: row?.status || "Not started",
            });
          else if (kind === "classes") {
            if (value("end_time") <= value("start_time")) {
              setFormError("Class end must be after its start.");
              return;
            }
            Object.assign(out, {
              teacher: value("teacher"),
              classroom: value("classroom"),
              date: value("date"),
              weekday: new Date(value("date") + "T12:00").getDay(),
              repeat: value("repeat"),
              start_time: value("start_time"),
              end_time: value("end_time"),
              type: value("type"),
              body: value("body"),
            });
          } else out.body = value("body");
        }
        const file =
          values.file instanceof File && values.file.size
            ? values.file
            : undefined;
        if (
          file &&
          (file.size > 20971520 ||
            ![
              "application/pdf",
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              "image/jpeg",
              "image/png",
              "image/webp",
            ].includes(file.type))
        ) {
          setFormError(
            "Choose a PDF, DOCX, JPG, PNG, or WebP file up to 20 MB.",
          );
          return;
        }
        void onSubmit(out, file);
      }}
    >
      <fieldset disabled={!editable || busy}>
        {field(
          kind === "subjects"
            ? "Subject name"
            : kind === "files"
              ? "File name"
              : "Title",
          kind === "subjects" || kind === "files" ? "name" : "title",
          "text",
          kind !== "files" || !!row,
        )}
        {kind !== "announcements" && (
          <label>
            Visibility
            <select
              value={scope}
              disabled={!!row}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="">Private · only me</option>
              {(!["classes", "subjects"].includes(kind) || admin) &&
                data.groups.map((g) => (
                  <option value={g.id} key={g.id}>
                    Group · {g.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        {!["subjects", "announcements"].includes(kind) && (
          <label>
            Subject
            <select
              key={scope}
              name="subject_id"
              defaultValue={(row?.subject_id as string) || subjectId || ""}
            >
              <option value="">No subject</option>
              {data.subjects
                .filter((s) => (s.group_id || "") === scope)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        {kind === "subjects" && (
          <>
            {field("Teacher", "teacher")}
            {field("Classroom", "classroom")}
            {field("Subject color", "color", "color", true, "#6264d9")}
            <label>
              Description
              <textarea
                name="description"
                rows={4}
                defaultValue={text(row || {}, "description")}
              />
            </label>
          </>
        )}
        {kind === "assignments" && (
          <>
            <label>
              Description
              <textarea
                name="description"
                rows={4}
                defaultValue={text(row || {}, "description")}
              />
            </label>
            <div className="form-grid">
              {field(
                "Deadline",
                "deadline",
                "date",
                true,
                localDate(new Date()),
              )}
              <label>
                Priority
                <select
                  name="priority"
                  defaultValue={text(row || {}, "priority") || "Medium"}
                >
                  {["Low", "Medium", "High"].map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
            </div>
            {row && (
              <p className="muted">
                Use the assignment checkbox to update your personal completion.
                Attach files from Files → Upload and select this assignment.
              </p>
            )}
          </>
        )}
        {kind === "classes" && (
          <>
            <div className="form-grid">
              {field("Teacher", "teacher")}
              {field("Classroom", "classroom")}
              {field("First class date", "date", "date", true, date)}
              <label>
                Repeats
                <select
                  name="repeat"
                  defaultValue={text(row || {}, "repeat") || "every"}
                >
                  <option value="every">Every week</option>
                  <option value="A">Week A only</option>
                  <option value="B">Week B only</option>
                  <option value="once">Does not repeat</option>
                </select>
              </label>
              {field("Start time", "start_time", "time", true, "09:00")}
              {field("End time", "end_time", "time", true, "10:20")}
            </div>
            <label>
              Class type
              <select
                name="type"
                defaultValue={text(row || {}, "type") || "Lecture"}
              >
                {["Lecture", "Seminar", "Lab"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Notes
              <textarea
                name="body"
                rows={3}
                defaultValue={text(row || {}, "body")}
              />
            </label>
          </>
        )}
        {["notes", "announcements"].includes(kind) && (
          <label>
            {kind === "notes" ? "Note" : "Announcement"}
            <textarea
              name="body"
              rows={9}
              required
              defaultValue={text(row || {}, "body")}
            />
          </label>
        )}
        {kind === "files" && (
          <>
            <label>
              Assignment attachment
              <select
                name="assignment_id"
                defaultValue={text(row || {}, "assignment_id")}
              >
                <option value="">None</option>
                {data.assignments
                  .filter((a) => (a.group_id || "") === scope)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
              </select>
            </label>
            {!row && (
              <label className="upload-zone">
                <Upload size={27} />
                <strong>Choose a material to upload</strong>
                <span>PDF, DOCX, JPG, PNG, WebP · up to 20 MB</span>
                <input
                  name="file"
                  type="file"
                  accept=".pdf,.docx,.jpg,.jpeg,.png,.webp"
                  required
                />
              </label>
            )}
          </>
        )}
        {editable && (
          <div className="form-footer">
            {row && (
              <button
                type="button"
                className="button danger"
                onClick={onDelete}
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
            <button className="button primary" disabled={busy}>
              {busy
                ? "Saving…"
                : "Save " +
                  (
                    {
                      assignments: "assignment",
                      classes: "class",
                      subjects: "subject",
                      notes: "note",
                      files: "material",
                      announcements: "announcement",
                    } as Record<string, string>
                  )[kind]}
              <Check size={16} />
            </button>
          </div>
        )}
      </fieldset>
      {!editable && (
        <p className="muted">
          This is shared content. Its creator or a group administrator can edit
          it.
        </p>
      )}
      {formError && (
        <p role="alert" className="error">
          {formError}
        </p>
      )}
    </form>
  );
}
