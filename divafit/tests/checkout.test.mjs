import {test} from 'node:test';import assert from 'node:assert/strict';import {quote,customer,verifiedPayment,providerPayload} from '../supabase/functions/divafit-checkout/pricing.mjs';import {createHandler} from '../supabase/functions/divafit-checkout/handler.mjs';
const readyEnv={CHECKOUT_ENABLED:'true',CHECKOUT_TERMS_APPROVED:'true',CHECKOUT_TERMS_VERSION:'oferta-v1',CHECKOUT_RECEIVER_VERIFIED:'true',INFINITEPAY_API_KEY:'mock-key',INFINITEPAY_HANDLE:'mock-account',TURNSTILE_SECRET_KEY:'mock-secret',TURNSTILE_SITE_KEY:'mock-site',SUPABASE_URL:'https://database.example',SUPABASE_SERVICE_ROLE_KEY:'mock-server-key'};
const request=(route,body={})=>new Request('https://test/?route='+route,{method:'POST',body:JSON.stringify(body)});

test('Vendas exigem recebedor conferido, termos versionados e proteção completa',async()=>{
 const variants=[{CHECKOUT_ENABLED:'false'},{CHECKOUT_RECEIVER_VERIFIED:'false'},{CHECKOUT_TERMS_APPROVED:'false'},{CHECKOUT_TERMS_VERSION:'rascunho'},{CHECKOUT_TERMS_VERSION:''},{INFINITEPAY_API_KEY:''},{INFINITEPAY_HANDLE:''},{TURNSTILE_SECRET_KEY:''},{TURNSTILE_SITE_KEY:''}];
 for(const override of variants){let calls=0;const handler=createHandler({env:{...readyEnv,...override},fetcher:async()=>{calls++;throw Error('Sem chamadas externas')}});const quote=await(await handler(request('quote',{plan:'quarterly'}))).json();assert.equal(quote.enabled,false,JSON.stringify(Object.keys(override)));assert.equal((await handler(request('create'))).status,503);assert.equal(calls,0);}
 assert.equal((await(await createHandler({env:readyEnv})(request('quote',{plan:'monthly'}))).json()).enabled,true);
});

test('Fechar novas vendas preserva confirmação de pedido existente pela API do provedor',async()=>{
 const id='12345678-1234-4234-8234-123456789012';let checked=0,confirmed=0;
 const fetcher=async(url,options)=>{
  if(url.includes('checkout_orders?'))return Response.json([{id,card_cents:38415,pix_cents:36000,status:'pending'}]);
  if(url.endsWith('/payment_check')){checked++;assert.equal(JSON.parse(options.body).order_nsu,id);return Response.json({success:true,paid:true,amount:38415,paid_amount:36000,capture_method:'pix',installments:1});}
  if(url.endsWith('/rpc/confirm_checkout_payment')){confirmed++;return Response.json('payment-id');}
  throw Error('Requisição inesperada');
 };
 const handler=createHandler({env:{...readyEnv,CHECKOUT_ENABLED:'false'},fetcher});
 for(const route of ['confirm','webhook']){const r=await handler(request(route,{order_nsu:id,slug:'invoice',transaction_nsu:'transaction'}));assert.equal(r.status,200);assert.equal((await r.json()).confirmed,true);}
 assert.equal(checked,2);assert.equal(confirmed,2);
});

test('Webhook não registra pagamento com valor divergente confirmado pelo provedor',async()=>{
 const id='12345678-1234-4234-8234-123456789012';let confirmed=0;
 const handler=createHandler({env:readyEnv,fetcher:async(url)=>{
  if(url.includes('checkout_orders?'))return Response.json([{id,card_cents:38415,pix_cents:36000,status:'pending'}]);
  if(url.endsWith('/payment_check'))return Response.json({success:true,paid:true,amount:38415,paid_amount:35999,capture_method:'pix',installments:1});
  confirmed++;throw Error('Não deve confirmar');
 }});
 const r=await handler(request('webhook',{order_nsu:id,invoice_slug:'invoice',transaction_nsu:'transaction'}));assert.equal(r.status,200);assert.equal((await r.json()).confirmed,false);assert.equal(confirmed,0);
});
test('Preços inteiros e desconto de cupom calculados no servidor',()=>{assert.equal(quote('monthly').pix,15760);const q=quote('quarterly');assert.equal(q.months,4);assert.equal(q.card,38415);assert.equal(q.pix,36000);assert.equal(quote('quarterly',{code:'DIVA10',active:true,percent_bps:1000}).pix,32400);assert.throws(()=>quote('quarterly',{code:'FIM',active:true,percent_bps:1000,max_uses:1,uses:1}),/esgotado/);assert.throws(()=>quote('quarterly',{active:true,percent_bps:1000,ends_at:'2020-01-01'}));assert.throws(()=>quote('fake'))});
test('Valores pagos não são confundidos com principal ou taxas líquidas',()=>{const o={card_cents:38415,pix_cents:36000};assert.equal(verifiedPayment({success:true,paid:true,amount:38415,paid_amount:40000,capture_method:'credit_card'},o),true);assert.equal(verifiedPayment({success:true,paid:true,amount:38415,paid_amount:36000,capture_method:'pix'},o),true);for(const value of [{success:true,paid:false,amount:38415,paid_amount:40000,capture_method:'credit_card'},{success:true,paid:true,amount:15760,paid_amount:38415,capture_method:'credit_card'},{success:true,paid:true,amount:38415,paid_amount:35999,capture_method:'pix'}])assert.equal(verifiedPayment(value,o),false)});
test('Retorno e webhook não liberam acompanhamento com integração desativada',async()=>{let calls=0;const handler=createHandler({env:{},fetcher:async()=>{calls++;throw Error('Não deveria conectar')}});for(const route of ['create','confirm','webhook']){const r=await handler(new Request('https://test/?route='+route,{method:'POST',body:'{}'}));assert.equal(r.status,503)}assert.equal(calls,0)});
test('Dados incompletos, consentimento implícito e origem externa são rejeitados',async()=>{assert.throws(()=>customer({name:'Teste',email:'x@y.com',phone:'62999999999'}));const c=customer({name:'Pessoa Teste',email:'X@y.com',phone:'62999999999',accepted:true});assert.equal(c.whatsapp_consent,false);assert.equal(c.email,'x@y.com');const r=await createHandler({env:{}})(new Request('https://test/?route=quote',{method:'POST',headers:{Origin:'https://evil.example'},body:'{}'}));assert.equal(r.status,403)});
test('Link usa valores persistidos, cobrança única e expiração; não promete parcelas',()=>{const payload=providerPayload({id:'order',plan:'quarterly',card_cents:38415,pix_cents:36000,months:4,expires_at:'2026-12-01T00:00:00Z',customer:{name:'Teste',email:'t@example.com',phone:'5562999999999'}},{INFINITEPAY_HANDLE:'teste',SUPABASE_URL:'https://example.supabase.co'});assert.equal(payload.items[0].price,38415);assert.equal(payload.options.single_payment,true);assert.equal('assured_installments' in payload.options,false);assert.equal(Math.round(38415*(1-payload.options.discounts.pix/100)),36000)});
test('O navegador não determina preço, duração ou confirmação na cotação',async()=>{const r=await createHandler({env:{}})(new Request('https://test/?route=quote',{method:'POST',body:JSON.stringify({plan:'quarterly',card:1,pix:1,months:99,paid:true})}));const q=await r.json();assert.equal(q.card,38415);assert.equal(q.months,4);assert.equal(q.enabled,false)});

