create table private.forms_connection(id boolean primary key default true check(id),token_hash text,created_at timestamptz,last_received_at timestamptz);
alter table private.forms_connection enable row level security;
create table private.forms_receipts(event_key text primary key,student_id uuid references public.students(id),state text not null,payload jsonb not null,created_at timestamptz not null default now());
alter table private.forms_receipts enable row level security;
create index forms_receipts_student_idx on private.forms_receipts(student_id);
revoke all on private.forms_connection,private.forms_receipts from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert,update on private.forms_connection,private.forms_receipts to service_role;
create function private.configure_google_form(p_hash text) returns void language plpgsql security definer set search_path='' as $$begin
 if coalesce(private.divafit_role(),'')<>'admin' then raise exception 'Acesso não autorizado';end if;
 if p_hash!~'^[a-f0-9]{64}$' then raise exception 'Chave inválida';end if;
 insert into private.forms_connection(id,token_hash,created_at) values(true,p_hash,now()) on conflict(id) do update set token_hash=excluded.token_hash,created_at=now();
end;$$;
revoke all on function private.configure_google_form(text) from public;grant execute on function private.configure_google_form(text) to authenticated;
create function public.configure_google_form(p_hash text) returns void language sql security invoker set search_path='' as $$select private.configure_google_form(p_hash)$$;
revoke all on function public.configure_google_form(text) from public,anon;grant execute on function public.configure_google_form(text) to authenticated;
create function private.google_form_status() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if coalesce(private.divafit_role(),'')<>'admin' then raise exception 'Acesso não autorizado';end if;
 return jsonb_build_object('configured',exists(select 1 from private.forms_connection),'last_received_at',(select last_received_at from private.forms_connection),'received',(select count(*) from private.forms_receipts),'pending',(select count(*) from private.forms_receipts where state='A revisar'));
end;$$;
revoke all on function private.google_form_status() from public;grant execute on function private.google_form_status() to authenticated;
create function public.google_form_status() returns jsonb language sql security invoker set search_path='' as $$select private.google_form_status()$$;
revoke all on function public.google_form_status() from public,anon;grant execute on function public.google_form_status() to authenticated;
create function public.receive_google_form(p_hash text,p_key text,p_data jsonb) returns text language plpgsql security invoker set search_path='' as $$
declare sid uuid;matches uuid[];s public.students;incoming jsonb;merged jsonb;kv record;matched boolean;begin
 if not exists(select 1 from private.forms_connection where token_hash=p_hash and length(p_hash)=64) then raise exception 'Não autorizado' using errcode='28000';end if;
 if p_data->'entry'->>'form_id'<>'1sh8auc4F7zdrqVv-pl3ERwey6nKfE7dzWPx1U_7fgg4' or coalesce(trim(p_data->>'name'),'')='' or length(p_key)>500 or octet_length(p_data::text)>300000 then raise exception 'Resposta inválida';end if;
 -- Serializa cadastro e deduplicação inclusive para eventos simultâneos.
 perform pg_advisory_xact_lock(20261029,1701);
 if exists(select 1 from private.forms_receipts where event_key=p_key) then return 'Já recebido';end if;
 select array_agg(id) into matches from public.students where not archived and (
 (nullif(p_data->>'email','') is not null and lower(training_profile->>'email')=lower(p_data->>'email')) or
 (nullif(p_data->>'phone','') is not null and regexp_replace(phone,'^55','')=regexp_replace(p_data->>'phone','^55','')) or
 (translate(regexp_replace(lower(trim(name)),'\s+',' ','g'),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')=translate(regexp_replace(lower(trim(p_data->>'name')),'\s+',' ','g'),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')));
 if coalesce(cardinality(matches),0)>1 then
 insert into private.forms_receipts(event_key,state,payload) values(p_key,'A revisar',p_data);
 update private.forms_connection set last_received_at=now();return 'A revisar: mais de um cadastro compatível';end if;
 incoming:=coalesce(p_data->'training_profile','{}'::jsonb);
 if coalesce(cardinality(matches),0)=1 then
 sid:=matches[1];select * into s from public.students where id=sid for update;merged:=s.training_profile;
 -- Preenche somente lacunas. Informações atuais da Mfit/equipe têm prioridade.
 for kv in select key,value from jsonb_each(incoming) loop if (not merged?kv.key or merged->kv.key='null'::jsonb or merged->>kv.key='') and kv.value<>'null'::jsonb then merged:=jsonb_set(merged,array[kv.key],kv.value);end if;end loop;
 merged:=jsonb_set(merged,'{form_entries}',coalesce(merged->'form_entries','[]'::jsonb)||jsonb_build_array(p_data->'entry'));
 update public.students set training_profile=merged,phone=coalesce(phone,nullif(p_data->>'phone','')),birth_date=coalesce(birth_date,nullif(p_data->>'birth_date','')::date) where id=sid;
 else
 merged:=incoming||jsonb_build_object('form_entries',jsonb_build_array(p_data->'entry'));
 insert into public.students(name,phone,birth_date,training_profile,status,modality,source_url,import_data) values(trim(p_data->>'name'),nullif(p_data->>'phone',''),nullif(p_data->>'birth_date','')::date,merged,'A revisar','Online','https://docs.google.com/forms/d/1sh8auc4F7zdrqVv-pl3ERwey6nKfE7dzWPx1U_7fgg4/edit',jsonb_build_object('source','Google Forms')) returning id into sid;
 end if;
 insert into private.forms_receipts(event_key,student_id,state,payload) values(p_key,sid,'Recebido',p_data);
 update private.forms_connection set last_received_at=now();return 'Recebido';
end;$$;
revoke all on function public.receive_google_form(text,text,jsonb) from public,anon,authenticated;grant execute on function public.receive_google_form(text,text,jsonb) to service_role;
