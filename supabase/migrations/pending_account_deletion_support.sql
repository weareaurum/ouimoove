-- PENDING: apply this via the Supabase MCP (execute_sql/apply_migration) once
-- project access is restored. Not yet applied as of 2026-07-09.

-- Snapshot buyer identity at purchase time so it survives account deletion,
-- and a flag to hide it from organizer-facing views once the buyer deletes
-- their account (admin views should ignore this flag and always show it).
alter table public.orders
  add column if not exists buyer_name text,
  add column if not exists buyer_email text,
  add column if not exists buyer_account_deleted boolean not null default false;

-- Backfill existing orders from the current profile/auth data where possible.
update public.orders o
set buyer_name  = coalesce(o.buyer_name, u.raw_user_meta_data->>'full_name', u.email),
    buyer_email = coalesce(o.buyer_email, u.email)
from auth.users u
where u.id = o.user_id and o.buyer_name is null;

-- Deleting the auth user must NOT cascade-delete their order history.
alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

-- Organizer-facing view: buyer identity hidden once the account is deleted.
-- Point loadOrganizerOrders (useStore.js) at this view instead of the raw
-- `orders` table for the buyer_name/buyer_email fields.
create or replace view public.organizer_orders_view as
select
  o.id, o.user_id, o.total_cfa, o.payment_method, o.payment_status,
  o.paydunya_token, o.created_at, o.buyer_account_deleted,
  case when o.buyer_account_deleted then 'Compte supprimé' else o.buyer_name end as buyer_name,
  case when o.buyer_account_deleted then null else o.buyer_email end as buyer_email
from public.orders o;

grant select on public.organizer_orders_view to authenticated;
