import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const uid = (n: number) =>
  `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
test("schema, RLS, group roles, storage scope, and independent completion", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);alter table storage.objects enable row level security;
 create function public.gen_random_bytes(n int) returns bytea language sql as $$select substring(decode(md5(random()::text),'hex') from 1 for n)$$;`);
    let migration = await readFile(
      new URL("../supabase/migrations/001_uniflow.sql", import.meta.url),
      "utf8",
    );
    // PGlite uses PostgreSQL itself. Only platform-provided crypto and logical replication
    // are replaced in this harness; the application tables, policies, and functions are exact.
    migration = migration
      .replace("create extension if not exists pgcrypto;", "")
      .replace(/alter publication supabase_realtime add table[^;]+;/, "");
    await db.exec(migration);
    await db.exec(
      `grant usage on schema public,auth,storage to authenticated;grant all on all tables in schema public to authenticated;grant all on storage.objects to authenticated;insert into auth.users(id) values('${uid(1)}'),('${uid(2)}'),('${uid(3)}');`,
    );
    const as = async (n: number) => {
      await db.exec(
        `reset role;set role authenticated;set request.jwt.claim.sub='${uid(n)}';`,
      );
    };
    await as(1);
    await db.exec(
      `update profiles set first_name='Owner' where id='${uid(1)}';insert into subjects(id,owner_id,name) values('${uid(10)}','${uid(1)}','Private law');insert into notes(id,owner_id,subject_id,title,body) values('${uid(11)}','${uid(1)}','${uid(10)}','Private note','Private text');`,
    );
    const g = (
      await db.query<{ id: string }>(`select create_group('PR-11') as id`)
    ).rows[0].id;
    const code = (
      await db.query<{ invite_code: string }>(
        `select invite_code from groups where id='${g}'`,
      )
    ).rows[0].invite_code;
    await as(2);
    assert.equal((await db.query("select * from notes")).rows.length, 0);
    assert.equal((await db.query("select * from groups")).rows.length, 0);
    await assert.rejects(
      db.exec(
        `insert into notes(owner_id,title) values('${uid(1)}','Impersonation')`,
      ),
      /row-level security/,
    );
    await db.query("select join_group($1)", [code]);
    assert.equal((await db.query("select * from groups")).rows.length, 1);
    await db.exec(
      `insert into assignments(id,owner_id,group_id,title,deadline) values('${uid(20)}','${uid(2)}','${g}','Shared task',current_date+1)`,
    );
    await assert.rejects(
      db.exec(
        `insert into announcements(owner_id,group_id,title) values('${uid(2)}','${g}','Not allowed')`,
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.exec(
        `insert into notes(owner_id,group_id,subject_id,title) values('${uid(2)}','${g}','${uid(10)}','Leak')`,
      ),
      /visibility/,
    );
    await as(1);
    assert.equal((await db.query("select * from assignments")).rows.length, 1);
    assert.equal(
      (await db.query("select * from notifications")).rows.length,
      1,
    );
    await db.exec(
      `insert into assignment_members(assignment_id,user_id,status) values('${uid(20)}','${uid(1)}','Done')`,
    );
    await as(2);
    assert.equal(
      (await db.query("select * from assignment_members")).rows.length,
      0,
    );
    await db.exec(
      `insert into assignment_members(assignment_id,user_id,status) values('${uid(20)}','${uid(2)}','In progress')`,
    );
    await assert.rejects(
      db.exec(`update assignments set group_id=null where id='${uid(20)}'`),
      /visibility/,
    );
    await as(3);
    assert.equal((await db.query("select * from assignments")).rows.length, 0);
    assert.equal((await db.query("select * from activity_log")).rows.length, 0);
    assert.equal(
      (await db.query("select * from notifications")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query<{ ok: boolean }>(
          `select storage_scope('group/${g}/file.pdf') as ok`,
        )
      ).rows[0].ok,
      false,
    );
    await assert.rejects(
      db.exec(
        `insert into storage.objects(bucket_id,name,owner_id) values('materials','group/${g}/file.pdf','${uid(3)}')`,
      ),
      /row-level security/,
    );
    await as(1);
    const member = (
      await db.query<{ id: string }>(
        `select id from group_members where user_id='${uid(2)}'`,
      )
    ).rows[0].id;
    await db.query("select manage_member($1,$2)", [member, "admin"]);
    await as(2);
    await db.exec(
      `insert into announcements(owner_id,group_id,title) values('${uid(2)}','${g}','Allowed announcement')`,
    );
    await db.exec(
      `insert into classes(owner_id,group_id,title,start_time,end_time,weekday,date,repeat,type) values('${uid(2)}','${g}','Shared lecture','09:00','10:00',1,current_date,'every','Lecture')`,
    );
    assert.equal(
      (
        await db.query<{ ok: boolean }>(
          `select storage_scope('group/${g}/file.pdf') as ok`,
        )
      ).rows[0].ok,
      true,
    );
    await as(1);
    await db.query("select manage_member($1,$2)", [member, "remove"]);
    await as(2);
    assert.equal((await db.query("select * from assignments")).rows.length, 0);
  } finally {
    await db.close();
  }
});
