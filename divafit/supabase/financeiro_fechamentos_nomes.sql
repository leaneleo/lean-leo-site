-- Fechamentos descrevem pessoas e composições; códigos ficam apenas na origem privada.
-- Aplicar depois de financeiro_participantes.sql. Nenhum envio é habilitado.
begin;
create or replace function private.finance_prepare_closings(p_month date) returns int language plpgsql security definer set search_path='' as $$
declare c private.finance_contacts;s jsonb;n int:=0;begin
 if p_month is null or extract(day from p_month)<>1 then raise exception 'Mês inválido';end if;
 for c in select * from private.finance_contacts loop
  with resolved as (
   select e.*,
    case when jsonb_typeof(e.source->'participants')='array' and jsonb_array_length(e.source->'participants')>0 then
      (select array_agg(p.code order by p.code) from private.finance_clients p where p.bucket=c.bucket and p.id in(select value::uuid from jsonb_array_elements_text(e.source->'participants')))
     when jsonb_typeof(c.source->'closing'->'legacy_codes'->cl.code)='array' then
      array(select value from jsonb_array_elements_text(c.source->'closing'->'legacy_codes'->cl.code) order by value)
     when cl.code in(select jsonb_array_elements_text(coalesce(c.source->'calculator'->'people','[]'))) or (cardinality(c.client_codes)=1 and cl.code=c.name) then array[cl.code]
     else null end as codes,
    c.source->'calculator'->>'kind'='servico' as service
   from private.finance_entries e join private.finance_clients cl on cl.id=e.client_id
   where e.bucket=c.bucket and cl.code=any(c.client_codes) and e.kind='aula' and not e.archived and e.day>=p_month and e.day<(p_month+interval '1 month')::date and e.status<>'cancelado'
  ), described as (
   select r.*,
    case when service then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('code',p.code,'name',coalesce(c.source->'closing'->'people'->p.code->>'name',p.name),'gender',c.source->'closing'->'people'->p.code->>'gender','recipient',p.code=coalesce(c.source->'closing'->>'recipient',case when c.source->'calculator'->>'bill_to'=c.name then c.name end)) order by p.code)
      from private.finance_clients p where p.bucket=c.bucket and p.code=any(r.codes)),'[]'::jsonb) end as people,
    not coalesce(service,false) and (codes is null or cardinality(codes)=0 or (select count(*) from private.finance_clients p where p.bucket=c.bucket and p.code=any(r.codes))<>cardinality(codes)) as unresolved
   from resolved r
  ), grouped as (
   select people,coalesce(service,false) service,unresolved,sum(quantity) filter(where status='confirmado') qty,sum(cents) filter(where status='confirmado') cents,count(*) filter(where status='a_revisar' or unresolved) unknown
   from described group by people,coalesce(service,false),unresolved
  )
  select jsonb_build_object('format_version',2,'contact',c.name,'address',c.address,'closing',c.closing,'template',c.template,'compact_person',c.source->'closing'->>'compact_person',
   'rows',coalesce(jsonb_agg(jsonb_build_object('people',g.people,'service',g.service,'label',case when g.service then c.name else null end,'unresolved',g.unresolved,'quantity',g.qty,'cents',g.cents,'unknown',g.unknown) order by g.people::text),'[]'),
   'total_cents',coalesce(sum(g.cents),0),'unknown',coalesce(sum(g.unknown),0)) into s from grouped g;
  if jsonb_array_length(s->'rows')=0 then
   update private.finance_closings set snapshot=s,status='rascunho' where contact_id=c.id and month=p_month and snapshot is distinct from s;
   continue;
  end if;
  insert into private.finance_closings as f(contact_id,month,snapshot) values(c.id,p_month,s)
  on conflict(contact_id,month) do update set snapshot=excluded.snapshot,status='rascunho' where f.snapshot is distinct from excluded.snapshot;
  n:=n+1;
 end loop;return n;
end$$;
commit;
