begin;

create table public.body_analysis_consents (
  student_id uuid primary key references public.students(id),
  recorded_at timestamptz not null default now(),
  recorded_by uuid not null references auth.users(id)
);

create table public.body_analyses (
  id uuid primary key,
  student_id uuid not null references public.students(id),
  created_by uuid not null references auth.users(id),
  consent_at timestamptz not null,
  photo_paths text[] not null check (cardinality(photo_paths)=3),
  weight_kg numeric not null check (weight_kg between 25 and 350),
  height_cm numeric not null check (height_cm between 100 and 250),
  age integer not null check (age between 18 and 120),
  sex text not null check (sex in ('feminino','masculino','outro','não informado')),
  waist_cm numeric check (waist_cm between 40 and 250),
  hip_cm numeric check (hip_cm between 40 and 250),
  result jsonb not null,
  reviewed_values jsonb,
  status text not null default 'rascunho' check (status in ('rascunho','aprovado','descartado')),
  model text not null,
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  estimated_cost_usd numeric generated always as ((input_tokens::numeric*2 + output_tokens::numeric*10)/1000000) stored,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  approved_at timestamptz,
  check ((status='aprovado') = (approved_by is not null and approved_at is not null and reviewed_values is not null))
);
create index body_analyses_student_date on public.body_analyses(student_id, created_at desc);

