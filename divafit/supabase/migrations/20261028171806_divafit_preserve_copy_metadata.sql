create or replace function public.prepare_training_copy(source_assignment uuid,source_version int,target_student uuid,new_number text,target_volume numeric,as_new boolean default false)
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
insert into public.workouts(name,format,methods,groups_text,classification,notes,source_url,count_as_new,method_level,import_data)
values(w.name||' · adaptação',w.format,w.methods,w.groups_text,w.classification,'Adaptação em preparação. Rever equipamentos, queixas e objetivos.',w.source_url,as_new,w.method_level,w.import_data||jsonb_build_object('copy_of_workout',w.id,'planning_target',target_volume)) returning id into wid;
insert into public.assignments(student_id,workout_id,number,status,original_phase,expected_phase,expected_vssam,original_vssam,weekly_frequency,volume_grid,source_ids,source_notes,notes,import_data)
values(target_student,wid,new_number,'Em elaboração',src.original_phase,src.expected_phase,src.expected_vssam,src.original_vssam,src.weekly_frequency,src.volume_grid,array[src.id],
'Cópia integral como ponto de partida; registrar partes aproveitadas e alterações.',
'Rascunho: validade e adequações individuais pendentes. Não liberado na Mfit. VSSAM esperado alvo: '||target_volume::text,src.import_data||jsonb_build_object('copy_of_assignment',src.id,'planning_target',target_volume)) returning id into aid;
return aid;end $copy$;
revoke all on function public.prepare_training_copy(uuid,int,uuid,text,numeric,boolean) from public,anon;
grant execute on function public.prepare_training_copy(uuid,int,uuid,text,numeric,boolean) to authenticated;
