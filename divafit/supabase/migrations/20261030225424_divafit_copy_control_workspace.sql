alter table public.assignments add column copy_control jsonb not null default '{}' check(jsonb_typeof(copy_control)='object');
create function public.save_copy_control(p_assignment uuid,p_version int,p_number text,p_name text,p_payload jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.assignments;entry jsonb;ids uuid[]:='{}';sid uuid;v text;k text;begin
 if coalesce(private.divafit_role(),'') not in ('admin','trainer') then raise exception 'Acesso não autorizado';end if;
 select * into a from public.assignments where id=p_assignment and not archived for update;
 if not found or a.version<>p_version then raise exception 'A ficha mudou. Atualize os dados antes de salvar.';end if;
 if coalesce(trim(p_number),'')='' then raise exception 'Informe o número da ficha';end if;
 if jsonb_typeof(p_payload)<>'object' or jsonb_typeof(p_payload->'sources')<>'array' or jsonb_array_length(p_payload->'sources')>30 or octet_length(p_payload::text)>100000 then raise exception 'Controle de cópia inválido';end if;
 for entry in select value from jsonb_array_elements(p_payload->'sources') loop
  if jsonb_typeof(entry)<>'object' then raise exception 'Origem inválida';end if;
  foreach k in array array['original_vssam','expected_vssam'] loop v:=nullif(entry->>k,'');if v is not null and (v!~'^\d+(\.\d+)?$' or v::numeric<0) then raise exception 'Confira os volumes da origem';end if;end loop;
  sid:=nullif(entry->>'assignment_id','')::uuid;
  if sid is not null then
   if sid=a.id or not exists(select 1 from public.assignments where id=sid and not archived) then raise exception 'Ficha de origem indisponível';end if;
   if not sid=any(ids) then ids:=array_append(ids,sid);end if;
  end if;
 end loop;
 update public.assignments set number=trim(p_number),routine_name=nullif(trim(p_name),''),source_ids=ids,copy_control=p_payload||jsonb_build_object('saved_at',now()) where id=a.id;
 return a.id;
end;$$;
revoke all on function public.save_copy_control(uuid,int,text,text,jsonb) from public,anon;grant execute on function public.save_copy_control(uuid,int,text,text,jsonb) to authenticated;
