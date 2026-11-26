alter table private.crm_leads add column if not exists waitlist_email text;
alter table private.crm_leads add column if not exists campaign_tag text;
create unique index if not exists crm_desafio_janeiro_email
 on private.crm_leads(waitlist_email) where campaign_tag='DESAFIO-JANEIRO' and not archived;

create or replace function public.crm_record_desafio_janeiro(p_name text,p_email text,p_phone text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_name is null or length(trim(p_name)) not between 2 and 120 or p_email is null or
    length(trim(p_email))>254 or trim(p_email)!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or
    p_phone is null or p_phone!~'^55[0-9]{10,11}$' then raise exception 'Dados inválidos'; end if;
 insert into private.crm_leads(name,phone,origin,interest,waitlist_email,campaign_tag)
 values(trim(p_name),p_phone,'Site','Desafio DIVAFIT',lower(trim(p_email)),'DESAFIO-JANEIRO')
 on conflict (waitlist_email) where campaign_tag='DESAFIO-JANEIRO' and not archived do nothing;
end;
$$;
revoke all on function public.crm_record_desafio_janeiro(text,text,text) from public,anon,authenticated;
grant execute on function public.crm_record_desafio_janeiro(text,text,text) to service_role;
