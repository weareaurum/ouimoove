-- APPLIED 2026-07-13 via Supabase Management API (project-scoped access
-- token in local .env, after MCP connector access was lost). Kept in the
-- repo as the record of what's live.

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
-- user_id must also be nullable, or ON DELETE SET NULL violates NOT NULL
-- the moment a buyer with orders deletes their account (found in E2E test).
alter table public.orders alter column user_id drop not null;
alter table public.orders drop constraint if exists orders_user_id_fkey;
alter table public.orders
  add constraint orders_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

-- Organizer-facing view: buyer identity hidden once the account is deleted.
-- loadOrganizerOrders (useStore.js) reads the pre-existing
-- organizer_attendees view, so THAT is the one that must mask. Recreated
-- here with: LEFT JOIN profiles (an inner join made a deleted buyer's
-- orders vanish entirely instead of being masked), fallback to the
-- orders.buyer_name snapshot, masking when buyer_account_deleted, and the
-- previously-missing checked_in_count column that the partial check-in UI
-- reads. security_invoker keeps the underlying orders RLS in force for
-- whoever queries the view.
drop view if exists public.organizer_attendees;
create view public.organizer_attendees as
select
  o.id as order_id,
  o.user_id as attendee_id,
  case when o.buyer_account_deleted then 'Compte supprimé'
       else coalesce(p.full_name, o.buyer_name) end as attendee_name,
  case when o.buyer_account_deleted then null
       else coalesce(p.email, o.buyer_email) end as attendee_email,
  null::text as attendee_phone,
  o.payment_method,
  o.payment_status,
  o.created_at as purchased_at,
  oi.id as item_id,
  oi.event_id,
  e.title as event_title,
  tt.name as ticket_type_name,
  oi.unit_price_cfa,
  oi.quantity,
  oi.checked_in,
  oi.checked_in_at,
  oi.checked_in_count,
  oi.is_resale,
  oi.resold
from orders o
left join profiles p on p.id = o.user_id
join order_items oi on oi.order_id = o.id
join events e on e.id = oi.event_id
join ticket_types tt on tt.id = oi.ticket_type_id;
grant select on public.organizer_attendees to authenticated;
alter view public.organizer_attendees set (security_invoker = on);

-- Admin-facing view keeps the raw snapshot visible regardless of deletion.
create or replace view public.organizer_orders_view as
select
  o.id, o.user_id, o.total_cfa, o.payment_method, o.payment_status,
  o.paydunya_token, o.created_at, o.buyer_account_deleted,
  case when o.buyer_account_deleted then 'Compte supprimé' else o.buyer_name end as buyer_name,
  case when o.buyer_account_deleted then null else o.buyer_email end as buyer_email
from public.orders o;

grant select on public.organizer_orders_view to authenticated;
alter view public.organizer_orders_view set (security_invoker = on);
