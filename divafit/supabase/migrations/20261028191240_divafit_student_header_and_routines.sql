alter table public.students add column birth_date date,add column training_profile jsonb not null default '{}' check(jsonb_typeof(training_profile)='object');
alter table public.assignments add column routine_name text,add column predominant_methods text,add column routine_kind text not null default 'Nova' check(routine_kind in ('Nova','Igual')),add column observations text;
create table public.routine_notes(id uuid primary key default gen_random_uuid(),assignment_id uuid not null references public.assignments(id),origin text not null check(origin in ('Equipe','Aluno')),body text not null check(length(trim(body))>0),notes text,archived boolean not null default false,version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id));
create index routine_notes_assignment_idx on routine_notes(assignment_id);create index routine_notes_updated_by_idx on routine_notes(updated_by);
alter table public.routine_notes enable row level security;revoke all on public.routine_notes from anon,authenticated;grant select,insert,update on public.routine_notes to authenticated;
create policy team_read on public.routine_notes for select to authenticated using((select private.divafit_role()) in ('admin','trainer'));
create policy team_insert on public.routine_notes for insert to authenticated with check((select private.divafit_role()) in ('admin','trainer'));
create policy team_update on public.routine_notes for update to authenticated using((select private.divafit_role()) in ('admin','trainer')) with check((select private.divafit_role()) in ('admin','trainer'));
create trigger stamp before insert or update on public.routine_notes for each row execute function private.divafit_stamp();
create trigger audit after insert or update on public.routine_notes for each row execute function private.divafit_audit();
create function public.save_student_routine(p_student uuid,p_routine uuid,p_version int,p_fields jsonb)
returns uuid language plpgsql security invoker set search_path='' as $routine$
declare a public.assignments; wid uuid;aid uuid;k text;begin
if coalesce(private.divafit_role(),'') not in ('admin','trainer') then raise exception 'Acesso não autorizado';end if;
if not exists(select 1 from public.students where id=p_student and not archived) then raise exception 'Aluno indisponível';end if;
if coalesce(trim(p_fields->>'number'),'')='' then raise exception 'Informe o número da rotina';end if;
k:=coalesce(p_fields->>'routine_kind','Nova');if k not in ('Nova','Igual') then raise exception 'Originalidade inválida';end if;
if p_routine is not null then
select * into a from public.assignments where id=p_routine and student_id=p_student and not archived for update;
if not found or a.version<>p_version then raise exception 'Outra pessoa alterou esta rotina. Atualize antes de salvar.';end if;wid:=a.workout_id;aid:=a.id;
else
insert into public.workouts(name,format,methods,count_as_new) values(coalesce(nullif(trim(p_fields->>'routine_name'),''),'Ficha '||(p_fields->>'number')),nullif(p_fields->>'format',''),nullif(p_fields->>'predominant_methods',''),k='Nova') returning id into wid;
insert into public.assignments(student_id,workout_id,number,status,routine_kind) values(p_student,wid,p_fields->>'number','Em elaboração',k) returning id into aid;
end if;
update public.assignments set number=trim(p_fields->>'number'),routine_name=nullif(trim(p_fields->>'routine_name'),''),starts_on=nullif(p_fields->>'starts_on','')::date,ends_on=nullif(p_fields->>'ends_on','')::date,
weekly_frequency=nullif(p_fields->>'weekly_frequency','')::int,original_vssam=nullif(p_fields->>'original_vssam','')::numeric,expected_vssam=nullif(p_fields->>'expected_vssam','')::numeric,
original_phase=nullif(p_fields->>'original_phase',''),expected_phase=nullif(p_fields->>'expected_phase',''),predominant_methods=nullif(p_fields->>'predominant_methods',''),routine_kind=k,observations=nullif(p_fields->>'observations','') where id=aid;
-- Mirror only when this model belongs exclusively to the routine. Never mutate a shared source.
if (select count(*) from public.assignments where workout_id=wid and not archived)=1 then
update public.workouts set name=coalesce(nullif(trim(p_fields->>'routine_name'),''),name),format=nullif(p_fields->>'format',''),methods=nullif(p_fields->>'predominant_methods',''),count_as_new=k='Nova' where id=wid;end if;
return aid;end $routine$;
revoke all on function public.save_student_routine(uuid,uuid,int,jsonb) from public,anon;grant execute on function public.save_student_routine(uuid,uuid,int,jsonb) to authenticated;
