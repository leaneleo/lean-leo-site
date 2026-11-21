alter table public.assignments add column in_training_library boolean;

CREATE OR REPLACE FUNCTION public.save_student_routine(p_student uuid, p_routine uuid, p_version integer, p_fields jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
original_phase=nullif(p_fields->>'original_phase',''),expected_phase=nullif(p_fields->>'expected_phase',''),predominant_methods=nullif(p_fields->>'predominant_methods',''),routine_kind=k,in_training_library=case when p_fields ? 'in_training_library' then nullif(p_fields->>'in_training_library','')::boolean else in_training_library end,observations=nullif(p_fields->>'observations','') where id=aid;
-- Mirror only when this model belongs exclusively to the routine. Never mutate a shared source.
if (select count(*) from public.assignments where workout_id=wid and not archived)=1 then
update public.workouts set name=coalesce(nullif(trim(p_fields->>'routine_name'),''),name),format=nullif(p_fields->>'format',''),methods=nullif(p_fields->>'predominant_methods',''),count_as_new=k='Nova' where id=wid;end if;
return aid;end $function$;
