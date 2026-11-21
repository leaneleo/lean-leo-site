-- Run only in an isolated Supabase environment after applying the migrations.
-- No real pictures, people or Anthropic calls. The transaction rolls back.
begin;
insert into auth.users(id) values
 ('ac1abda1-a00f-41f8-a7dc-75bb9be962a7'),('093a0b48-b0db-476e-8995-f5f9371f2989');
insert into public.team_members(user_id,display_name,role)
values ('ac1abda1-a00f-41f8-a7dc-75bb9be962a7','Equipe teste','trainer');
insert into public.students(id,name) values ('9f5c8271-a53a-413f-a057-388e6c152edc','Cadastro fictício');

set local role service_role;
do $$
begin
  if public.body_analysis_begin('fd9e7a6c-7bc4-45a7-8819-b8237b1e4fca','9f5c8271-a53a-413f-a057-388e6c152edc','ac1abda1-a00f-41f8-a7dc-75bb9be962a7') <> 'consent' then
    raise exception 'Esperado bloqueio por falta de consentimento';
  end if;
  if public.body_analysis_begin('fd9e7a6c-7bc4-45a7-8819-b8237b1e4fca','9f5c8271-a53a-413f-a057-388e6c152edc','093a0b48-b0db-476e-8995-f5f9371f2989') <> 'forbidden' then
    raise exception 'Esperado bloqueio de não membro';
  end if;
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','ac1abda1-a00f-41f8-a7dc-75bb9be962a7',true);
select public.body_analysis_consent('9f5c8271-a53a-413f-a057-388e6c152edc',true);
reset role;

set local role service_role;
select public.body_analysis_begin('fd9e7a6c-7bc4-45a7-8819-b8237b1e4fca','9f5c8271-a53a-413f-a057-388e6c152edc','ac1abda1-a00f-41f8-a7dc-75bb9be962a7');
select public.body_analysis_finish('fd9e7a6c-7bc4-45a7-8819-b8237b1e4fca','ac1abda1-a00f-41f8-a7dc-75bb9be962a7',
 '{"weight":80,"height":170,"age":30,"sex":"feminino","result":{"fotos_ok":true},"model":"claude-sonnet-5-5","input_tokens":1000,"output_tokens":250}');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','093a0b48-b0db-476e-8995-f5f9371f2989',true);
do $$
begin
  if exists(select 1 from public.body_analyses where id='fd9e7a6c-7bc4-45a7-8819-b8237b1e4fca') then
    raise exception 'RLS expôs uma análise';
  end if;
  begin
    perform public.body_analysis_review('fd9e7a6c-7bc4-45a7-8819-b8237b1e4fca','aprovado','{"min":20,"estimado":25,"max":30}');
    raise exception 'Aprovação por usuário sem equipe';
  exception when insufficient_privilege then null;
  end;
end $$;

select set_config('request.jwt.claim.sub','ac1abda1-a00f-41f8-a7dc-75bb9be962a7',true);
do $$
begin
  if not exists(select 1 from public.body_analyses where id='fd9e7a6c-7bc4-45a7-8819-b8237b1e4fca'
    and status='rascunho' and estimated_cost_usd=0.0045 and approved_by is null) then
    raise exception 'Rascunho ou custo incorreto';
  end if;
end $$;
select public.body_analysis_review('fd9e7a6c-7bc4-45a7-8819-b8237b1e4fca','aprovado','{"min":20,"estimado":24,"max":30}');
reset role;

do $$
begin
  if not exists(select 1 from public.body_analyses where id='fd9e7a6c-7bc4-45a7-8819-b8237b1e4fca'
    and status='aprovado' and approved_by='ac1abda1-a00f-41f8-a7dc-75bb9be962a7'
    and (reviewed_values->>'massa_gorda_kg')::numeric=19.2) then
    raise exception 'Aprovação ou valores editados incorretos';
  end if;
  if (select count(*) from public.audit_log where record_id='fd9e7a6c-7bc4-45a7-8819-b8237b1e4fca'
    and actor='ac1abda1-a00f-41f8-a7dc-75bb9be962a7')<>3 then
    raise exception 'Auditoria incompleta';
  end if;
end $$;
rollback;
