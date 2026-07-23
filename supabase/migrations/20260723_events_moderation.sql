-- Event moderation: new events created by organizers must be reviewed and
-- approved by an admin before they're publicly visible. `events.status`
-- already carries free-text values ('published', 'cancelled') in the app —
-- this adds 'pending' as the default state new events land in, and locks
-- down RLS so the public/anon role can only ever see 'published' rows,
-- regardless of any client-side filtering.
--
-- IMPORTANT: this repo does not track the events table's current RLS
-- policies (it was never version-controlled here), so this migration
-- can't safely assume what policies already exist. Before running this:
--   1. Open Supabase Dashboard → Authentication → Policies → events
--   2. Note any existing policy that grants SELECT to `anon`/`public`
--      without a status filter — if one exists, DROP it (see commented
--      DROP POLICY placeholders below; fill in the real policy name).
--   3. Then run this migration.

-- Ensure RLS is on (safe no-op if already enabled).
alter table public.events enable row level security;

-- Uncomment and fill in the actual name(s) of any pre-existing permissive
-- policy you found in step 2 above:
-- drop policy if exists "<existing_policy_name>" on public.events;

-- Public (anon + authenticated) can only read published events.
drop policy if exists "events_public_read_published" on public.events;
create policy "events_public_read_published"
  on public.events for select
  to anon, authenticated
  using (status = 'published');

-- Organizers can read their own events regardless of status (so their
-- "Mes Événements" list still shows pending/cancelled events they own).
drop policy if exists "events_owner_read_all" on public.events;
create policy "events_owner_read_all"
  on public.events for select
  to authenticated
  using (organizer_id = auth.uid());

-- Admins can read every event regardless of status (moderation queue).
drop policy if exists "events_admin_read_all" on public.events;
create policy "events_admin_read_all"
  on public.events for select
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- Organizers can insert their own events (always lands as 'pending' —
-- enforced client-side in useStore.js's createEvent; this check backs
-- it up so a modified client can't force-publish on insert).
drop policy if exists "events_owner_insert" on public.events;
create policy "events_owner_insert"
  on public.events for insert
  to authenticated
  with check (organizer_id = auth.uid() and status = 'pending');

-- Organizers can update their own events, but not change `status` — only
-- an admin can move status to 'published' (approve). Postgres RLS can't
-- express "this column may not change" directly in USING/WITH CHECK, so
-- this is enforced by the app never sending `status` in updateEvent's
-- payload (see src/hooks/useStore.js). This policy just scopes rows.
drop policy if exists "events_owner_update" on public.events;
create policy "events_owner_update"
  on public.events for update
  to authenticated
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

-- Admins can update any event (used by approveEvent to flip status to
-- 'published').
drop policy if exists "events_admin_update" on public.events;
create policy "events_admin_update"
  on public.events for update
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

-- Organizers can delete their own events; admins can delete any event
-- (used to reject/remove events during moderation).
drop policy if exists "events_owner_delete" on public.events;
create policy "events_owner_delete"
  on public.events for delete
  to authenticated
  using (organizer_id = auth.uid());

drop policy if exists "events_admin_delete" on public.events;
create policy "events_admin_delete"
  on public.events for delete
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));
