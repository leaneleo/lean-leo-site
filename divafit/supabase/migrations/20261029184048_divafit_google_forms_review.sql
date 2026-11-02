create function private.review_google_forms(p_key text default null,p_student uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r private.forms_receipts;s public.students;merged jsonb;kv record;begin
 if coalesce(private.divafit_role(),'')<>'admin' then raise exception 'Acesso não autorizado';end if;
 if p_key is null then return coalesce((select jsonb_agg(jsonb_build_object('key',event_key,'name',payload->>'name','received_at',created_at)) from (select * from private.forms_receipts where state='A revisar' order by created_at limit 50) pending),'[]'::jsonb);end if;
 select * into r from private.forms_receipts where event_key=p_key and state='A revisar' for update;if not found then raise exception 'Pendência não encontrada ou já revisada';end if;
 select * into s from public.students where id=p_student and not archived for update;if not found then raise exception 'Escolha um aluno existente';end if;
 merged:=s.training_profile;
 for kv in select key,value from jsonb_each(r.payload->'training_profile') loop if (not merged?kv.key or merged->kv.key='null'::jsonb or merged->>kv.key='') and kv.value<>'null'::jsonb then merged:=jsonb_set(merged,array[kv.key],kv.value);end if;end loop;
 merged:=jsonb_set(merged,'{form_entries}',coalesce(merged->'form_entries','[]'::jsonb)||jsonb_build_array(r.payload->'entry'));
 update public.students set training_profile=merged,phone=coalesce(phone,nullif(r.payload->>'phone','')),birth_date=coalesce(birth_date,nullif(r.payload->>'birth_date','')::date) where id=s.id;
 update private.forms_receipts set student_id=s.id,state='Recebido' where event_key=p_key;
 return jsonb_build_object('ok',true);
end;$$;
revoke all on function private.review_google_forms(text,uuid) from public;grant execute on function private.review_google_forms(text,uuid) to authenticated;
create function public.review_google_forms(p_key text default null,p_student uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.review_google_forms(p_key,p_student)$$;
revoke all on function public.review_google_forms(text,uuid) from public,anon;grant execute on function public.review_google_forms(text,uuid) to authenticated;
