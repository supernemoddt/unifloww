"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  BookOpen,
  Users,
  Layers,
  FolderOpen,
  Settings,
  Search,
  Bell,
  Plus,
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  MoreHorizontal,
  Check,
  FileText,
  Upload,
  LogOut,
  Sun,
  GraduationCap,
  PanelLeftClose,
  Sparkles,
  Download,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { configured, supabase } from "@/lib/supabase";
import {
  tables,
  emptyData,
  type Data,
  type Table,
  type Row,
  type Profile,
} from "@/lib/types";
import { classesOn, dueLabel, localDate, weekType } from "@/lib/calendar";
import { demoWorkspace } from "@/lib/demo";
import Modal from "./modal";
import RecordForm from "./record-form";
const nav = [
  ["Dashboard", "/", LayoutDashboard],
  ["Schedule", "/schedule", CalendarDays],
  ["Tasks", "/tasks", CheckSquare],
  ["Subjects", "/subjects", BookOpen],
  ["Group", "/group", Users],
  ["Study", "/study", Layers],
  ["Files", "/files", FolderOpen],
  ["Settings", "/settings", Settings],
] as const;
const text = (r: Record<string, unknown>, k: string) => String(r[k] ?? "");
const initialProfile: Profile = {
  id: "",
  first_name: "",
  university: "",
  program: "",
  year: 1,
  week_a_start: "2026-09-07",
};
export default function Workspace() {
  const pathname = usePathname();
  const router = useRouter();
  const section = pathname.split("/")[1] || "dashboard";
  const [data, setData] = useState<Data>(emptyData);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<{
    kind: string;
    row?: Row;
    subject?: string;
  } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedDate, setSelectedDate] = useState(localDate(new Date()));
  const [calendarView, setCalendarView] = useState("Week");
  const [theme, setTheme] = useState("");
  const [subjectTab, setSubjectTab] = useState("Overview");
  const [groupTab, setGroupTab] = useState("Overview");
  const [aiResult, setAiResult] = useState("");
  const [studyAction, setStudyAction] = useState("Summarize material");
  const [now, setNow] = useState(new Date());
  const activeGroup = data.groups[0];
  const role = data.group_members.find(
    (m) => m.user_id === profile.id && m.group_id === activeGroup?.id,
  )?.role;
  const admin = role === "owner" || role === "admin";
  const reload = useCallback(async () => {
    const client = supabase();
    const results = await Promise.all(
      tables.map((t) => client.from(t).select("*")),
    );
    const next = emptyData();
    results.forEach((r, i) => {
      if (r.error) throw r.error;
      next[tables[i]] = r.data ?? [];
    });
    setData(next);
    const { data: p, error: e } = await client.from("profiles").select("*");
    if (e) throw e;
    setMembers(p ?? []);
  }, [setData, setMembers]);
  useEffect(() => {
    let live = true;
    async function init() {
      try {
        const saved = sessionStorage.getItem("uniflow-demo");
        if (saved) {
          const parsed = JSON.parse(saved);
          setDemo(true);
          setProfile(parsed.profile);
          setData(parsed.data);
          return;
        }
        if (!configured) return;
        const client = supabase();
        const {
          data: { user },
          error: e,
        } = await client.auth.getUser();
        if (e && e.name !== "AuthSessionMissingError") throw e;
        if (user && live) {
          const { data: p, error: pe } = await client
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          if (pe) throw pe;
          setProfile(p);
          await client.rpc("refresh_deadlines");
          await reload();
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not load your workspace.",
        );
      } finally {
        if (live) setLoading(false);
      }
    }
    void init();
    return () => {
      live = false;
    };
  }, [reload]);
  useEffect(() => {
    if (demo)
      sessionStorage.setItem("uniflow-demo", JSON.stringify({ data, profile }));
  }, [data, profile, demo]);
  useEffect(() => {
    if (!profile.id || demo || !configured) return;
    const client = supabase();
    let channel = client.channel("workspace");
    for (const table of tables)
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          void reload().catch((e) => setError(e.message));
        },
      );
    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [profile.id, demo, reload]);
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setModal({ kind: "search" });
      }
    };
    window.addEventListener("keydown", handle);
    if (location.pathname.startsWith("/join/"))
      sessionStorage.setItem("uniflow-invite", location.pathname);
    const timer = setInterval(() => setNow(new Date()), 30000);
    const stored = localStorage.getItem("uniflow-theme") || "system";
    setTheme(stored);
    return () => {
      window.removeEventListener("keydown", handle);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!theme) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === "system" ? (mq.matches ? "dark" : "light") : theme);
    apply();
    localStorage.setItem("uniflow-theme", theme);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js");
  }, []);
  const report = (e: unknown) =>
    setError(
      e instanceof Error
        ? e.message
        : typeof e === "object" && e && "message" in e
          ? String(e.message)
          : "The change could not be saved.",
    );
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      report(e);
    } finally {
      setBusy(false);
    }
  }
  async function save(table: Table, row: Row) {
    if (demo) {
      setData((d) => ({
        ...d,
        [table]: [...d[table].filter((x) => x.id !== row.id), row],
      }));
      return;
    }
    const source = supabase().from(table);
    const mutation =
      table === "assignment_members"
        ? source.upsert(row, { onConflict: "assignment_id,user_id" })
        : data[table].some((item) => item.id === row.id)
          ? source.update(row).eq("id", row.id)
          : source.insert(row);
    const { error: e } = await mutation.select("id").single();
    if (e) throw e;
    await reload();
  }
  async function remove(table: Table, row: Row) {
    if (
      !window.confirm(
        `Delete “${row.title || row.name || "this item"}”? This cannot be undone.`,
      )
    )
      return;
    await run(async () => {
      if (demo) {
        setData((d) => ({
          ...d,
          [table]: d[table].filter((x) => x.id !== row.id),
        }));
        setModal(null);
        return;
      }
      if (table === "files") {
        const { error: e } = await supabase()
          .storage.from("materials")
          .remove([text(row, "path")]);
        if (e) throw e;
      }
      const { error: e } = await supabase()
        .from(table)
        .delete()
        .eq("id", row.id);
      if (e) throw e;
      await reload();
      setModal(null);
    });
  }
  function startDemo() {
    const seeded = demoWorkspace();
    setDemo(true);
    setData(seeded.data);
    setProfile(seeded.profile);
    router.push("/");
  }
  const status = (task: Row) =>
    text(
      data.assignment_members.find(
        (m) => m.assignment_id === task.id && m.user_id === profile.id,
      ) || task,
      "status",
    );
  const tasks = [...data.assignments].sort((a, b) =>
    text(a, "deadline").localeCompare(text(b, "deadline")),
  );
  const visibleTasks = tasks.filter(
    (t) =>
      filter === "All" ||
      (filter === "Completed" && status(t) === "Done") ||
      (status(t) !== "Done" &&
        ((filter === "Today" && t.deadline === localDate(now)) ||
          (filter === "Upcoming" && text(t, "deadline") > localDate(now)) ||
          (filter === "Overdue" && text(t, "deadline") < localDate(now)))),
  );
  const openTasks = tasks.filter((t) => status(t) !== "Done");
  const todaysClasses = classesOn(data.classes, now, profile.week_a_start);
  const mins = now.getHours() * 60 + now.getMinutes();
  const classMins = (s: unknown) => {
    const [h, m] = String(s).split(":").map(Number);
    return h * 60 + m;
  };
  const nextClass = todaysClasses.find((c) => classMins(c.start_time) > mins);
  const currentClass = todaysClasses.find(
    (c) => classMins(c.start_time) <= mins && classMins(c.end_time) > mins,
  );
  const subject = (r: Row) => data.subjects.find((s) => s.id === r.subject_id);
  const canEdit = (r: Row, restricted = false) => {
    const member = data.group_members.find(
      (m) => m.user_id === profile.id && m.group_id === r.group_id,
    );
    const manages = member?.role === "owner" || member?.role === "admin";
    return !r.group_id
      ? r.owner_id === profile.id
      : !!member && (manages || (!restricted && r.owner_id === profile.id));
  };
  const openForm = (kind: string, row?: Row, subject?: string) => {
    setError("");
    setModal({ kind, row, subject });
  };
  async function complete(task: Row) {
    await run(() =>
      save("assignment_members", {
        id:
          data.assignment_members.find(
            (m) => m.assignment_id === task.id && m.user_id === profile.id,
          )?.id || crypto.randomUUID(),
        assignment_id: task.id,
        user_id: profile.id,
        status: status(task) === "Done" ? "Not started" : "Done",
      }),
    );
  }
  function taskRow(task: Row) {
    return (
      <div className="task-row" key={task.id}>
        <button
          className={`checkbox ${status(task) === "Done" ? "checked" : ""}`}
          aria-label={`${status(task) === "Done" ? "Reopen" : "Complete"} ${task.title}`}
          onClick={() => void complete(task)}
        >
          {status(task) === "Done" && <Check size={14} />}
        </button>
        <button
          className="task-content"
          onClick={() => openForm("assignments", task)}
        >
          <strong className={status(task) === "Done" ? "done" : ""}>
            {task.title}
          </strong>
          <span>
            <i
              style={{
                background: text(subject(task) || {}, "color") || "#7776d8",
              }}
            />
            {subject(task)?.name || "No subject"}
            {task.group_id && " · Group"}
          </span>
        </button>
        <span
          className={`due ${text(task, "deadline") <= localDate(now) ? "urgent" : ""}`}
        >
          {dueLabel(task.deadline)}
        </span>
        <select
          className="task-status"
          aria-label={`Status for ${task.title}`}
          value={status(task)}
          onChange={(e) =>
            void run(() =>
              save("assignment_members", {
                id:
                  data.assignment_members.find(
                    (m) =>
                      m.assignment_id === task.id && m.user_id === profile.id,
                  )?.id || crypto.randomUUID(),
                assignment_id: task.id,
                user_id: profile.id,
                status: e.target.value,
              }),
            )
          }
        >
          {["Not started", "In progress", "Done"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span
          className={`priority ${text(task, "priority").toLowerCase()}`}
          title={text(task, "priority") + " priority"}
        >
          ⚑
        </span>
      </div>
    );
  }
  function empty(
    title: string,
    body: string,
    action?: () => void,
    label = "Add your first item",
  ) {
    return (
      <div className="empty">
        <BookOpen size={28} />
        <h3>{title}</h3>
        <p>{body}</p>
        {action && (
          <button className="button secondary" onClick={action}>
            <Plus size={16} />
            {label}
          </button>
        )}
      </div>
    );
  }
  function classCard(c: Row) {
    const current =
      currentClass?.id === c.id && selectedDate === localDate(now);
    return (
      <button
        key={c.id}
        className={`class-card ${current ? "current" : ""}`}
        style={{
          borderLeftColor: text(subject(c) || {}, "color") || "#6264d9",
        }}
        onClick={() => openForm("classes", c)}
      >
        <span className="class-top">
          {text(c, "type")}{" "}
          {current ? (
            <b>NOW</b>
          ) : nextClass?.id === c.id && selectedDate === localDate(now) ? (
            <b>NEXT UP</b>
          ) : null}
        </span>
        <strong>{c.title}</strong>
        <span>
          {text(c, "start_time").slice(0, 5)} –{" "}
          {text(c, "end_time").slice(0, 5)}
        </span>
        <span>
          <MapPin size={13} /> {text(c, "classroom") || "Room TBD"} <em>·</em>{" "}
          {text(c, "teacher")}
        </span>
      </button>
    );
  }
  function fileRow(file: Row) {
    return (
      <div className="file-row" key={file.id}>
        <div className="file-icon">
          <FileText size={22} />
        </div>
        <div className="grow">
          <strong>{file.name}</strong>
          <small>
            {subject(file)?.name || "Unsorted"} ·{" "}
            {(Number(file.size) / 1024).toFixed(0)} KB{" "}
            {file.group_id ? "· Shared" : ""}
          </small>
        </div>
        <button
          className="icon-button"
          aria-label={`Download ${file.name}`}
          onClick={() =>
            void run(async () => {
              if (demo) {
                setNotice(
                  "Demo files are not uploaded. Sign in to store materials securely.",
                );
                return;
              }
              const { data: link, error: e } = await supabase()
                .storage.from("materials")
                .createSignedUrl(text(file, "path"), 60, {
                  download: text(file, "name"),
                });
              if (e) throw e;
              window.open(link.signedUrl, "_blank", "noopener,noreferrer");
            })
          }
        >
          <Download size={17} />
        </button>
        {canEdit(file) && (
          <>
            <button
              className="icon-button"
              aria-label="Edit file"
              onClick={() => openForm("files", file)}
            >
              <Pencil size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Delete file"
              onClick={() => void remove("files", file)}
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    );
  }
  if (loading)
    return (
      <div className="loading">
        <div className="brand">
          <span className="brand-icon">
            <Layers />
          </span>
          UniFlow
        </div>
        <div className="skeleton" />
        <div className="skeleton" />
        <p>Opening your workspace…</p>
      </div>
    );
  if (
    !profile.id ||
    ["sign-in", "sign-up", "forgot-password", "reset-password"].includes(
      section,
    )
  )
    return (
      <main className="auth-layout">
        <div className="auth-story">
          <div className="brand">
            <span className="brand-icon">
              <Layers />
            </span>
            UniFlow
          </div>
          <div>
            <span className="eyebrow">A LITTLE LESS CHAOS.</span>
            <h1>
              Make room
              <br />
              for learning.
            </h1>
            <p>
              Your classes, deadlines, and study materials.
              <br />
              Finally, in the same place.
            </p>
            <div className="auth-line">
              <BookOpen /> Your university life, in flow.
            </div>
          </div>
          <small>Built around your student day.</small>
        </div>
        <div className="auth">
          <div className="brand mobile-brand">
            <Layers /> UniFlow
          </div>
          <span className="eyebrow">YOUR WORKSPACE AWAITS</span>
          <h1>
            {section === "sign-up"
              ? "Start a calmer semester"
              : section === "forgot-password"
                ? "Reset your password"
                : section === "reset-password"
                  ? "Choose a new password"
                  : "Welcome back"}
          </h1>
          <p>
            {section === "sign-up"
              ? "One place for everything you’re learning."
              : "Pick up where you left off."}
          </p>
          {!configured && (
            <div className="banner">
              Connect Supabase to enable accounts. You can explore the optional
              demo below.
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              void run(async () => {
                if (!configured)
                  throw new Error(
                    "Set the Supabase environment variables in .env.local first.",
                  );
                const client = supabase();
                const email = String(fd.get("email"));
                const password = String(fd.get("password"));
                let result;
                if (section === "sign-up")
                  result = await client.auth.signUp({
                    email,
                    password,
                    options: {
                      emailRedirectTo:
                        location.origin +
                        "/auth/callback?next=" +
                        encodeURIComponent(
                          sessionStorage.getItem("uniflow-invite") || "/",
                        ),
                    },
                  });
                else if (section === "forgot-password")
                  result = await client.auth.resetPasswordForEmail(email, {
                    redirectTo:
                      location.origin + "/auth/callback?recovery=true",
                  });
                else if (section === "reset-password")
                  result = await client.auth.updateUser({ password });
                else
                  result = await client.auth.signInWithPassword({
                    email,
                    password,
                  });
                if (result.error) throw result.error;
                if (section === "sign-up" || section === "forgot-password") {
                  setNotice("Check your email for the next step.");
                } else {
                  const {
                    data: { user },
                  } = await client.auth.getUser();
                  if (user) {
                    const { data: p, error: pe } = await client
                      .from("profiles")
                      .select("*")
                      .eq("id", user.id)
                      .single();
                    if (pe) throw pe;
                    setProfile(p);
                    await reload();
                  }
                  router.push(sessionStorage.getItem("uniflow-invite") || "/");
                }
              });
            }}
          >
            {section !== "reset-password" && (
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@university.edu"
                  required
                />
              </label>
            )}
            {section !== "forgot-password" && (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete={
                    section === "sign-in" ? "current-password" : "new-password"
                  }
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                />
              </label>
            )}
            <button className="button primary" disabled={busy || !configured}>
              {busy
                ? "Please wait…"
                : section === "sign-up"
                  ? "Create account"
                  : section.includes("password")
                    ? "Continue"
                    : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          <div className="auth-links">
            <Link href="/forgot-password">Forgot password?</Link>
            <Link href={section === "sign-up" ? "/sign-in" : "/sign-up"}>
              {section === "sign-up" ? "Sign in" : "Create an account"}
            </Link>
          </div>
          {(!configured || process.env.NEXT_PUBLIC_ENABLE_DEMO === "true") && (
            <button className="button secondary" onClick={startDemo}>
              Explore demo workspace <ArrowUpRight size={16} />
            </button>
          )}
        </div>
      </main>
    );
  if (!profile.first_name)
    return (
      <main className="auth">
        <div className="brand">
          <Layers /> UniFlow
        </div>
        <h1>Make yourself at home.</h1>
        <p>A few details to personalize your semester.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            void run(async () => {
              const p = {
                ...profile,
                first_name: String(fd.get("first_name")),
                university: String(fd.get("university")),
                program: String(fd.get("program")),
                year: Number(fd.get("year")),
              };
              const { error: e } = await supabase()
                .from("profiles")
                .update(p)
                .eq("id", profile.id);
              if (e) throw e;
              const code = String(fd.get("code") || "");
              const name = String(fd.get("group") || "");
              if (code || name) {
                const { error: g } = await supabase().rpc(
                  code ? "join_group" : "create_group",
                  code ? { code } : { group_name: name },
                );
                if (g) throw g;
              }
              setProfile(p);
              await reload();
            });
          }}
        >
          <label>
            First name
            <input name="first_name" required maxLength={60} />
          </label>
          <label>
            University
            <input name="university" required maxLength={160} />
          </label>
          <label>
            Faculty / program
            <input name="program" required maxLength={120} />
          </label>
          <label>
            Year of study
            <input
              name="year"
              type="number"
              min={1}
              max={8}
              defaultValue={1}
              required
            />
          </label>
          <label>
            Create a group
            <input name="group" placeholder="e.g. PR-11" maxLength={80} />
          </label>
          <label>
            Or join with an invite code
            <input
              name="code"
              placeholder="Invite code"
              defaultValue={section === "join" ? pathname.split("/")[2] : ""}
            />
          </label>
          <button className="button primary" disabled={busy}>
            Open my workspace <ArrowRight size={18} />
          </button>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </form>
      </main>
    );
  const selectedSubject = data.subjects.find(
    (s) => s.id === pathname.split("/")[2],
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Layers size={23} />
          </span>
          UniFlow<span className="brand-dot">®</span>
        </Link>
        <button
          className="workspace-switch"
          onClick={() => router.push("/group")}
        >
          <div className="workspace-avatar">
            <GraduationCap size={20} />
          </div>
          <div>
            <strong>{activeGroup?.name || "My workspace"}</strong>
            <small>
              {profile.program} · Year {profile.year}
            </small>
          </div>
          <MoreHorizontal size={17} />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.slice(0, 7).map(([label, path, Icon]) => (
            <Link
              key={path}
              href={path}
              className={
                (
                  section === "dashboard"
                    ? path === "/"
                    : pathname.startsWith(path) && path !== "/"
                )
                  ? "active"
                  : ""
              }
            >
              <Icon size={19} />
              {label}
              {label === "Tasks" && openTasks.length > 0 && (
                <span className="nav-count">{openTasks.length}</span>
              )}
              {label === "Study" && <span className="new-pill">NEW</span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="semester-note">
            <span className="tiny-icon">
              <Sun size={17} />
            </span>
            <strong>A little progress, every day.</strong>
            <p>You don’t have to do it all at once.</p>
            <Link href="/study">
              Find your focus <ArrowRight size={14} />
            </Link>
          </div>
          <Link className="settings-link" href="/settings">
            <Settings size={19} />
            Settings
          </Link>
          <button
            className="profile-chip"
            onClick={() => router.push("/settings")}
          >
            <span className="avatar">{profile.first_name.slice(0, 1)}</span>
            <span>
              <strong>{profile.first_name}</strong>
              <small>{demo ? "Demo workspace" : "Personal account"}</small>
            </span>
            <PanelLeftClose size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            Workspace <ChevronRight size={14} />{" "}
            <strong>
              {selectedSubject
                ? "Subjects"
                : section === "dashboard"
                  ? "Dashboard"
                  : section.charAt(0).toUpperCase() + section.slice(1)}
            </strong>
          </span>
          <div className="top-actions">
            <button
              aria-label="Search workspace"
              className="search-trigger"
              onClick={() => setModal({ kind: "search" })}
            >
              <Search size={16} />
              <span>Search anything…</span>
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Open notifications"
              onClick={() => setModal({ kind: "notifications" })}
            >
              <Bell size={19} />
              {data.notifications.some((n) => !n.read) && <i />}
            </button>
            <span className="avatar small">
              {profile.first_name.slice(0, 1)}
            </span>
          </div>
        </header>
        <main className="content">
          {demo && (
            <div className="demo-banner">
              <span>Demo workspace · changes stay in this browser tab</span>
              <button
                onClick={() => {
                  sessionStorage.removeItem("uniflow-demo");
                  setDemo(false);
                  setProfile(initialProfile);
                  setData(emptyData());
                  router.push("/sign-in");
                }}
              >
                Exit demo <ArrowUpRight size={13} />
              </button>
            </div>
          )}
          {error && (
            <div className="banner error" role="alert">
              {error}
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="banner" role="status">
              {notice}
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {section === "dashboard" ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {now
                      .toLocaleDateString("en", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })
                      .toUpperCase()}
                  </span>
                  <h1>
                    Good{" "}
                    {now.getHours() < 12
                      ? "morning"
                      : now.getHours() < 18
                        ? "afternoon"
                        : "evening"}
                    , {profile.first_name}{" "}
                    <span className="greeting-sun">✳</span>
                  </h1>
                  <p>Let’s make a little progress today.</p>
                </div>
                <button
                  className="button primary"
                  onClick={() => openForm("assignments")}
                >
                  <Plus size={18} />
                  Add task
                </button>
              </div>
              <div className="stats-strip">
                <div>
                  <span className="stat-icon">
                    <CalendarDays size={20} />
                  </span>
                  <span>
                    <b>{todaysClasses.length}</b>
                    <small>Classes today</small>
                  </span>
                </div>
                <div>
                  <span className="stat-icon">
                    <CheckSquare size={20} />
                  </span>
                  <span>
                    <b>{openTasks.length}</b>
                    <small>Open assignments</small>
                  </span>
                </div>
                <div>
                  <span className="stat-icon">
                    <Clock size={20} />
                  </span>
                  <span>
                    <b>
                      {
                        openTasks.filter(
                          (t) => text(t, "deadline") <= localDate(now),
                        ).length
                      }
                    </b>
                    <small>Need your attention</small>
                  </span>
                </div>
                <div>
                  <span className="stat-icon">
                    <BookOpen size={20} />
                  </span>
                  <span>
                    <b>{data.subjects.length}</b>
                    <small>Subjects this semester</small>
                  </span>
                </div>
              </div>
              <div className="dashboard-grid">
                <div>
                  <section className="panel schedule-panel">
                    <div className="section-head">
                      <h2>
                        Today’s classes <span>{todaysClasses.length}</span>
                      </h2>
                      <Link href="/schedule">
                        View schedule <ArrowUpRight size={15} />
                      </Link>
                    </div>
                    <div className="day-heading">
                      <div>
                        <strong>
                          {now.toLocaleDateString("en", { weekday: "long" })}
                        </strong>
                        <span>
                          {now.toLocaleDateString("en", {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          <em>·</em> Week {weekType(now, profile.week_a_start)}
                        </span>
                      </div>
                      {nextClass && (
                        <span className="next-pill">
                          <span /> Next class in{" "}
                          {classMins(nextClass.start_time) - mins} min
                        </span>
                      )}
                    </div>
                    {todaysClasses.length ? (
                      <div className="timeline">
                        {todaysClasses.map((c) => (
                          <div className="timeline-row" key={c.id}>
                            <div className="time">
                              <strong>
                                {text(c, "start_time").slice(0, 5)}
                              </strong>
                              <small>{text(c, "end_time").slice(0, 5)}</small>
                            </div>
                            <div className="timeline-track">
                              <i />
                            </div>
                            {classCard(c)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      empty(
                        "Your day has room to breathe",
                        "Add your timetable to see today’s classes here.",
                        () => openForm("classes"),
                        "Add class",
                      )
                    )}
                    <div className="panel-footer">
                      <span>
                        <Sun size={15} />{" "}
                        {todaysClasses.length
                          ? "You’ve got this. One class at a time."
                          : "A fresh start for your schedule."}
                      </span>
                    </div>
                  </section>
                  <section className="panel deadlines">
                    <div className="section-head">
                      <h2>On the horizon</h2>
                      <Link href="/tasks">
                        All assignments <ArrowUpRight size={15} />
                      </Link>
                    </div>
                    {openTasks.length
                      ? openTasks.slice(0, 4).map(taskRow)
                      : empty(
                          "You’re all caught up",
                          "Add your next assignment and give it a deadline.",
                          () => openForm("assignments"),
                          "Add assignment",
                        )}
                  </section>
                </div>
                <div className="right-column">
                  <section className="plan-panel">
                    <div className="section-head">
                      <h2>
                        <span className="accent">✳</span> Today’s plan
                      </h2>
                      <span className="quiet">FOR YOU</span>
                    </div>
                    <p className="plan-intro">A small plan. A clearer head.</p>
                    {openTasks.slice(0, 3).map((t, i) => (
                      <button
                        className="plan-item"
                        key={t.id}
                        onClick={() => openForm("assignments", t)}
                      >
                        <span className="plan-number">0{i + 1}</span>
                        <span>
                          <strong>{t.title}</strong>
                          <small>
                            {dueLabel(t.deadline)} ·{" "}
                            {subject(t)?.name || "Independent study"}
                          </small>
                        </span>
                        <ArrowUpRight size={15} />
                      </button>
                    ))}
                    {!openTasks.length && (
                      <p>Add deadlines to build your daily plan.</p>
                    )}
                    <Link className="focus-link" href="/study">
                      <Layers size={16} /> Start a study session{" "}
                      <ArrowRight size={16} />
                    </Link>
                  </section>
                  <section className="panel quick-actions">
                    <h2>Quick capture</h2>
                    <p>Get it out of your head. Save it here.</p>
                    <div>
                      {[
                        ["assignments", "Add task", CheckSquare],
                        ["classes", "Add class", CalendarDays],
                        ["files", "Upload material", Upload],
                        ["notes", "Quick note", FileText],
                      ].map(([kind, label, Icon]) => (
                        <button
                          key={String(kind)}
                          onClick={() => openForm(String(kind))}
                        >
                          {typeof Icon !== "string" && <Icon size={19} />}
                          <span>{String(label)}</span>
                          <Plus size={14} />
                        </button>
                      ))}
                    </div>
                  </section>
                  <section className="group-peek">
                    <div className="section-head">
                      <h2>
                        <Users size={18} />{" "}
                        {activeGroup?.name || "Better together"}
                      </h2>
                      <Link href="/group" aria-label="Open group">
                        <ArrowUpRight size={17} />
                      </Link>
                    </div>
                    <p>
                      {activeGroup
                        ? `${data.group_members.length} member${data.group_members.length === 1 ? "" : "s"} · Your shared space`
                        : "Create or join your university group."}
                    </p>
                    {data.activity_log
                      .slice(-2)
                      .reverse()
                      .map((a) => (
                        <div className="activity-small" key={a.id}>
                          <span className="activity-dot" />
                          {a.title}
                        </div>
                      ))}
                    <Link href="/group" className="text-link">
                      Open group <ArrowRight size={14} />
                    </Link>
                  </section>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">YOUR WORKSPACE</span>
                  <h1>
                    {selectedSubject?.name ||
                      {
                        schedule: "Your week, in view.",
                        tasks: "A little closer to done.",
                        subjects: "Everything you’re learning.",
                        group: "Better, together.",
                        study: "Make space to focus.",
                        files: "Right where you need it.",
                        settings: "Make UniFlow yours.",
                        join: "Join your group.",
                      }[section] ||
                      "Page not found"}
                  </h1>
                  <p>
                    {
                      {
                        schedule: "Know what’s next. Leave room for the rest.",
                        tasks:
                          "Keep your deadlines in sight and your mind clear.",
                        subjects: "A home for every course.",
                        group: "One shared space for your university group.",
                        study: "Turn your course notes into understanding.",
                        files: "Your materials, organized by subject.",
                        settings: "Your profile, preferences, and semester.",
                      }[section]
                    }
                  </p>
                </div>
                {["tasks", "schedule", "subjects", "files"].includes(section) &&
                  !selectedSubject && (
                    <button
                      className="button primary"
                      onClick={() =>
                        openForm(
                          {
                            tasks: "assignments",
                            schedule: "classes",
                            subjects: "subjects",
                            files: "files",
                          }[section]!,
                        )
                      }
                    >
                      <Plus size={18} />
                      {section === "schedule"
                        ? "Add class"
                        : section === "subjects"
                          ? "Add subject"
                          : section === "files"
                            ? "Upload file"
                            : "Add task"}
                    </button>
                  )}
              </div>
              {section === "tasks" && (
                <section className="panel">
                  <div className="tabs">
                    {["All", "Today", "Upcoming", "Overdue", "Completed"].map(
                      (f) => (
                        <button
                          key={f}
                          className={filter === f ? "selected" : ""}
                          onClick={() => setFilter(f)}
                        >
                          {f}
                        </button>
                      ),
                    )}
                  </div>
                  {visibleTasks.map(taskRow)}
                  {!visibleTasks.length &&
                    empty(
                      filter === "Completed"
                        ? "No completed assignments yet"
                        : "Nothing here right now",
                      filter === "Completed"
                        ? "Finish an assignment and it will appear here."
                        : "Add an assignment or choose another view.",
                      () => openForm("assignments"),
                      "Add assignment",
                    )}
                </section>
              )}
              {section === "schedule" && (
                <>
                  <div className="calendar-toolbar">
                    <div>
                      <button
                        className="icon-button"
                        aria-label="Previous period"
                        onClick={() => {
                          const d = new Date(selectedDate + "T12:00");
                          d.setDate(
                            d.getDate() - (calendarView === "Week" ? 7 : 1),
                          );
                          setSelectedDate(localDate(d));
                        }}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => setSelectedDate(localDate(now))}
                      >
                        Today
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Next period"
                        onClick={() => {
                          const d = new Date(selectedDate + "T12:00");
                          d.setDate(
                            d.getDate() + (calendarView === "Week" ? 7 : 1),
                          );
                          setSelectedDate(localDate(d));
                        }}
                      >
                        <ChevronRight size={18} />
                      </button>
                      <input
                        aria-label="Calendar date"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          if (e.target.value) setSelectedDate(e.target.value);
                        }}
                      />
                    </div>
                    <div>
                      <span className="badge">
                        Week{" "}
                        {weekType(
                          new Date(selectedDate + "T12:00"),
                          profile.week_a_start,
                        )}
                      </span>
                      <div className="tabs compact">
                        {["Day", "Week"].map((v) => (
                          <button
                            key={v}
                            className={calendarView === v ? "selected" : ""}
                            onClick={() => setCalendarView(v)}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`calendar ${calendarView === "Day" ? "day-view" : ""}`}
                  >
                    {Array.from(
                      { length: calendarView === "Week" ? 7 : 1 },
                      (_, i) => {
                        const day = new Date(selectedDate + "T12:00");
                        if (calendarView === "Week")
                          day.setDate(
                            day.getDate() - ((day.getDay() + 6) % 7) + i,
                          );
                        const rows = classesOn(
                          data.classes,
                          day,
                          profile.week_a_start,
                        );
                        return (
                          <section
                            className={
                              localDate(day) === localDate(now)
                                ? "today-column"
                                : ""
                            }
                            key={i}
                          >
                            <header>
                              <span>
                                {day.toLocaleDateString("en", {
                                  weekday: "short",
                                })}
                              </span>
                              <b>{day.getDate()}</b>
                            </header>
                            {rows.map(classCard)}
                            <button
                              className="calendar-add"
                              onClick={() => {
                                setSelectedDate(localDate(day));
                                openForm("classes");
                              }}
                            >
                              <Plus size={16} />
                              Add class
                            </button>
                          </section>
                        );
                      },
                    )}
                  </div>
                  <p className="footnote">
                    Week A begins {profile.week_a_start}. Change the semester
                    anchor in Settings.
                  </p>
                </>
              )}
              {section === "subjects" && !selectedSubject && (
                <div className="subject-grid">
                  {data.subjects.map((s) => (
                    <Link
                      href={"/subjects/" + s.id}
                      className="subject-card"
                      key={s.id}
                    >
                      <span
                        className="subject-icon"
                        style={{ color: text(s, "color") }}
                      >
                        <BookOpen size={25} />
                      </span>
                      <ArrowUpRight className="subject-arrow" size={18} />
                      <h2>{s.name}</h2>
                      <p>{text(s, "teacher") || "Add your teacher"}</p>
                      <footer>
                        <span>
                          {
                            openTasks.filter((t) => t.subject_id === s.id)
                              .length
                          }{" "}
                          open assignments
                        </span>
                        <span>
                          {
                            data.files.filter((f) => f.subject_id === s.id)
                              .length
                          }{" "}
                          files
                        </span>
                      </footer>
                    </Link>
                  ))}
                  {!data.subjects.length &&
                    empty(
                      "Give each course a home",
                      "Add your subjects to organize classes, notes, and files.",
                      () => openForm("subjects"),
                      "Add subject",
                    )}
                </div>
              )}
              {section === "subjects" && selectedSubject && (
                <section className="panel">
                  <div className="tabs">
                    {["Overview", "Assignments", "Notes", "Files", "Study"].map(
                      (t) => (
                        <button
                          key={t}
                          onClick={() => setSubjectTab(t)}
                          className={t === subjectTab ? "selected" : ""}
                        >
                          {t}
                        </button>
                      ),
                    )}
                  </div>
                  {subjectTab === "Overview" ? (
                    <div className="detail">
                      <span className="badge">
                        <BookOpen size={15} />
                        {selectedSubject.group_id
                          ? "Group subject"
                          : "Private subject"}
                      </span>
                      <h2>{selectedSubject.name}</h2>
                      <p>
                        {text(selectedSubject, "description") ||
                          "Add a course description to keep the essentials close."}
                      </p>
                      <p>
                        Teacher: {text(selectedSubject, "teacher") || "Not set"}
                        <br />
                        Classroom:{" "}
                        {text(selectedSubject, "classroom") || "Not set"}
                      </p>
                      {canEdit(selectedSubject, true) && (
                        <button
                          className="button secondary"
                          onClick={() => openForm("subjects", selectedSubject)}
                        >
                          Edit subject
                        </button>
                      )}
                    </div>
                  ) : subjectTab === "Study" ? (
                    <div className="detail">
                      <p>
                        Open study mode and use your notes from this subject.
                      </p>
                      <Link
                        href={"/study?subject=" + selectedSubject.id}
                        className="button primary"
                      >
                        Open Study <ArrowRight size={16} />
                      </Link>
                    </div>
                  ) : (
                    <div>
                      <div className="detail-actions">
                        <button
                          className="button secondary"
                          onClick={() =>
                            openForm(
                              subjectTab === "Assignments"
                                ? "assignments"
                                : subjectTab.toLowerCase(),
                              undefined,
                              selectedSubject.id,
                            )
                          }
                        >
                          <Plus size={16} />
                          Add{" "}
                          {subjectTab === "Assignments"
                            ? "assignment"
                            : subjectTab === "Notes"
                              ? "note"
                              : "file"}
                        </button>
                      </div>
                      {subjectTab === "Assignments"
                        ? tasks
                            .filter((t) => t.subject_id === selectedSubject.id)
                            .map(taskRow)
                        : subjectTab === "Files"
                          ? data.files
                              .filter(
                                (f) => f.subject_id === selectedSubject.id,
                              )
                              .map(fileRow)
                          : data.notes
                              .filter(
                                (n) => n.subject_id === selectedSubject.id,
                              )
                              .map((n) => (
                                <button
                                  className="note-row"
                                  key={n.id}
                                  onClick={() => openForm("notes", n)}
                                >
                                  <FileText size={20} />
                                  <div>
                                    <strong>{n.title}</strong>
                                    <p>{text(n, "body").slice(0, 130)}</p>
                                  </div>
                                  <ArrowUpRight size={16} />
                                </button>
                              ))}
                    </div>
                  )}
                </section>
              )}
              {section === "files" && (
                <>
                  <div className="folder-bar">
                    <button
                      className={filter === "All" ? "selected" : ""}
                      onClick={() => setFilter("All")}
                    >
                      <FolderOpen />
                      All materials
                    </button>
                    {data.subjects.map((s) => (
                      <button
                        key={s.id}
                        className={filter === s.id ? "selected" : ""}
                        onClick={() => setFilter(s.id)}
                      >
                        <FolderOpen style={{ color: text(s, "color") }} />
                        {s.name}
                      </button>
                    ))}
                    <button
                      className={filter === "Shared" ? "selected" : ""}
                      onClick={() => setFilter("Shared")}
                    >
                      <Users />
                      Shared group files
                    </button>
                  </div>
                  <section className="panel">
                    <div className="section-head">
                      <h2>Materials</h2>
                      <span className="quiet">
                        PDF, DOCX & IMAGES · MAX 20 MB
                      </span>
                    </div>
                    {data.files
                      .filter(
                        (f) =>
                          filter === "All" ||
                          (filter === "Shared" && f.group_id) ||
                          f.subject_id === filter,
                      )
                      .map(fileRow)}
                    {!data.files.length &&
                      empty(
                        "Keep your course materials close",
                        "Upload a PDF, document, or photo and assign it to a subject.",
                        () => openForm("files"),
                        "Upload material",
                      )}
                  </section>
                </>
              )}
              {["group", "join"].includes(section) && (
                <>
                  {!activeGroup || section === "join" ? (
                    <div className="group-setup panel">
                      <h2>Find your people.</h2>
                      <p>
                        Create a group for your class, or join one with an
                        invite code.
                      </p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          void run(async () => {
                            const code = String(fd.get("code") || "");
                            const name = String(fd.get("name") || "");
                            if (!code && !name)
                              throw new Error(
                                "Enter a group name or invite code.",
                              );
                            if (demo)
                              throw new Error(
                                "Group invitations require a real account.",
                              );
                            const { error: e } = await supabase().rpc(
                              code ? "join_group" : "create_group",
                              code ? { code } : { group_name: name },
                            );
                            if (e) throw e;
                            await reload();
                            sessionStorage.removeItem("uniflow-invite");
                            router.push("/group");
                          });
                        }}
                      >
                        <label>
                          Create a group
                          <input
                            name="name"
                            placeholder="e.g. PR-11"
                            maxLength={80}
                          />
                        </label>
                        <label>
                          Or enter an invite code
                          <input
                            name="code"
                            defaultValue={
                              section === "join" ? pathname.split("/")[2] : ""
                            }
                          />
                        </label>
                        <button className="button primary" disabled={busy}>
                          Continue <ArrowRight size={16} />
                        </button>
                      </form>
                    </div>
                  ) : (
                    <>
                      <div className="group-header">
                        <div className="group-avatar">
                          <Users size={32} />
                        </div>
                        <div>
                          <h2>{activeGroup.name}</h2>
                          <p>
                            {profile.university} ·{" "}
                            {
                              data.group_members.filter(
                                (m) => m.group_id === activeGroup.id,
                              ).length
                            }{" "}
                            members
                          </p>
                        </div>
                        <button
                          className="button secondary"
                          onClick={() =>
                            void run(async () => {
                              if (demo)
                                throw new Error(
                                  "Demo invitations cannot be shared.",
                                );
                              await navigator.clipboard.writeText(
                                location.origin +
                                  "/join/" +
                                  text(activeGroup, "invite_code"),
                              );
                              setNotice(
                                "Invite link copied. Code: " +
                                  text(activeGroup, "invite_code"),
                              );
                            })
                          }
                        >
                          Copy invite link <ArrowUpRight size={16} />
                        </button>
                      </div>
                      <section className="panel">
                        <div className="tabs">
                          {[
                            "Overview",
                            "Members",
                            "Assignments",
                            "Files",
                            "Schedule",
                          ].map((t) => (
                            <button
                              key={t}
                              className={groupTab === t ? "selected" : ""}
                              onClick={() => setGroupTab(t)}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        {groupTab === "Overview" ? (
                          <div className="group-overview">
                            <div>
                              <div className="section-head">
                                <h2>Announcements</h2>
                                {admin && (
                                  <button
                                    className="button secondary"
                                    onClick={() => openForm("announcements")}
                                  >
                                    <Plus size={15} />
                                    Post
                                  </button>
                                )}
                              </div>
                              {data.announcements
                                .filter((a) => a.group_id === activeGroup.id)
                                .map((a) => (
                                  <button
                                    className="note-row"
                                    key={a.id}
                                    onClick={() => openForm("announcements", a)}
                                  >
                                    <div>
                                      <strong>{a.title}</strong>
                                      <p>{a.body}</p>
                                    </div>
                                  </button>
                                ))}
                              {!data.announcements.length && (
                                <p className="muted">
                                  No announcements yet. Group updates will
                                  appear here.
                                </p>
                              )}
                            </div>
                            <div>
                              <h2>Activity</h2>
                              {data.activity_log
                                .filter((a) => a.group_id === activeGroup.id)
                                .slice(-15)
                                .reverse()
                                .map((a) => (
                                  <div className="activity-item" key={a.id}>
                                    <span className="activity-dot" />
                                    <div>
                                      {a.title}
                                      <small>
                                        {new Date(
                                          text(a, "created_at"),
                                        ).toLocaleString()}
                                      </small>
                                    </div>
                                  </div>
                                ))}
                              {!data.activity_log.length && (
                                <p className="muted">
                                  Assignments, schedule changes, and uploads
                                  will show up here.
                                </p>
                              )}
                            </div>
                            {role === "owner" && (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const name = String(
                                    new FormData(e.currentTarget).get("name"),
                                  );
                                  void run(() =>
                                    save("groups", { ...activeGroup, name }),
                                  );
                                }}
                              >
                                <label>
                                  Group name
                                  <input
                                    name="name"
                                    defaultValue={text(activeGroup, "name")}
                                    required
                                    maxLength={80}
                                  />
                                </label>
                                <button
                                  className="button secondary"
                                  disabled={busy}
                                >
                                  Save group name
                                </button>
                              </form>
                            )}
                          </div>
                        ) : groupTab === "Members" ? (
                          data.group_members
                            .filter((m) => m.group_id === activeGroup.id)
                            .map((m) => (
                              <div className="member-row" key={m.id}>
                                <span className="avatar">
                                  {(
                                    members.find((p) => p.id === m.user_id)
                                      ?.first_name || profile.first_name
                                  ).slice(0, 1)}
                                </span>
                                <strong>
                                  {m.user_id === profile.id
                                    ? profile.first_name
                                    : members.find((p) => p.id === m.user_id)
                                        ?.first_name || "Student"}
                                </strong>
                                <span className="badge">{text(m, "role")}</span>
                                {role === "owner" && m.role !== "owner" && (
                                  <select
                                    aria-label="Member role"
                                    value={text(m, "role")}
                                    onChange={(e) =>
                                      void run(async () => {
                                        if (demo) return;
                                        const { error: e2 } =
                                          await supabase().rpc(
                                            "manage_member",
                                            {
                                              member_id: m.id,
                                              new_role: e.target.value,
                                            },
                                          );
                                        if (e2) throw e2;
                                        await reload();
                                      })
                                    }
                                  >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                    <option value="remove">
                                      Remove member
                                    </option>
                                  </select>
                                )}
                              </div>
                            ))
                        ) : groupTab === "Assignments" ? (
                          tasks
                            .filter((t) => t.group_id === activeGroup.id)
                            .map(taskRow)
                        ) : groupTab === "Files" ? (
                          data.files
                            .filter((f) => f.group_id === activeGroup.id)
                            .map(fileRow)
                        ) : (
                          <div className="detail">
                            {data.classes
                              .filter((c) => c.group_id === activeGroup.id)
                              .map(classCard)}
                            {admin && (
                              <button
                                className="button secondary"
                                onClick={() => openForm("classes")}
                              >
                                Add group class
                              </button>
                            )}
                          </div>
                        )}
                      </section>
                    </>
                  )}
                </>
              )}
              {section === "study" && (
                <div className="study-layout">
                  <section className="panel study-input">
                    <span className="badge">
                      <Sparkles size={14} />
                      STUDY SPACE
                    </span>
                    <h2>What are we learning today?</h2>
                    <p>
                      Bring your notes. Choose how you want to understand them.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        void run(async () => {
                          if (demo)
                            throw new Error(
                              "Study generation requires a signed-in account and a configured AI provider.",
                            );
                          const response = await fetch("/api/study", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: fd.get("action"),
                              material: fd.get("material"),
                            }),
                          });
                          const result = await response.json();
                          if (!response.ok) throw new Error(result.error);
                          setAiResult(result.result);
                        });
                      }}
                    >
                      <label>
                        Start from a saved note
                        <select
                          onChange={(e) => {
                            const area = document.getElementById(
                              "study-material",
                            ) as HTMLTextAreaElement;
                            area.value = text(
                              data.notes.find((n) => n.id === e.target.value) ||
                                {},
                              "body",
                            );
                          }}
                        >
                          <option value="">Choose a note…</option>
                          {data.notes.map((n) => (
                            <option key={n.id} value={n.id}>
                              {n.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Your material
                        <textarea
                          id="study-material"
                          name="material"
                          placeholder="Paste lecture notes or a passage you want to understand…"
                          required
                          minLength={30}
                          maxLength={24000}
                          rows={12}
                        />
                      </label>
                      <fieldset className="study-action-field">
                        <legend>Study action</legend>
                        <input
                          type="hidden"
                          name="action"
                          value={studyAction}
                        />
                        <div className="study-actions">
                          {[
                            "Summarize material",
                            "Explain simply",
                            "Generate quiz",
                            "Generate flashcards",
                            "Prepare me for class",
                          ].map((action) => (
                            <button
                              key={action}
                              type="button"
                              aria-pressed={studyAction === action}
                              onClick={() => setStudyAction(action)}
                            >
                              <Sparkles size={15} />
                              {action}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                      <button className="button primary" disabled={busy}>
                        <Sparkles size={17} />
                        {busy
                          ? "Working through your notes…"
                          : "Start studying"}
                      </button>
                      <small>
                        Your submitted material is sent to the configured AI
                        provider.
                      </small>
                    </form>
                  </section>
                  <section className="panel study-output">
                    <Layers size={30} />
                    <h2>
                      {aiResult
                        ? "Your study notes"
                        : "Understanding starts here."}
                    </h2>
                    {aiResult ? (
                      <>
                        <pre>{aiResult}</pre>
                        <button
                          className="button secondary"
                          onClick={() =>
                            void run(async () => {
                              await save("notes", {
                                id: crypto.randomUUID(),
                                owner_id: profile.id,
                                group_id: null,
                                title: "Study session · " + localDate(now),
                                body: aiResult,
                              });
                              setNotice("Study result saved as a note.");
                            })
                          }
                        >
                          Save as note
                        </button>
                      </>
                    ) : (
                      <p>
                        Your summary, quiz, or flashcards will appear here.
                        Review generated content against your course materials.
                      </p>
                    )}
                  </section>
                </div>
              )}
              {section === "settings" && (
                <section className="panel settings-panel">
                  <h2>Personal details</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      void run(async () => {
                        const p = {
                          ...profile,
                          first_name: String(fd.get("first_name")),
                          university: String(fd.get("university")),
                          program: String(fd.get("program")),
                          year: Number(fd.get("year")),
                          week_a_start: String(fd.get("week_a_start")),
                        };
                        if (!demo) {
                          const { error: e } = await supabase()
                            .from("profiles")
                            .update(p)
                            .eq("id", profile.id);
                          if (e) throw e;
                        }
                        setProfile(p);
                        setNotice("Profile updated.");
                      });
                    }}
                  >
                    <div className="form-grid">
                      <label>
                        First name
                        <input
                          name="first_name"
                          defaultValue={profile.first_name}
                          required
                          maxLength={60}
                        />
                      </label>
                      <label>
                        University
                        <input
                          name="university"
                          defaultValue={profile.university}
                          required
                        />
                      </label>
                      <label>
                        Program
                        <input
                          name="program"
                          defaultValue={profile.program}
                          required
                        />
                      </label>
                      <label>
                        Year
                        <input
                          name="year"
                          type="number"
                          min={1}
                          max={8}
                          defaultValue={profile.year}
                          required
                        />
                      </label>
                      <label>
                        Week A anchor (Monday)
                        <input
                          name="week_a_start"
                          type="date"
                          defaultValue={profile.week_a_start}
                          required
                        />
                      </label>
                    </div>
                    <button className="button primary" disabled={busy}>
                      Save profile
                    </button>
                  </form>
                  <hr />
                  <h2>Appearance</h2>
                  <p>Choose the theme that feels right for you.</p>
                  <div className="tabs compact">
                    {["light", "dark", "system"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className={t === theme ? "selected" : ""}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                  <hr />
                  <button
                    className="button secondary"
                    onClick={() =>
                      void run(async () => {
                        if (!demo) {
                          const { error: e } = await supabase().auth.signOut();
                          if (e) throw e;
                        }
                        sessionStorage.removeItem("uniflow-demo");
                        setDemo(false);
                        setProfile(initialProfile);
                        setData(emptyData());
                        router.push("/sign-in");
                      })
                    }
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </section>
              )}
              {![
                "tasks",
                "schedule",
                "subjects",
                "group",
                "join",
                "study",
                "files",
                "settings",
              ].includes(section) && (
                <Link href="/" className="button primary">
                  Return to dashboard
                </Link>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>
              UniFlow <em>·</em> A little more organized. A little more you.
            </span>
            <span>Made for your student days.</span>
          </footer>
        </main>
      </div>
      <nav className="mobile-nav">
        {nav.slice(0, 4).map(([label, path, Icon]) => (
          <Link
            href={path}
            key={path}
            className={pathname === path ? "active" : ""}
          >
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
        <button onClick={() => setModal({ kind: "more" })}>
          <MoreHorizontal size={22} />
          <span>More</span>
        </button>
      </nav>
      <button
        className="capture-button"
        aria-label="Quick capture"
        onClick={() => setModal({ kind: "capture" })}
      >
        <Plus size={25} />
      </button>
      {modal && (
        <Modal
          title={
            modal.kind === "search"
              ? "Find anything"
              : modal.kind === "notifications"
                ? "Notifications"
                : modal.kind === "capture"
                  ? "Quick capture"
                  : modal.kind === "more"
                    ? "Your workspace"
                    : `${modal.row ? "Edit" : "Add"} ${{ assignments: "assignment", classes: "class", subjects: "subject", notes: "note", files: "material", announcements: "announcement" }[modal.kind] || modal.kind}`
          }
          close={() => setModal(null)}
        >
          {modal.kind === "search" ? (
            <>
              <label className="search-field">
                <Search size={20} />
                <input
                  autoFocus
                  placeholder="Search subjects, tasks, notes, files…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <kbd>ESC</kbd>
              </label>
              <div className="search-results">
                {query.length > 0 ? (
                  (
                    [
                      "subjects",
                      "assignments",
                      "notes",
                      "files",
                      "announcements",
                    ] as Table[]
                  ).flatMap((t) =>
                    data[t]
                      .filter((r) =>
                        [r.name, r.title, r.body, r.description]
                          .join(" ")
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            if (t === "subjects") {
                              router.push("/subjects/" + r.id);
                              setModal(null);
                            } else openForm(t, r);
                          }}
                        >
                          <FileText size={18} />
                          <span>
                            <strong>{r.title || r.name}</strong>
                            <small>{t}</small>
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      )),
                  )
                ) : (
                  <p className="muted">
                    Search everything in your private and shared workspace.
                  </p>
                )}
              </div>
            </>
          ) : modal.kind === "notifications" ? (
            <>
              <button
                className="button secondary"
                onClick={() =>
                  void run(async () => {
                    if (demo) {
                      setData((d) => ({
                        ...d,
                        notifications: d.notifications.map((n) => ({
                          ...n,
                          read: true,
                        })),
                      }));
                      return;
                    }
                    const { error: e } = await supabase()
                      .from("notifications")
                      .update({ read: true })
                      .eq("user_id", profile.id);
                    if (e) throw e;
                    await reload();
                  })
                }
              >
                Mark all as read
              </button>
              {data.notifications
                .slice()
                .reverse()
                .map((n) => (
                  <button
                    className={`notification-row ${n.read ? "" : "unread"}`}
                    key={n.id}
                    onClick={() =>
                      void run(async () => {
                        await save("notifications", { ...n, read: true });
                        router.push(text(n, "href") || "/");
                        setModal(null);
                      })
                    }
                  >
                    <Bell size={18} />
                    <div>
                      <strong>{n.title}</strong>
                      <p>{n.body}</p>
                      <small>
                        {new Date(text(n, "created_at")).toLocaleString()}
                      </small>
                    </div>
                  </button>
                ))}
              {!data.notifications.length &&
                empty(
                  "All quiet for now",
                  "Your group updates and upcoming deadlines will appear here.",
                )}
            </>
          ) : modal.kind === "more" ? (
            <div className="capture-grid">
              {nav.slice(4).map(([label, path, Icon]) => (
                <Link key={path} href={path} onClick={() => setModal(null)}>
                  <Icon size={22} />
                  {label}
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : modal.kind === "capture" ? (
            <div className="capture-grid">
              {[
                ["assignments", "Add assignment"],
                ["notes", "Add note"],
                ["files", "Upload photo"],
                ["files", "Upload file"],
                ["classes", "Add class"],
              ].map(([kind, label]) => (
                <button key={label} onClick={() => openForm(kind)}>
                  <Plus size={20} />
                  {label}
                  <ArrowRight size={16} />
                </button>
              ))}
            </div>
          ) : (
            <RecordForm
              key={modal.kind + (modal.row?.id || "new")}
              kind={modal.kind as Table}
              row={modal.row}
              subjectId={modal.subject}
              data={data}
              profile={profile}
              admin={admin}
              demo={demo}
              busy={busy}
              date={selectedDate}
              editable={
                !modal.row ||
                canEdit(
                  modal.row,
                  ["subjects", "classes", "announcements"].includes(modal.kind),
                )
              }
              onDelete={() => void remove(modal.kind as Table, modal.row!)}
              onSubmit={async (row, file) => {
                await run(async () => {
                  if (file) {
                    if (demo)
                      throw new Error(
                        "Uploads require a real account. Demo notes and assignments are saved locally.",
                      );
                    const path = `${row.group_id ? "group/" + row.group_id : "private/" + profile.id}/${crypto.randomUUID()}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
                    const client = supabase();
                    const { error: e } = await client.storage
                      .from("materials")
                      .upload(path, file, { contentType: file.type });
                    if (e) throw e;
                    try {
                      await save("files", {
                        ...row,
                        path,
                        size: file.size,
                        mime_type: file.type,
                      });
                    } catch (e) {
                      await client.storage.from("materials").remove([path]);
                      throw e;
                    }
                  } else await save(modal.kind as Table, row);
                  setModal(null);
                  setNotice("Saved to your workspace.");
                });
              }}
            />
          )}
          {modal.kind === "assignments" && modal.row && (
            <section className="attachments">
              <h3>Attachments</h3>
              {data.files
                .filter((f) => f.assignment_id === modal.row?.id)
                .map(fileRow)}
              {!data.files.some((f) => f.assignment_id === modal.row?.id) && (
                <p className="muted">
                  No files attached yet. Upload a file and choose this
                  assignment to attach it.
                </p>
              )}
            </section>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
