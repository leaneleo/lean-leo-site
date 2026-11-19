-- Financeiro familiar: dados somente no esquema privado. Não altera pagamentos da consultoria.
begin;
create function private.finance_require_admin() returns uuid language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or private.divafit_role() is distinct from 'admin' then raise exception 'Financeiro restrito aos administradores.' using errcode='42501';end if;
 return auth.uid();
end$$;
revoke all on function private.finance_require_admin() from public,anon,authenticated;
create table private.finance_clients(
 id uuid primary key default gen_random_uuid(),bucket text not null check(bucket in ('leandro','leonardo')),
 code text not null check(length(trim(code)) between 1 and 120),name text not null check(length(trim(name)) between 1 and 200),
 archived boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),version int not null default 1,
 unique(bucket,code)
);
create table private.finance_rates(
 id uuid primary key default gen_random_uuid(),client_id uuid not null references private.finance_clients(id),starts_on date not null,
 cents bigint not null check(cents between 0 and 100000000),source_key text unique,
 unique(client_id,starts_on)
);
create table private.finance_entries(
 id uuid primary key default gen_random_uuid(),request_id uuid not null unique,client_id uuid references private.finance_clients(id),
 bucket text not null check(bucket in ('leandro','leonardo','familia')),kind text not null check(kind in ('aula','recebimento','extra','despesa')),
 day date not null,quantity int not null default 1 check(quantity between 1 and 100),unit_cents bigint check(unit_cents between 0 and 100000000),
 cents bigint check(cents between 0 and 10000000000),status text not null check(status in ('confirmado','a_revisar','cancelado')),
 note text not null default '' check(length(note)<=2000),source_key text unique,source jsonb not null default '{}',
 archived boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),version int not null default 1,
 check(kind<>'aula' or client_id is not null),check(status<>'confirmado' or cents is not null)
);
create index finance_entries_day on private.finance_entries(day);
create index finance_entries_client on private.finance_entries(client_id);
create table private.finance_sources(
 source_key text primary key,sha256 text not null check(sha256~'^[a-f0-9]{64}$'),sheet text not null,
 imported_at timestamptz not null default now(),imported_by uuid references auth.users(id),data jsonb not null
);
do $$declare t text;begin
 foreach t in array array['finance_clients','finance_rates','finance_entries','finance_sources'] loop
 execute format('alter table private.%I enable row level security',t);
 execute format('create policy no_direct_access on private.%I for all to public using(false) with check(false)',t);
 execute format('revoke all on private.%I from public,anon,authenticated',t);
 end loop;
 foreach t in array array['finance_clients','finance_entries'] loop
 execute format('create trigger stamp before insert or update on private.%I for each row execute function private.divafit_stamp()',t);
 execute format('create trigger audit after insert or update on private.%I for each row execute function private.divafit_audit()',t);
 end loop;
end$$;
create function public.finance_workspace(p_year int) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();a date;b date;
begin
 if p_year is null or p_year not between 2000 and 2100 then raise exception 'Ano inválido';end if;
 a:=make_date(p_year,1,1);b:=make_date(p_year+1,1,1);
 return jsonb_build_object(
 'clients',coalesce((select jsonb_agg(to_jsonb(c) order by c.name) from private.finance_clients c where not c.archived),'[]'),
 'rates',coalesce((select jsonb_agg(to_jsonb(r)) from private.finance_rates r),'[]'),
 'entries',coalesce((select jsonb_agg(to_jsonb(e) order by e.day,e.created_at) from private.finance_entries e where e.day>=a and e.day<b and not e.archived),'[]'),
 'sources',coalesce((select jsonb_agg(jsonb_build_object('sheet',s.sheet,'imported_at',s.imported_at,'checks',s.data->'checks')) from private.finance_sources s),'[]'));
end$$;
create function public.finance_client_create(p_bucket text,p_name text,p_code text,p_cents bigint,p_starts_on date) returns uuid language plpgsql security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();i uuid;
begin
 if p_cents is null or p_starts_on is null then raise exception 'Informe o valor da aula e a data inicial.';end if;
 insert into private.finance_clients(bucket,code,name) values(p_bucket,trim(p_code),trim(p_name)) returning id into i;
 insert into private.finance_rates(client_id,starts_on,cents) values(i,p_starts_on,p_cents);return i;
end$$;
create function public.finance_entry_create(p_request_id uuid,p_client_id uuid,p_bucket text,p_kind text,p_day date,p_quantity int,p_cents bigint,p_note text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();r private.finance_entries;price bigint;total bigint;c private.finance_clients;
begin
 if p_request_id is null or p_day is null or p_day<'2000-01-01' or p_day>'2100-12-31' or p_note is null or length(p_note)>2000 then raise exception 'Registro inválido.';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into r from private.finance_entries where request_id=p_request_id;
 if found then
  if r.client_id is distinct from p_client_id or r.bucket is distinct from p_bucket or r.kind is distinct from p_kind or r.day is distinct from p_day or r.quantity is distinct from p_quantity or r.note is distinct from p_note or (p_kind<>'aula' and r.cents is distinct from p_cents) then raise exception 'Identificador já usado para outro registro.';end if;
  return to_jsonb(r);
 end if;
 if p_client_id is not null then
  select * into c from private.finance_clients where id=p_client_id and not archived;
  if not found or c.bucket is distinct from p_bucket then raise exception 'Aluno e personal não correspondem.';end if;
 end if;
 if p_kind='aula' then
  if p_client_id is null or p_quantity is null or p_quantity not between 1 and 100 or p_cents is not null then raise exception 'Selecione aluno, data e quantidade. O valor vem do cadastro.';end if;
  select cents into price from private.finance_rates where client_id=p_client_id and starts_on<=p_day order by starts_on desc limit 1;
  if price is null then raise exception 'Sem valor cadastrado para esta data. Revise o cadastro antes de registrar.';end if;
  total:=price*p_quantity;
 else
  if p_quantity is distinct from 1 or p_cents is null then raise exception 'Informe o valor.';end if;
  total:=p_cents;
 end if;
 insert into private.finance_entries(request_id,client_id,bucket,kind,day,quantity,unit_cents,cents,status,note)
 values(p_request_id,p_client_id,p_bucket,p_kind,p_day,p_quantity,price,total,'confirmado',p_note) returning * into r;return to_jsonb(r);
end$$;
create function public.finance_entry_cancel(p_id uuid,p_version int) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();r private.finance_entries;
begin
 update private.finance_entries set status='cancelado' where id=p_id and version=p_version and status<>'cancelado' returning * into r;
 if not found then raise exception 'Registro alterado. Atualize antes de corrigir.' using errcode='40001';end if;return to_jsonb(r);
end$$;
do $$declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('finance_workspace','finance_client_create','finance_entry_create','finance_entry_cancel') loop
 execute format('revoke all on function %s from public,anon',f.signature);execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end$$;
commit;
