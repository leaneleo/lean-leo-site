create table public.production_cases(
id uuid primary key default gen_random_uuid(),student_id uuid not null references public.students(id),
kind text not null check(kind in ('Novo aluno','Renovação')),stage int not null default 0 check(stage between 0 and 5),
due_on date,payload jsonb not null default '{}' check(jsonb_typeof(payload)='object'),notes text,
completed_on date,archived boolean not null default false,version int not null default 1,
created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id));
create unique index production_one_open on public.production_cases(student_id) where not archived and completed_on is null;
create index production_due_idx on public.production_cases(due_on) where not archived;
create index production_updated_by_idx on public.production_cases(updated_by);
create table public.instructions(
id uuid primary key default gen_random_uuid(),title text not null check(length(trim(title))>0),
category text not null default 'Geral',body text not null check(length(trim(body))>0),source_url text,
reviewed boolean not null default false,notes text,archived boolean not null default false,version int not null default 1,
created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id));
create index instructions_updated_by_idx on public.instructions(updated_by);
do $policies$ declare t text;begin foreach t in array array['production_cases','instructions'] loop
execute format('alter table public.%I enable row level security',t);
execute format('revoke all on public.%I from anon,authenticated',t);
execute format('grant select,insert,update on public.%I to authenticated',t);
execute format('create policy team_read on public.%I for select to authenticated using((select private.divafit_role()) in (''admin'',''trainer''))',t);
execute format('create policy team_insert on public.%I for insert to authenticated with check((select private.divafit_role()) in (''admin'',''trainer''))',t);
execute format('create policy team_update on public.%I for update to authenticated using((select private.divafit_role()) in (''admin'',''trainer'')) with check((select private.divafit_role()) in (''admin'',''trainer''))',t);
execute format('create trigger stamp before insert or update on public.%I for each row execute function private.divafit_stamp()',t);
execute format('create trigger audit after insert or update on public.%I for each row execute function private.divafit_audit()',t);
end loop;end $policies$;
create function public.prepare_training_copy(source_assignment uuid,source_version int,target_student uuid,new_number text,target_volume numeric,as_new boolean default false)
returns uuid language plpgsql security invoker set search_path='' as $copy$
declare src public.assignments;w public.workouts;wid uuid;aid uuid;
begin
if coalesce(private.divafit_role(),'') not in ('admin','trainer') then raise exception 'Acesso não autorizado';end if;
select * into src from public.assignments where id=source_assignment and not archived for share;
if not found or src.version<>source_version then raise exception 'A ficha de origem mudou. Atualize as sugestões.';end if;
select * into w from public.workouts where id=src.workout_id and not archived;
if not found then raise exception 'Modelo de origem indisponível';end if;
if not exists(select 1 from public.students where id=target_student and not archived) then raise exception 'Aluno indisponível';end if;
if target_volume is null or target_volume<20 then raise exception 'Informe o VSSAM alvo';end if;
insert into public.workouts(name,format,methods,groups_text,classification,notes,source_url,count_as_new)
values(w.name||' · adaptação',w.format,w.methods,w.groups_text,w.classification,'Adaptação em preparação. Rever equipamentos, queixas e objetivos.',w.source_url,as_new) returning id into wid;
insert into public.assignments(student_id,workout_id,number,status,original_phase,expected_vssam,original_vssam,weekly_frequency,volume_grid,source_ids,source_notes,notes)
values(target_student,wid,new_number,'Em elaboração',src.original_phase,target_volume,src.original_vssam,src.weekly_frequency,src.volume_grid,array[src.id],
'Cópia integral como ponto de partida; registrar partes aproveitadas e alterações.',
'Rascunho: validade e adequações individuais pendentes. Não liberado na Mfit.') returning id into aid;
return aid;end $copy$;
revoke all on function public.prepare_training_copy(uuid,int,uuid,text,numeric,boolean) from public,anon;
grant execute on function public.prepare_training_copy(uuid,int,uuid,text,numeric,boolean) to authenticated;
