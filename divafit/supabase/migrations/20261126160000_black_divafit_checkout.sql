alter table public.checkout_orders drop constraint checkout_orders_months_check;
alter table public.checkout_orders add constraint checkout_orders_months_check check (months in (1,3,4));

create or replace function public.create_checkout_order(p_request uuid,p_hash text,p_token text,p_plan text,p_customer jsonb,p_coupon text,p_terms text)
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
 elsif p_plan='quarterly' then card:=38415;pix:=36000;n:=3;else raise exception 'Plano inválido';end if;
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

CREATE OR REPLACE FUNCTION public.confirm_checkout_payment(p_order uuid, p_transaction text, p_slug text, p_paid integer, p_method text, p_installments integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
 values(array[sid],case when o.plan='monthly' then 'Mensal · 1 mês' when o.months=4 then 'Trimestral + 1 mês bônus · 4 meses' else 'Trimestral · 3 meses' end,'Checkout DIVAFIT',p_paid::numeric/100,d,'Pago',case when p_method='pix' then 'Pix' else 'Crédito' end,'Período inicia após conferência da entrada. Taxa líquida não informada pelo provedor.','checkout:'||o.id,jsonb_build_object('order',o.id,'principal_cents',amount,'paid_cents',p_paid,'transaction',p_transaction,'installments',p_installments)) returning id into pid;
 update public.checkout_orders set status='paid',onboarding_status='conferir_forms_e_mfit',transaction_nsu=p_transaction,invoice_slug=p_slug,paid_cents=p_paid,payment_method=p_method,installments=p_installments,student_id=sid,payment_id=pid,paid_at=now(),updated_at=now() where id=o.id;
 if o.coupon is not null then update public.checkout_coupons set uses=uses+1 where code=o.coupon;end if;
 insert into public.tasks(name,student_id,due_on,responsible,notes)
 values('Entrada DIVAFIT · conferir formulário, fotos e acesso Mfit',sid,d,'Elisângela','Compra confirmada. Enviar instruções de boas-vindas; usar WhatsApp oficial somente com consentimento. Pedido '||o.id||'. Duração contratada: '||o.months||' meses. Datas de início e fim precisam ser combinadas.');
 return pid;
end;$function$;
