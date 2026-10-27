begin;
create schema private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create table public.team_members(user_id uuid primary key references auth.users(id),display_name text not null,role text not null check(role in ('admin','trainer')));
alter table public.team_members enable row level security;
create function private.divafit_role() returns text language sql stable security definer set search_path='' as $$ select role from public.team_members where (select auth.uid()) is not null and user_id=(select auth.uid()) $$;
revoke all on function private.divafit_role() from public;grant execute on function private.divafit_role() to authenticated;
create policy own_membership on public.team_members for select to authenticated using(user_id=(select auth.uid()));
grant select on public.team_members to authenticated;

create table public.students(
 id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name))>0),phone text,
 status text not null default 'A revisar' check(status in ('Ativo','Pausado','Encerrado','A revisar')),
 modality text not null default 'Online',phase text,notes text,source_url text,
 whatsapp_consent boolean not null default false,consent_note text,
 archived boolean not null default false,version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),
 check(phone is null or phone ~ '^[0-9]{10,15}$'),check(not whatsapp_consent or length(trim(coalesce(consent_note,'')))>0)
);
create table public.workouts(
 id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name))>0),format text,methods text,
 groups_text text,classification text,notes text,source_url text,count_as_new boolean not null default false,
 archived boolean not null default false,version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id)
);
create table public.assignments(
 id uuid primary key default gen_random_uuid(),student_id uuid not null references public.students(id),workout_id uuid not null references public.workouts(id),number text not null check(length(trim(number))>0),
 starts_on date,ends_on date,weekly_frequency int check(weekly_frequency between 1 and 7),
 status text not null default 'Em elaboração' check(status in ('Em elaboração','Em revisão','Liberada','Substituída')),released_at timestamptz,
 original_phase text,expected_phase text,original_vssam numeric check(original_vssam>=0),expected_vssam numeric check(expected_vssam>=0),
 source_ids uuid[] not null default '{}',source_notes text,volume_grid jsonb not null default '[]',notes text,source_url text,
 archived boolean not null default false,version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),
 check(ends_on is null or starts_on is null or ends_on>=starts_on)
);
create unique index assignment_number_unique on public.assignments(student_id,lower(trim(number))) where not archived;
create index assignments_ends on public.assignments(ends_on) where not archived;
create table public.payments(
 id uuid primary key default gen_random_uuid(),student_ids uuid[] not null,plan text not null,
 starts_on date,ends_on date,reference text,amount numeric(12,2) check(amount>=0),due_on date,paid_on date,
 status text not null default 'A revisar' check(status in ('A revisar','Pendente','Pago','Prorrogado','Cancelado')),payment_method text,notes text,source_url text,
 archived boolean not null default false,version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),
 check(cardinality(student_ids)>0),check(status<>'Pago' or (amount is not null and paid_on is not null)),check(ends_on is null or starts_on is null or ends_on>=starts_on)
);
create table public.tasks(
 id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name))>0),student_id uuid references public.students(id),due_on date,
 responsible text not null default 'Elisângela',status text not null default 'A preparar' check(status in ('A preparar','Em elaboração','Em revisão','Entregue')),notes text,
 archived boolean not null default false,version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id)
);
create table public.message_receipts(
 id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.assignments(id),assignment_version int not null,kind text not null check(kind in ('ready','expiry')),event_date date not null default (now() at time zone 'America/Sao_Paulo')::date,
 status text not null check(status='Confirmado manualmente'),archived boolean not null default false,
 version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),unique(assignment_id,kind,event_date)
);
create table public.audit_log(id bigint generated always as identity primary key,table_name text not null,record_id uuid not null,actor uuid,at timestamptz not null default now(),old_value jsonb,new_value jsonb);
alter table public.audit_log enable row level security;
create policy admin_audit on public.audit_log for select to authenticated using((select private.divafit_role())='admin');
grant select on public.audit_log to authenticated;
create function private.divafit_stamp() returns trigger language plpgsql set search_path='' as $$begin
 new.updated_at=now();new.updated_by=auth.uid();
 if TG_OP='UPDATE' then new.version=old.version+1;new.created_at=old.created_at;else new.version=1;new.created_at=now();end if;
 return new;end;$$;
