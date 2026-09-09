# Hosted Supabase validation

Run `pnpm test` for the repeatable local PostgreSQL security suite. After applying the migration to a test Supabase project, validate the actual managed services with two independent browser profiles/accounts:

1. Register A and B, confirm both emails, complete onboarding, and verify password recovery.
2. A creates a private subject, task, note, and PDF. B must not see any of them in queries, global search, or Storage.
3. A creates a group, copies its invite link, and B joins. B sees the group but cannot edit its schedule or post announcements.
4. B creates a group assignment. A sees it without reloading and receives a notification/activity entry.
5. A marks it Done. B's status remains Not started. Mark a notification read and confirm the unread indicator clears.
6. A promotes B to Admin. B can now post an announcement and create a group class.
7. Upload a shared PDF, rename it, assign it to a subject/assignment, download it through a signed URL, and delete it. Verify the Storage object and metadata both disappear.
8. Remove B from the group. B can no longer query its group records or request new downloads. Previously issued signed URLs expire within 60 seconds.
9. Verify Week A and B on adjacent Mondays, one-time classes, and a class starting in the future.
10. With AI credentials configured, generate a study result and save it as a note. Confirm unauthenticated requests return 401 and the per-user daily limit returns 429.
11. Test iPhone Safari home-screen installation, safe areas, keyboard focus, and offline fallback on an actual device.

Do not use production student records for these checks. The local suite supplies no assurance of managed email, realtime infrastructure, or live provider availability; those are the purpose of this checklist.
