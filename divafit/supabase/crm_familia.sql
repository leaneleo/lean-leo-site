-- CRM (funil de leads) e despesas da família. Dados somente no esquema privado.
-- Acesso apenas por funções que exigem administrador real (private.finance_require_admin).
-- Não altera pagamentos, alunos, treinos nem o checkout.
begin;

-- 1. Funil de leads -------------------------------------------------------
create table private.crm_leads(
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 1 and 200),
 phone text check(phone is null or phone ~ '^[0-9]{10,15}$'),
 origin text not null default 'Instagram direct' check(origin in ('Instagram direct','Instagram comentário','Instagram story','WhatsApp','Indicação','Site','Checkout','Outro')),
 interest text not null default 'A definir' check(interest in ('Mensal','Trimestral','Desafio DIVAFIT','Avaliação física','Personal presencial','A definir')),
 stage text not null default 'novo' check(stage in ('novo','conversando','link_enviado','comprou','perdido')),
 responsible text not null default 'Leandro' check(responsible in ('Leandro','Leonardo')),
 next_on date,
 last_contact_on date,
 notes text not null default '' check(length(notes)<=4000),
 lost_reason text not null default '' check(length(lost_reason)<=500),
 student_id uuid references public.students(id),
 archived boolean not null default false,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),version int not null default 1
);
create index crm_leads_stage on private.crm_leads(stage) where not archived;
alter table private.crm_leads enable row level security;
create policy no_direct_access on private.crm_leads for all to public using(false) with check(false);
revoke all on private.crm_leads from public,anon,authenticated;
create trigger stamp before insert or update on private.crm_leads for each row execute function private.divafit_stamp();
create trigger audit after insert or update on private.crm_leads for each row execute function private.divafit_audit();

create function public.crm_leads() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();
begin
 return coalesce((select jsonb_agg(to_jsonb(l) order by l.created_at desc) from private.crm_leads l where not l.archived),'[]');
end$$;

create function public.crm_lead_save(p_id uuid,p_version int,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();
r private.crm_leads;
v_phone text:=nullif(regexp_replace(coalesce(p_data->>'phone',''),'[^0-9]','','g'),'');
begin
 if p_data is null or jsonb_typeof(p_data)<>'object' or length(trim(coalesce(p_data->>'name','')))=0 then raise exception 'Informe o nome do lead.';
 end if;
 if p_id is null then
  insert into private.crm_leads(name,phone,origin,interest,stage,responsible,next_on,last_contact_on,notes,lost_reason,student_id)
  values(trim(p_data->>'name'),v_phone,coalesce(p_data->>'origin','Instagram direct'),coalesce(p_data->>'interest','A definir'),coalesce(p_data->>'stage','novo'),
   coalesce(p_data->>'responsible','Leandro'),nullif(p_data->>'next_on','')::date,coalesce(nullif(p_data->>'last_contact_on','')::date,(now() at time zone 'America/Sao_Paulo')::date),
   coalesce(p_data->>'notes',''),coalesce(p_data->>'lost_reason',''),nullif(p_data->>'student_id','')::uuid)
  returning * into r;
 else
  update private.crm_leads set name=trim(p_data->>'name'),phone=v_phone,origin=coalesce(p_data->>'origin',origin),interest=coalesce(p_data->>'interest',interest),
   stage=coalesce(p_data->>'stage',stage),responsible=coalesce(p_data->>'responsible',responsible),next_on=nullif(p_data->>'next_on','')::date,
   last_contact_on=coalesce(nullif(p_data->>'last_contact_on','')::date,last_contact_on),notes=coalesce(p_data->>'notes',notes),
   lost_reason=coalesce(p_data->>'lost_reason',lost_reason),student_id=nullif(p_data->>'student_id','')::uuid
  where id=p_id and version=p_version and not archived returning * into r;
  if not found then raise exception 'Este lead foi alterado. Atualize antes de salvar.' using errcode='40001';
  end if;
 end if;
 return to_jsonb(r);
end$$;

create function public.crm_lead_archive(p_id uuid,p_version int) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();
begin
 update private.crm_leads set archived=true where id=p_id and version=p_version and not archived;
 if not found then raise exception 'Este lead foi alterado. Atualize antes de arquivar.' using errcode='40001';
 end if;
end$$;

-- 2. Despesas da família --------------------------------------------------
alter table private.finance_entries add column category text check(category is null or category in
 ('Moradia','Mercado','Contas da casa','Transporte','Saúde','Educação','Lazer','Cartão de crédito','Equipe (Elisângela)','Ferramentas e sistemas','Impostos e taxas','Outros'));

create function public.finance_expense_create(p_request_id uuid,p_day date,p_cents bigint,p_category text,p_note text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();
r private.finance_entries;
begin
 if p_request_id is null or p_day is null or p_day<'2000-01-01' or p_day>'2100-12-31' or p_cents is null or p_cents<=0 or p_cents>10000000000
  or p_category is null or p_note is null or length(p_note)>2000 then raise exception 'Informe data, valor e categoria do gasto.';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into r from private.finance_entries where request_id=p_request_id;
 if found then
  if r.kind<>'despesa' or r.day is distinct from p_day or r.cents is distinct from p_cents or r.category is distinct from p_category or r.note is distinct from p_note then
   raise exception 'Identificador já usado para outro registro.';
  end if;
  return to_jsonb(r);
 end if;
 insert into private.finance_entries(request_id,client_id,bucket,kind,day,quantity,unit_cents,cents,status,note,category)
 values(p_request_id,null,'familia','despesa',p_day,1,null,p_cents,'confirmado',p_note,p_category) returning * into r;
 return to_jsonb(r);
end$$;

do $$declare f record;
begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('crm_leads','crm_lead_save','crm_lead_archive','finance_expense_create') loop
  execute format('revoke all on function %s from public,anon',f.signature);
  execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end$$;

commit;

-- 3. Relatórios InfinitePay importados em 20/11/2026: período coberto por relatório.
-- O painel usa cobertura_fim para não somar outra vez pagamentos do mesmo período.
update private.finance_entries set source = source || jsonb_build_object(
 'cobertura_inicio', case when source_key like 'infinitepay:2024-11-20_2025-11-19:%' then '2024-11-20' else '2025-11-20' end,
 'cobertura_fim', case when source_key like 'infinitepay:2024-11-20_2025-11-19:%' then '2025-11-19' else '2026-11-20' end)
 where source_key like 'infinitepay:%';