create function private.divafit_audit() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.audit_log(table_name,record_id,actor,old_value,new_value) values(TG_TABLE_NAME,new.id,auth.uid(),case when TG_OP='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));return new;end;$$;
create function private.divafit_assignment_check() returns trigger language plpgsql set search_path='' as $$declare entry jsonb; cell jsonb;begin
 if TG_OP='INSERT' then new.released_at=case when new.status='Liberada' then now() else null end;
 elsif new.status='Liberada' and old.status<>'Liberada' then new.released_at=now();else new.released_at=old.released_at;end if;
 if new.id=any(new.source_ids) then raise exception 'Uma ficha não pode ser origem dela mesma';end if;
 if exists(select 1 from unnest(new.source_ids) s where not exists(select 1 from public.assignments a where a.id=s)) then raise exception 'Ficha de origem não encontrada';end if;
 if exists(with recursive origins as(select a.id,a.source_ids from public.assignments a where a.id=any(new.source_ids) union select a.id,a.source_ids from public.assignments a join origins o on a.id=any(o.source_ids))select 1 from origins where new.id=any(source_ids)) then raise exception 'As origens formam um ciclo';end if;
 if jsonb_typeof(new.volume_grid)<>'array' or jsonb_array_length(new.volume_grid)>13 then raise exception 'Tabela de volume inválida';end if;
 for entry in select value from jsonb_array_elements(new.volume_grid) loop
 if jsonb_typeof(entry)<>'array' or jsonb_array_length(entry)>7 then raise exception 'Linha de volume inválida';end if;
 for cell in select value from jsonb_array_elements(entry) loop
 if jsonb_typeof(cell) not in ('number','null') then raise exception 'Volume inválido';end if;
 if jsonb_typeof(cell)='number' and (cell::text)::numeric<0 then raise exception 'Volume negativo';end if;
 end loop;end loop;return new;end;$$;
create trigger assignment_check before insert or update on public.assignments for each row execute function private.divafit_assignment_check();
create function private.divafit_payment_check() returns trigger language plpgsql set search_path='' as $$begin
 if exists(select 1 from unnest(new.student_ids) s where not exists(select 1 from public.students a where a.id=s)) then raise exception 'Aluno do plano não encontrado';end if;return new;end;$$;
create trigger payment_check before insert or update on public.payments for each row execute function private.divafit_payment_check();
do $$declare t text;begin
 foreach t in array array['students','workouts','assignments','tasks','payments','message_receipts'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select,insert,update on public.%I to authenticated',t);
 if t='payments' then
 execute format('create policy member_read on public.%I for select to authenticated using((select private.divafit_role())=''admin'')',t);
 execute format('create policy member_insert on public.%I for insert to authenticated with check((select private.divafit_role())=''admin'')',t);
 execute format('create policy member_update on public.%I for update to authenticated using((select private.divafit_role())=''admin'') with check((select private.divafit_role())=''admin'')',t);
 else
 execute format('create policy member_read on public.%I for select to authenticated using((select private.divafit_role()) in (''admin'',''trainer''))',t);
 execute format('create policy member_insert on public.%I for insert to authenticated with check((select private.divafit_role()) in (''admin'',''trainer''))',t);
 execute format('create policy member_update on public.%I for update to authenticated using((select private.divafit_role()) in (''admin'',''trainer'')) with check((select private.divafit_role()) in (''admin'',''trainer''))',t);
 end if;
 execute format('create trigger stamp before insert or update on public.%I for each row execute function private.divafit_stamp()',t);
 execute format('create trigger audit after insert or update on public.%I for each row execute function private.divafit_audit()',t);
 end loop;end;$$;
-- Bloqueia alterações de permissões feitas pelo navegador. Cadastrar membros somente via administração.
revoke all on public.team_members from anon,authenticated;grant select on public.team_members to authenticated;
revoke all on public.audit_log from anon,authenticated;grant select on public.audit_log to authenticated;
revoke all on function private.divafit_stamp(),private.divafit_audit(),private.divafit_assignment_check(),private.divafit_payment_check() from public;
create index assignments_student_idx on public.assignments(student_id);
create index assignments_workout_idx on public.assignments(workout_id);
create index tasks_student_idx on public.tasks(student_id);
do $$declare t text;begin foreach t in array array['students','workouts','assignments','tasks','payments','message_receipts'] loop execute format('create index %I on public.%I(updated_by)',t||'_updated_by_idx',t);end loop;end;$$;
commit;
