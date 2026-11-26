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

