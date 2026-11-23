-- Fechamentos discriminam a composição real de cada atendimento novo.
-- Sem alteração ou recálculo de lançamentos; meses anteriores preservam a rotina original.
begin;
create or replace function private.finance_prepare_closings(p_month date) returns int language plpgsql security definer set search_path='' as $$
declare c private.finance_contacts;s jsonb;n int:=0;begin
 if p_month is null or extract(day from p_month)<>1 then raise exception 'Mês inválido';end if;
 for c in select * from private.finance_contacts loop
  if p_month<date '2026-11-01' then
  select jsonb_build_object('contact',c.name,'address',c.address,'closing',c.closing,'template',c.template,
    'rows',coalesce(jsonb_agg(jsonb_build_object('code',x.code,'quantity',x.qty,'cents',x.cents,'unknown',x.unknown) order by x.code),'[]'),
    'total_cents',coalesce(sum(x.cents),0),'unknown',coalesce(sum(x.unknown),0))
   into s from(select cl.code,sum(e.quantity) filter(where e.status='confirmado') qty,sum(e.cents) filter(where e.status='confirmado') cents,count(*) filter(where e.status='a_revisar') unknown
    from private.finance_entries e join private.finance_clients cl on cl.id=e.client_id
    where e.bucket=c.bucket and cl.code=any(c.client_codes) and e.kind='aula' and e.day>=p_month and e.day<(p_month+interval '1 month')::date and e.status<>'cancelado' group by cl.code)x;
  else
  select jsonb_build_object('contact',c.name,'address',c.address,'closing',c.closing,'template',c.template,
    'rows',coalesce(jsonb_agg(jsonb_build_object('code',x.code,'quantity',x.qty,'cents',x.cents,'unknown',x.unknown) order by x.code),'[]'),
    'total_cents',coalesce(sum(x.cents),0),'unknown',coalesce(sum(x.unknown),0))
   into s from(select label.code,sum(e.quantity) filter(where e.status='confirmado') qty,sum(e.cents) filter(where e.status='confirmado') cents,count(*) filter(where e.status='a_revisar') unknown
    from private.finance_entries e join private.finance_clients cl on cl.id=e.client_id
    cross join lateral(select case when jsonb_typeof(e.source->'participants')='array' and jsonb_array_length(e.source->'participants')>0 then (select string_agg(p.name,' + ' order by p.name) from private.finance_clients p where p.id in (select value::uuid from jsonb_array_elements_text(e.source->'participants'))) else cl.code end as code) label
    where e.bucket=c.bucket and cl.code=any(c.client_codes) and e.kind='aula' and e.day>=p_month and e.day<(p_month+interval '1 month')::date and e.status<>'cancelado' group by label.code)x;
  end if;
  if jsonb_array_length(s->'rows')=0 then continue;end if;
  insert into private.finance_closings as f(contact_id,month,snapshot) values(c.id,p_month,s)
  on conflict(contact_id,month) do update set snapshot=excluded.snapshot,status='rascunho' where f.snapshot is distinct from excluded.snapshot;
  n:=n+1;
 end loop;return n;
end$$;
commit;
