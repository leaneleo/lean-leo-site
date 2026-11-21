create table public.checkout_coupons(
 code text primary key check(code ~ '^[A-Z0-9_-]{3,32}$'), active boolean not null default false,
 percent_bps integer not null check(percent_bps between 1 and 9000),plan text check(plan in ('monthly','quarterly')),
 starts_at timestamptz,ends_at timestamptz,max_uses integer check(max_uses>0),uses integer not null default 0 check(uses>=0),
 check(ends_at is null or starts_at is null or ends_at>starts_at)
);
create table public.checkout_orders(
 id uuid primary key,request_hash text not null,token_hash text not null,plan text not null check(plan in ('monthly','quarterly')),
 months integer not null check(months in (1,4)),customer jsonb not null check(jsonb_typeof(customer)='object'),
 card_cents integer not null check(card_cents>=100),pix_cents integer not null check(pix_cents>=100 and pix_cents<=card_cents),
 coupon text references public.checkout_coupons(code),terms_version text not null,status text not null default 'creating' check(status in ('creating','pending','paid','canceled','refunded')),
 onboarding_status text not null default 'aguardando_pagamento',checkout_url text,transaction_nsu text unique,invoice_slug text,
 paid_cents integer,installments integer,payment_method text,student_id uuid references public.students(id),payment_id uuid references public.payments(id),
 needs_review boolean not null default false,expires_at timestamptz not null default now()+interval '30 minutes',paid_at timestamptz,
 archived boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index checkout_orders_coupon on public.checkout_orders(coupon,status,expires_at);
alter table public.checkout_orders enable row level security;
alter table public.checkout_coupons enable row level security;
revoke all on public.checkout_orders,public.checkout_coupons from anon,authenticated;
grant select on public.checkout_orders to authenticated;
grant select,insert,update on public.checkout_coupons to authenticated;
grant all on public.checkout_orders,public.checkout_coupons to service_role;
create policy checkout_admin_read on public.checkout_orders for select to authenticated using((select private.divafit_role())='admin');
create policy coupon_admin on public.checkout_coupons for all to authenticated using((select private.divafit_role())='admin') with check((select private.divafit_role())='admin');

create function public.create_checkout_order(p_request uuid,p_hash text,p_token text,p_plan text,p_customer jsonb,p_coupon text,p_terms text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.checkout_orders;c public.checkout_coupons;card integer;pix integer;discount integer:=0;n integer;result public.checkout_orders;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_request::text,0));
 select * into existing from public.checkout_orders where id=p_request;
 if found then
  if existing.request_hash<>p_hash or existing.token_hash<>p_token then raise exception 'Pedido já usado com outros dados';end if;
  if existing.expires_at<now() and existing.status<>'paid' then raise exception 'Pedido expirado. Inicie uma nova compra';end if;
  return to_jsonb(existing);
 end if;
 if p_terms is null or p_terms='rascunho' or length(p_terms)>80 then raise exception 'Condições da compra pendentes';end if;
 if p_plan='monthly' then card:=15760;pix:=15760;n:=1;
 elsif p_plan='quarterly' then card:=38415;pix:=36000;n:=4;else raise exception 'Plano inválido';end if;
 if coalesce(p_coupon,'')<>'' then
  select * into c from public.checkout_coupons where code=p_coupon for update;
  if not found or not c.active or (c.starts_at is not null and c.starts_at>now()) or (c.ends_at is not null and c.ends_at<=now()) or (c.plan is not null and c.plan<>p_plan) then raise exception 'Cupom indisponível';end if;
  if c.max_uses is not null and (select count(*) from public.checkout_orders where coupon=c.code and (status='paid' or (status in ('creating','pending') and expires_at>now())))>=c.max_uses then raise exception 'Cupom esgotado';end if;
  discount:=c.percent_bps;
 end if;
 card:=card-floor(card::numeric*discount/10000)::integer;pix:=pix-floor(pix::numeric*discount/10000)::integer;
 insert into public.checkout_orders(id,request_hash,token_hash,plan,months,customer,card_cents,pix_cents,coupon,terms_version)
 values(p_request,p_hash,p_token,p_plan,n,p_customer,card,pix,nullif(p_coupon,''),p_terms) returning * into result;
 return to_jsonb(result);
end;$$;

