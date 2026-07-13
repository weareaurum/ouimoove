-- APPLIED 2026-07-13 via Supabase Management API.

create table if not exists public.rate_limits (
  bucket_key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);

-- Locked down: only the service role (edge functions) touches this table.
alter table public.rate_limits enable row level security;

-- Atomically checks + increments a rate-limit bucket. Returns true if the
-- caller is still within the allowed count for the current window, false if
-- the limit has been exceeded (call should then respond 429).
create or replace function public.check_rate_limit(
  p_key text, p_max_count integer, p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.rate_limits;
begin
  select * into v_row from public.rate_limits where bucket_key = p_key for update;

  if not found then
    insert into public.rate_limits (bucket_key, count, window_start)
    values (p_key, 1, now());
    return true;
  end if;

  if now() - v_row.window_start > make_interval(secs => p_window_seconds) then
    update public.rate_limits set count = 1, window_start = now() where bucket_key = p_key;
    return true;
  end if;

  if v_row.count >= p_max_count then
    return false;
  end if;

  update public.rate_limits set count = count + 1 where bucket_key = p_key;
  return true;
end;
$$;

grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
