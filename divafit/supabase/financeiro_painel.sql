begin;
create table private.finance_contacts(
 id uuid primary key default gen_random_uuid(),bucket text not null check(bucket in ('leandro','leonardo')),
 name text not null,client_codes text[] not null,address text not null default '',closing text not null default '',
 source jsonb not null default '{}',
 template text not null default '{saudacao} {tratamento}\n*FECHAMENTO {mes} - {ano}*\n{detalhes}\nTotal: {valor}\n{despedida}',
 version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),
 unique(bucket,name),check(cardinality(client_codes)>0),check(length(template)<=4000)
);
create table private.finance_products(
 id uuid primary key default gen_random_uuid(),slug text not null unique,name text not null,category text not null check(category in ('consultoria','desafio','ebooks','emagreciencia','verao')),
 duration text not null default '',price_cents bigint check(price_cents between 0 and 100000000),
 pix_cents bigint check(pix_cents between 0 and 100000000),deliverables text[] not null default '{}',
 notes text not null default '',checkout_url text,checkout_plan text check(checkout_plan in ('monthly','quarterly')),
 source jsonb not null default '[]',status text not null default 'rascunho' check(status in ('rascunho','revisado')),
 version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),
 check(length(name) between 1 and 200),check(cardinality(deliverables)<=40),check(length(notes)<=4000),
 check(checkout_url is null or checkout_url ~ '^https://(buy[.]infinitepay[.]io|app[.]leeleo[.]com[.]br)/')
);
create table private.finance_closings(
 id uuid primary key default gen_random_uuid(),contact_id uuid not null references private.finance_contacts(id),
 month date not null check(extract(day from month)=1),snapshot jsonb not null,status text not null default 'rascunho' check(status in ('rascunho','aprovado')),
 version int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid references auth.users(id),
 unique(contact_id,month)
);
create table private.finance_provider(
 name text primary key check(name='infinitepay'),handle text not null check(handle~'^[a-zA-Z0-9_.-]{2,80}$'),
 checked_at timestamptz,notes text not null default '',updated_at timestamptz not null default now()
);
do $$declare t text;begin
 foreach t in array array['finance_contacts','finance_products','finance_closings','finance_provider'] loop
 execute format('alter table private.%I enable row level security',t);
 execute format('create policy no_direct_access on private.%I for all to public using(false) with check(false)',t);
 execute format('revoke all on private.%I from public,anon,authenticated',t);
 end loop;
 foreach t in array array['finance_contacts','finance_products','finance_closings'] loop
 execute format('create trigger stamp before insert or update on private.%I for each row execute function private.divafit_stamp()',t);
 execute format('create trigger audit after insert or update on private.%I for each row execute function private.divafit_audit()',t);
 end loop;
end$$;
create function public.finance_catalog() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();begin
 return jsonb_build_object('products',coalesce((select jsonb_agg(to_jsonb(p) order by category,name) from private.finance_products p),'[]'),
 'contacts',coalesce((select jsonb_agg(to_jsonb(c) order by name) from private.finance_contacts c),'[]'),
 'provider',(select jsonb_build_object('handle',handle,'checked_at',checked_at,'notes',notes) from private.finance_provider where name='infinitepay'));