create table private.body_analysis_requests (
  id uuid primary key,
  student_id uuid not null,
  actor uuid not null,
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index body_analysis_request_date on private.body_analysis_requests(created_at);
alter table private.body_analysis_requests enable row level security;
alter table public.body_analysis_consents enable row level security;
alter table public.body_analyses enable row level security;
revoke all on public.body_analyses, public.body_analysis_consents from public, anon, authenticated;
grant select on public.body_analyses, public.body_analysis_consents to authenticated;
grant select on public.body_analyses, public.body_analysis_consents to service_role;
create policy body_analysis_team_read on public.body_analyses for select to authenticated using ((select private.divafit_role()) in ('admin','trainer'));
create policy body_analysis_consent_team_read on public.body_analysis_consents for select to authenticated using ((select private.divafit_role()) in ('admin','trainer'));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('body-photos','body-photos',false,2097152,array['image/jpeg']);
-- The function issues signed links only after checking team membership. Even direct
-- object access by authenticated users is limited to the team.
create policy body_photos_team_read on storage.objects for select to authenticated
using (bucket_id='body-photos' and (select private.divafit_role()) in ('admin','trainer')
  and exists(select 1 from public.body_analyses a join public.body_analysis_consents c on c.student_id=a.student_id
  where storage.objects.name=any(a.photo_paths)));

create function public.body_analysis_consent(p_student uuid, p_granted boolean) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare stamp timestamptz;
begin
  if not coalesce(private.divafit_role() in ('admin','trainer'),false) then raise insufficient_privilege; end if;
  perform 1 from public.students where id=p_student and not archived for update;
  if not found then raise exception 'Cadastro não disponível'; end if;
  if p_granted is null then raise exception 'Consentimento inválido'; end if;
  if p_granted then
    insert into public.body_analysis_consents(student_id,recorded_by) values(p_student,auth.uid()) on conflict do nothing;
    select recorded_at into stamp from public.body_analysis_consents where student_id=p_student;
  else
    delete from public.body_analysis_consents where student_id=p_student;
  end if;
  insert into public.audit_log(table_name,record_id,actor,new_value)
  values('body_analysis_consents',p_student,auth.uid(),jsonb_build_object('consentimento',p_granted,'registrado_em',stamp));
  return stamp;
end; $$;

create function public.body_analysis_begin(p_id uuid,p_student uuid,p_actor uuid) returns text
language plpgsql security definer set search_path='' as $$
declare stamp timestamptz; boundary timestamptz;
begin
  if not exists(select 1 from public.team_members where user_id=p_actor) then return 'forbidden'; end if;
  perform 1 from public.students where id=p_student and not archived for update;
  if not found then return 'unavailable'; end if;
  select recorded_at into stamp from public.body_analysis_consents where student_id=p_student;
  if stamp is null then return 'consent'; end if;
  perform pg_catalog.pg_advisory_xact_lock(802102030);
  boundary := date_trunc('day', clock_timestamp() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
  if (select count(*) from private.body_analysis_requests where created_at>=boundary) >= 30 then return 'limit'; end if;
  insert into private.body_analysis_requests(id,student_id,actor,consent_at) values(p_id,p_student,p_actor,stamp);
  insert into public.audit_log(table_name,record_id,actor,new_value)
  values('body_analyses',p_id,p_actor,jsonb_build_object('evento','solicitada'));
  return 'ok';
end; $$;

create function public.body_analysis_finish(p_id uuid,p_actor uuid,p_data jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare job private.body_analysis_requests;
begin
  select * into job from private.body_analysis_requests where id=p_id and actor=p_actor;
  if not found or not exists(select 1 from public.team_members where user_id=p_actor) then raise insufficient_privilege; end if;
  perform 1 from public.students where id=job.student_id and not archived for update;
  if not found or not exists(select 1 from public.body_analysis_consents where student_id=job.student_id and recorded_at=job.consent_at) then
    raise exception 'Consentimento indisponível';
  end if;
  insert into public.body_analyses(id,student_id,created_by,consent_at,photo_paths,weight_kg,height_cm,age,sex,waist_cm,hip_cm,result,model,input_tokens,output_tokens)
  values(p_id,job.student_id,p_actor,job.consent_at,array[p_id||'/frente.jpg',p_id||'/lado.jpg',p_id||'/costas.jpg'],
    (p_data->>'weight')::numeric,(p_data->>'height')::numeric,(p_data->>'age')::int,p_data->>'sex',
    (p_data->>'waist')::numeric,(p_data->>'hip')::numeric,p_data->'result',p_data->>'model',
    (p_data->>'input_tokens')::int,(p_data->>'output_tokens')::int);
  insert into public.audit_log(table_name,record_id,actor,new_value)
  values('body_analyses',p_id,p_actor,jsonb_build_object('status','rascunho'));
  return p_id;
end; $$;

create function public.body_analysis_review(p_id uuid,p_status text,p_values jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare entry public.body_analyses; low numeric; center numeric; high numeric;
begin
  if not coalesce(private.divafit_role() in ('admin','trainer'),false) then raise insufficient_privilege; end if;
  if p_status is null or p_status not in ('aprovado','descartado') then raise exception 'Revisão inválida'; end if;
  select * into entry from public.body_analyses where id=p_id for update;
  if not found or entry.status<>'rascunho' then raise exception 'Rascunho indisponível. Atualize o histórico.'; end if;
  if p_status='aprovado' then
    if entry.result->'fotos_ok' is distinct from 'true'::jsonb then raise exception 'Refaça as fotos antes de aprovar'; end if;
    if jsonb_typeof(p_values->'min') is distinct from 'number' or jsonb_typeof(p_values->'estimado') is distinct from 'number'
       or jsonb_typeof(p_values->'max') is distinct from 'number' then raise exception 'Preencha os três valores de gordura'; end if;
    low := (p_values->>'min')::numeric; center := (p_values->>'estimado')::numeric; high := (p_values->>'max')::numeric;
    if low<0 or low>center or center>high or high>100 then raise exception 'Revise a faixa de gordura'; end if;
    p_values := jsonb_build_object('min',low,'estimado',center,'max',high,
      'massa_gorda_kg',round(entry.weight_kg*center/100,2),'massa_magra_kg',entry.weight_kg-round(entry.weight_kg*center/100,2));
  else
    p_values := null;
  end if;
  update public.body_analyses set status=p_status,reviewed_values=p_values,reviewed_at=now(),
    approved_by=case when p_status='aprovado' then auth.uid() end,
    approved_at=case when p_status='aprovado' then now() end where id=p_id;
  insert into public.audit_log(table_name,record_id,actor,old_value,new_value)
  values('body_analyses',p_id,auth.uid(),jsonb_build_object('status','rascunho'),jsonb_build_object('status',p_status));
  return p_id;
end; $$;

revoke all on function public.body_analysis_consent(uuid,boolean),public.body_analysis_review(uuid,text,jsonb),
 public.body_analysis_begin(uuid,uuid,uuid),public.body_analysis_finish(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.body_analysis_consent(uuid,boolean),public.body_analysis_review(uuid,text,jsonb) to authenticated;
grant execute on function public.body_analysis_begin(uuid,uuid,uuid),public.body_analysis_finish(uuid,uuid,jsonb) to service_role;
commit;