create function public.confirm_checkout_payment(p_order uuid,p_transaction text,p_slug text,p_paid integer,p_method text,p_installments integer)
returns uuid language plpgsql security invoker set search_path='' as $$
declare o public.checkout_orders;sid uuid;matches integer;pid uuid;amount integer;d date:=(now() at time zone 'America/Sao_Paulo')::date;
begin
 select * into o from public.checkout_orders where id=p_order for update;
 if not found then raise exception 'Pedido inexistente';end if;
 if o.status='paid' then
  if o.transaction_nsu<>p_transaction then raise exception 'Outra transação neste pedido';end if;
  return o.payment_id;
 end if;
 if o.status in ('refunded','canceled') then raise exception 'Pedido encerrado exige revisão';end if;
 if p_method not in ('pix','credit_card') or p_paid<(case when p_method='pix' then o.pix_cents else o.card_cents end) then raise exception 'Valor ou método divergente';end if;
 -- Uma identidade por e-mail/telefone, sem sobrescrever dados fornecidos pela equipe/Mfit.
 perform pg_advisory_xact_lock(hashtextextended('checkout-customer-match',0));
 select count(*),(array_agg(id))[1] into matches,sid from public.students where not archived and (
  lower(training_profile->>'email')=lower(o.customer->>'email') or phone=o.customer->>'phone');
 if matches>1 then
  update public.checkout_orders set needs_review=true,onboarding_status='revisar_identidade',status='paid',transaction_nsu=p_transaction,invoice_slug=p_slug,paid_cents=p_paid,payment_method=p_method,installments=p_installments,paid_at=now(),updated_at=now() where id=o.id;
  return null;
 end if;
 if matches=0 then
  insert into public.students(name,phone,status,modality,training_profile,whatsapp_consent,consent_note,import_data)
  values(o.customer->>'name',o.customer->>'phone','A revisar','Online',jsonb_build_object('email',o.customer->>'email'),coalesce((o.customer->>'whatsapp_consent')::boolean,false),case when (o.customer->>'whatsapp_consent')::boolean then 'Aceite no checkout DIVAFIT em '||now()::text else null end,jsonb_build_object('source','Checkout DivaFit','order',o.id)) returning id into sid;
 end if;
 amount:=case when p_method='pix' then o.pix_cents else o.card_cents end;
 insert into public.payments(student_ids,plan,reference,amount,paid_on,status,payment_method,notes,import_key,import_data)
 values(array[sid],case when o.plan='monthly' then 'Mensal · 1 mês' else 'Trimestral + 1 mês bônus · 4 meses' end,'Checkout DIVAFIT',p_paid::numeric/100,d,'Pago',case when p_method='pix' then 'Pix' else 'Crédito' end,'Período inicia após conferência da entrada. Taxa líquida não informada pelo provedor.','checkout:'||o.id,jsonb_build_object('order',o.id,'principal_cents',amount,'paid_cents',p_paid,'transaction',p_transaction,'installments',p_installments)) returning id into pid;
 update public.checkout_orders set status='paid',onboarding_status='conferir_forms_e_mfit',transaction_nsu=p_transaction,invoice_slug=p_slug,paid_cents=p_paid,payment_method=p_method,installments=p_installments,student_id=sid,payment_id=pid,paid_at=now(),updated_at=now() where id=o.id;
 if o.coupon is not null then update public.checkout_coupons set uses=uses+1 where code=o.coupon;end if;
 insert into public.tasks(name,student_id,due_on,responsible,notes)
 values('Entrada DIVAFIT · conferir formulário, fotos e acesso Mfit',sid,d,'Elisângela','Compra confirmada. Enviar instruções de boas-vindas; usar WhatsApp oficial somente com consentimento. Pedido '||o.id||'. Duração contratada: '||o.months||' meses. Datas de início e fim precisam ser combinadas.');
 return pid;
end;$$;
create function public.flag_checkout_review(p_order uuid) returns void language sql security invoker set search_path='' as $$ update public.checkout_orders set needs_review=true,updated_at=now() where id=p_order and status='paid'; $$;
revoke all on function public.create_checkout_order(uuid,text,text,text,jsonb,text,text),public.confirm_checkout_payment(uuid,text,text,integer,text,integer),public.flag_checkout_review(uuid) from public,anon,authenticated;
grant execute on function public.create_checkout_order(uuid,text,text,text,jsonb,text,text),public.confirm_checkout_payment(uuid,text,text,integer,text,integer),public.flag_checkout_review(uuid) to service_role;

