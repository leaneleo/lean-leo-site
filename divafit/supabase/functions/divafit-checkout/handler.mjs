import {quote,customer,verifiedPayment,providerPayload} from './pricing.mjs';
const sha=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createHandler({env,fetcher=fetch}){
 return async req=>{
  const origin=req.headers.get('origin');const allowed=!origin||['https://app.leeleo.com.br','https://leeleo.com.br','https://www.leeleo.com.br'].includes(origin);
  const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...(allowed&&origin?{'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-headers':'content-type,apikey,x-checkout-token','access-control-allow-methods':'POST,OPTIONS'}:{})};
  const reply=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
  if(!allowed)return reply({error:'Origem não permitida.'},403);if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return reply({error:'Método não permitido.'},405);
  const db=async(path,body,method='POST')=>{const r=await fetcher(env.SUPABASE_URL+'/rest/v1/'+path,{method,headers:{apikey:env.SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SUPABASE_SERVICE_ROLE_KEY,'content-type':'application/json',Prefer:'return=representation'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('Não foi possível registrar o pedido.');return r.status===204?null:r.json()};
  const provider=async(path,body)=>{const r=await fetcher('https://api.checkout.infinitepay.io/'+path,{method:'POST',headers:{'content-type':'application/json','X-Api-Key':env.INFINITEPAY_API_KEY},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('A InfinitePay não concluiu a solicitação.');return r.json()};
  try{
   const raw=await req.text();if(raw.length>16000)return reply({error:'Solicitação muito grande.'},413);const input=JSON.parse(raw);const route=new URL(req.url).searchParams.get('route')||'quote';
   const paymentReady=env.CHECKOUT_RECEIVER_VERIFIED==='true'&&Boolean(env.INFINITEPAY_API_KEY&&env.INFINITEPAY_HANDLE);
   const termsReady=env.CHECKOUT_TERMS_APPROVED==='true'&&Boolean(env.CHECKOUT_TERMS_VERSION&&env.CHECKOUT_TERMS_VERSION!=='rascunho'&&env.CHECKOUT_TERMS_VERSION.length<=80);
   const enabled=env.CHECKOUT_ENABLED==='true'&&paymentReady&&termsReady&&Boolean(env.TURNSTILE_SECRET_KEY&&env.TURNSTILE_SITE_KEY);
   if(route==='quote'){
    let coupon=null;const code=String(input.coupon||'').trim().toUpperCase();if(code){if(!/^[A-Z0-9_-]{3,32}$/.test(code))throw Error('Cupom inválido.');const rows=await db('checkout_coupons?code=eq.'+encodeURIComponent(code)+'&select=*',null,'GET');coupon=rows[0];if(!coupon)throw Error('Cupom não encontrado.');}
    return reply({...quote(input.plan,coupon),enabled,turnstile_site_key:env.TURNSTILE_SITE_KEY||null,terms_version:env.CHECKOUT_TERMS_VERSION||'rascunho'});
   }
   if(route==='create'){
    if(!enabled)return reply({error:'As vendas ainda não foram ativadas. Nenhuma cobrança foi criada.'},503);
    const person=customer(input);if(!uuid.test(input.request_id||''))throw Error('Atualize a página e tente novamente.');
    const captcha=await fetcher('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET_KEY,response:String(input.challenge||'')}),signal:AbortSignal.timeout(8000)}).then(r=>r.json());if(!captcha.success||!['app.leeleo.com.br','leeleo.com.br','www.leeleo.com.br'].includes(captcha.hostname))throw Error('Confirme a verificação de segurança.');
    const fingerprint=await sha(JSON.stringify({person,plan:input.plan,coupon:String(input.coupon||'').trim().toUpperCase()}));const token=String(input.request_id);const tokenHash=await sha(token);
    const order=await db('rpc/create_checkout_order',{p_request:input.request_id,p_hash:fingerprint,p_token:tokenHash,p_plan:input.plan,p_customer:person,p_coupon:String(input.coupon||'').trim().toUpperCase(),p_terms:env.CHECKOUT_TERMS_VERSION});
    if(order.status==='paid')return reply({status:'paid'});if(order.checkout_url)return reply({checkout_url:order.checkout_url});
    const payload=providerPayload(order,env);const payment=await provider('links',payload);const url=new URL(payment.url||payment.checkout_url||'');if(url.protocol!=='https:'||url.hostname!=='buy.infinitepay.io')throw Error('Link de pagamento inválido.');
    await db('checkout_orders?id=eq.'+order.id,{checkout_url:url.href,status:'pending'},'PATCH');return reply({checkout_url:url.href});
   }
   if(route==='status'){
    if(!uuid.test(input.order_nsu||''))throw Error('Pedido inválido.');const rows=await db('checkout_orders?id=eq.'+input.order_nsu+'&select=id,status,onboarding_status,token_hash,plan,months',null,'GET');const order=rows[0];if(!order||order.token_hash!==await sha(req.headers.get('x-checkout-token')||''))return reply({error:'Pedido não encontrado.'},404);return reply({status:order.status,onboarding_status:order.onboarding_status,plan:order.plan,months:order.months});
   }
   if(route==='webhook'||route==='confirm'){
    if(!paymentReady)return reply({error:'A conta recebedora ainda não foi conferida para confirmação de pagamentos.'},503);
    if(!uuid.test(input.order_nsu||''))throw Error('Pedido inválido.');const rows=await db('checkout_orders?id=eq.'+input.order_nsu+'&select=*',null,'GET');const order=rows[0];if(!order)throw Error('Pedido não encontrado.');
    const slug=input.invoice_slug||input.slug,transaction=input.transaction_nsu;if(typeof slug!=='string'||slug.length>200||typeof transaction!=='string'||transaction.length>200)throw Error('Dados de pagamento incompletos.');
    const check=await provider('payment_check',{handle:env.INFINITEPAY_HANDLE,order_nsu:order.id,transaction_nsu:transaction,slug});
    // Aviso sem assinatura não confirma estorno/cancelamento. A equipe revisa no provedor.
    if(!verifiedPayment(check,order)){if(route==='webhook'&&order.status==='paid')await db('rpc/flag_checkout_review',{p_order:order.id});return reply({status:'pending',confirmed:false});}
    await db('rpc/confirm_checkout_payment',{p_order:order.id,p_transaction:transaction,p_slug:slug,p_paid:check.paid_amount,p_method:check.capture_method,p_installments:check.installments});return reply({confirmed:true});
   }
   return reply({error:'Operação não encontrada.'},404);
  }catch(err){return reply({error:err instanceof SyntaxError?'Solicitação inválida.':err.message||'Não foi possível concluir.'},400);}
 };
}

