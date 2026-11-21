create table public.public_body_attempts (
  id uuid primary key,
  email_hash text,
  phone_hash text,
  requested_at timestamptz not null default clock_timestamp(),
  purpose_version text not null default 'body-photo-v1'
);
alter table public.public_body_attempts enable row level security;
revoke all on public.public_body_attempts from public, anon, authenticated;
create unique index public_body_email_once on public.public_body_attempts(email_hash);
create unique index public_body_phone_once on public.public_body_attempts(phone_hash);
create index public_body_attempt_date on public.public_body_attempts(requested_at);

create function public.public_body_reserve(p_id uuid,p_email text,p_phone text)
returns text language plpgsql security definer set search_path='' as $$
declare
  start_day timestamptz;
begin
  if p_email is null or p_phone is null or p_email !~ '^[a-f0-9]{64}$' or p_phone !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid identity hashes';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(41589,30);
  start_day := date_trunc('day',clock_timestamp(),'America/Sao_Paulo');
  if (select count(*) from public.public_body_attempts where requested_at>=start_day)>=30 then return 'limit'; end if;
  insert into public.public_body_attempts(id,email_hash,phone_hash)
  values (p_id,p_email,p_phone) on conflict do nothing;
  if not found then return 'duplicate'; end if;
  return 'ok';
end;
$$;

create function public.public_body_release(p_id uuid)
returns void language sql security definer set search_path='' as $$
  update public.public_body_attempts set email_hash=null,phone_hash=null where id=p_id;
$$;

revoke all on function public.public_body_reserve(uuid,text,text),public.public_body_release(uuid) from public,anon,authenticated;
grant execute on function public.public_body_reserve(uuid,text,text),public.public_body_release(uuid) to service_role;
