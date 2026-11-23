create table private.crm_assessment_responses (
  id uuid primary key,
  lead_id uuid not null references private.crm_leads(id),
  email text not null,
  profile jsonb not null,
  created_at timestamptz not null default now()
);
alter table private.crm_assessment_responses enable row level security;
revoke all on private.crm_assessment_responses from public, anon, authenticated;

create function public.crm_record_preview_assessment(p_id uuid,p_name text,p_phone text,p_email text,p_profile jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare
  lead uuid;
begin
  if length(trim(p_name)) not between 1 and 120 or p_phone !~ '^[0-9]{11}$'
    or length(p_email) not between 3 and 254 or jsonb_typeof(p_profile) is distinct from 'object'
    or octet_length(p_profile::text)>3600 then
    raise exception 'Invalid assessment lead';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_phone,0));
  if exists(select 1 from private.crm_assessment_responses where id=p_id) then return; end if;
  select id into lead from private.crm_leads
    where not archived and phone in (p_phone,'55'||p_phone) order by created_at desc limit 1;
  if lead is null then
    insert into private.crm_leads(name,phone,origin,interest,notes)
    values(trim(p_name),p_phone,'Site','Avaliação física','Origem: prévia da avaliação grátis')
    returning id into lead;
  end if;
  insert into private.crm_assessment_responses(id,lead_id,email,profile)
  values(p_id,lead,p_email,p_profile);
end;
$$;
revoke all on function public.crm_record_preview_assessment(uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.crm_record_preview_assessment(uuid,text,text,text,jsonb) to service_role;