end$$;
create function public.finance_product_save(p_id uuid,p_version int,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();r private.finance_products;begin
 if jsonb_typeof(p_data) is distinct from 'object' or jsonb_typeof(p_data->'deliverables') is distinct from 'array' then raise exception 'Produto inválido';end if;
 if p_id is null then
 insert into private.finance_products(slug,name,category,duration,price_cents,pix_cents,deliverables,notes,checkout_url)
 values('produto-'||gen_random_uuid(),trim(p_data->>'name'),p_data->>'category',coalesce(p_data->>'duration',''),nullif(p_data->>'price_cents','')::bigint,nullif(p_data->>'pix_cents','')::bigint,array(select jsonb_array_elements_text(p_data->'deliverables')),coalesce(p_data->>'notes',''),nullif(p_data->>'checkout_url','')) returning * into r;
 else
 update private.finance_products set name=trim(p_data->>'name'),duration=coalesce(p_data->>'duration',''),price_cents=nullif(p_data->>'price_cents','')::bigint,pix_cents=nullif(p_data->>'pix_cents','')::bigint,deliverables=array(select jsonb_array_elements_text(p_data->'deliverables')),notes=coalesce(p_data->>'notes',''),checkout_url=nullif(p_data->>'checkout_url',''),status='rascunho' where id=p_id and version=p_version returning * into r;
 if not found then raise exception 'Produto alterado. Atualize antes de salvar.' using errcode='40001';end if;
 end if;return to_jsonb(r);
end$$;
create function public.finance_contact_save(p_id uuid,p_version int,p_address text,p_closing text,p_template text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();r private.finance_contacts;begin
 if length(p_address)>200 or length(p_closing)>1000 or length(p_template)>4000 then raise exception 'Texto muito longo';end if;
 update private.finance_contacts set address=coalesce(p_address,''),closing=coalesce(p_closing,''),template=p_template where id=p_id and version=p_version returning * into r;
 if not found then raise exception 'Contato alterado. Atualize antes de salvar.' using errcode='40001';end if;return to_jsonb(r);
end$$;
create function public.finance_rate_save(p_client uuid,p_day date,p_cents bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();r private.finance_rates;begin
 if p_day is null or p_day<'2000-01-01' or p_day>'2100-12-31' or p_cents is null then raise exception 'Valor/data inválidos';end if;
 if not exists(select 1 from private.finance_clients where id=p_client and not archived) then raise exception 'Aluno não encontrado';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_client::text,0));
 if exists(select 1 from private.finance_rates where client_id=p_client and starts_on=p_day) then raise exception 'Já existe tarifa para essa data; use uma nova vigência para preservar o histórico.';end if;
 insert into private.finance_rates(client_id,starts_on,cents,source_key) values(p_client,p_day,p_cents,'reajuste:'||gen_random_uuid()) returning * into r;
 insert into public.audit_log(table_name,record_id,actor,new_value) values('finance_rates',r.id,u,to_jsonb(r));return to_jsonb(r);
end$$;
create function public.finance_classes_register(p_request uuid,p_bucket text,p_day date,p_items jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();item jsonb;r jsonb;result jsonb:='[]';i int:=0;client uuid;members jsonb;rid uuid;
begin
 if p_request is null or p_bucket not in ('leandro','leonardo') or p_day is null or p_day>(now() at time zone 'America/Sao_Paulo')::date or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Confira dia, personal e aulas.';end if;
 if exists(select 1 from jsonb_array_elements(p_items)z cross join lateral jsonb_array_elements_text(coalesce(z->'participants','[]'::jsonb))v group by v having count(*)>1) then raise exception 'Participante repetido no mesmo lote. Confira aulas separadas e grupos.';end if;
 if (select count(distinct x->>'client_id') from jsonb_array_elements(p_items)x)<>jsonb_array_length(p_items) then raise exception 'Modalidade repetida no mesmo lote. Confira as aulas.';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  i:=i+1;client:=(item->>'client_id')::uuid;members:=coalesce(item->'participants','[]'::jsonb);
  if jsonb_typeof(members) is distinct from 'array' or jsonb_array_length(members)>10 then raise exception 'Participantes inválidos';end if;
  if exists(select 1 from jsonb_array_elements_text(members) v where not exists(select 1 from private.finance_clients c where c.id=v::uuid and c.bucket=p_bucket and not c.archived)) then raise exception 'Participante de outro personal ou não cadastrado';end if;
  rid:=md5(p_request::text||':'||i)::uuid;
  r:=public.finance_entry_create(rid,client,p_bucket,'aula',p_day,1,null,coalesce(item->>'note',''));
  if (r->'source') ? 'participants' and r->'source'->'participants' is distinct from members then raise exception 'O atendimento já foi registrado com outros participantes';end if;
  update private.finance_entries set source=source||jsonb_build_object('participants',members,'batch',p_request) where id=(r->>'id')::uuid and not(source ? 'participants');
  result:=result||jsonb_build_array(r);
 end loop;return result;
end$$;
create function private.finance_prepare_closings(p_month date) returns int language plpgsql security definer set search_path='' as $$
declare c private.finance_contacts;s jsonb;n int:=0;begin
 if p_month is null or extract(day from p_month)<>1 then raise exception 'Mês inválido';end if;
 for c in select * from private.finance_contacts loop
  select jsonb_build_object('contact',c.name,'address',c.address,'closing',c.closing,'template',c.template,
    'rows',coalesce(jsonb_agg(jsonb_build_object('code',x.code,'quantity',x.qty,'cents',x.cents,'unknown',x.unknown) order by x.code),'[]'),
    'total_cents',coalesce(sum(x.cents),0),'unknown',coalesce(sum(x.unknown),0))
   into s from(select cl.code,sum(e.quantity) filter(where e.status='confirmado') qty,sum(e.cents) filter(where e.status='confirmado') cents,count(*) filter(where e.status='a_revisar') unknown
    from private.finance_entries e join private.finance_clients cl on cl.id=e.client_id
    where e.bucket=c.bucket and cl.code=any(c.client_codes) and e.kind='aula' and e.day>=p_month and e.day<(p_month+interval '1 month')::date and e.status<>'cancelado' group by cl.code)x;
  if jsonb_array_length(s->'rows')=0 then continue;end if;
  insert into private.finance_closings as f(contact_id,month,snapshot) values(c.id,p_month,s)
  on conflict(contact_id,month) do update set snapshot=excluded.snapshot,status='rascunho' where f.snapshot is distinct from excluded.snapshot;
  n:=n+1;
 end loop;return n;
end$$;
revoke all on function private.finance_prepare_closings(date) from public,anon,authenticated;
create function public.finance_closings(p_month date) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();begin
 perform private.finance_prepare_closings(p_month);
 return coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('bucket',c.bucket) order by c.name) from private.finance_closings f join private.finance_contacts c on c.id=f.contact_id where f.month=p_month),'[]');
end$$;
create function public.finance_closing_approve(p_id uuid,p_version int) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.finance_require_admin();begin
 update private.finance_closings set status='aprovado' where id=p_id and version=p_version and (snapshot->>'unknown')::int=0;
 if not found then raise exception 'Confira pendências e atualize o fechamento antes de aprovar.' using errcode='40001';end if;
end$$;
create function public.finance_provider_read() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('handle',handle) from private.finance_provider where name='infinitepay'
$$;
revoke all on function public.finance_provider_read() from public,anon,authenticated;
grant execute on function public.finance_provider_read() to service_role;
do $$declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('finance_catalog','finance_product_save','finance_contact_save','finance_rate_save','finance_classes_register','finance_closings','finance_closing_approve') loop
 execute format('revoke all on function %s from public,anon',f.signature);execute format('grant execute on function %s to authenticated',f.signature);
 end loop;
end$$;
commit;
