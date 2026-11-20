import {test} from 'node:test';import assert from 'node:assert/strict';import {quote,customer,verifiedPayment,providerPayload} from '../supabase/functions/divafit-checkout/pricing.mjs';import {createHandler} from '../supabase/functions/divafit-checkout/handler.mjs';
const readyEnv={CHECKOUT_LOTE_SLOTS:'0',CHECKOUT_ENABLED:'true',CHECKOUT_TERMS_APPROVED:'true',CHECKOUT_TERMS_VERSION:'oferta-v1',CHECKOUT_RECEIVER_VERIFIED:'true',INFINITEPAY_API_KEY:'mock-key',INFINITEPAY_HANDLE:'mock-account',TURNSTILE_SECRET_KEY:'mock-secret',TURNSTILE_SITE_KEY:'mock-site',SUPABASE_URL:'https://database.example',SUPABASE_SERVICE_ROLE_KEY:'mock-server-key'};
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
test('Link usa valores persistidos, cobrança única, expiração e taxa das parcelas paga pela cliente (decisão de 19/11)',()=>{const payload=providerPayload({id:'order',plan:'quarterly',card_cents:38415,pix_cents:36000,months:4,expires_at:'2026-12-01T00:00:00Z',customer:{name:'Teste',email:'t@example.com',phone:'5562999999999'}},{INFINITEPAY_HANDLE:'teste',SUPABASE_URL:'https://example.supabase.co'});assert.equal(payload.items[0].price,38415);assert.equal(payload.options.single_payment,true);assert.equal(payload.options.assured_installments,0);assert.equal(Math.round(38415*(1-payload.options.discounts.pix/100)),36000)});
test('O navegador não determina preço, duração ou confirmação na cotação',async()=>{const r=await createHandler({env:{}})(new Request('https://test/?route=quote',{method:'POST',body:JSON.stringify({plan:'quarterly',card:1,pix:1,months:99,paid:true})}));const q=await r.json();assert.equal(q.card,38415);assert.equal(q.months,4);assert.equal(q.enabled,false)});


test('Vagas em lotes de 5: cada pagamento ocupa uma e, ao fechar o lote, abre outro; teste arquivado não conta',async()=>{
 let pagos=0,consulta='';
 const fetcher=async url=>{if(url.includes('checkout_orders?status=eq.paid')){consulta=url;return Response.json(Array.from({length:pagos},(_,i)=>({id:String(i)})));}throw Error('Requisição inesperada '+url);};
 const handler=createHandler({env:{...readyEnv,CHECKOUT_LOTE_SLOTS:undefined},fetcher});
 const vagas=async()=>(await(await handler(request('quote',{plan:'monthly'}))).json()).vagas;
 assert.deepEqual(await vagas(),{total:5,restantes:5,lote:1});assert.match(consulta,/archived=eq\.false/);
 pagos=1;assert.equal((await vagas()).restantes,4);
 pagos=4;assert.equal((await vagas()).restantes,1);
 pagos=5;assert.deepEqual(await vagas(),{total:5,restantes:5,lote:2});
 pagos=7;assert.equal((await vagas()).restantes,3);
 assert.equal((await(await createHandler({env:{...readyEnv,CHECKOUT_LOTE_SLOTS:'0'},fetcher})(request('quote',{plan:'monthly'}))).json()).vagas,null,'desligado');
});

test('Link da InfinitePay repassa a taxa de todas as parcelas para a cliente',()=>{
 const p=providerPayload({id:'x',plan:'quarterly',months:4,card_cents:38415,pix_cents:36000,expires_at:'2026-12-01T00:00:00Z',customer:{name:'Ana',email:'a@b.co',phone:'5562999999999'}},readyEnv);
 assert.equal(p.options.assured_installments,0);assert.equal(p.items[0].price,38415);assert.ok(p.options.discounts.pix>6&&p.options.discounts.pix<6.3);
});

test('Aceita o link no formato atual da InfinitePay (checkout.infinitepay.io) e recusa outros domínios',async()=>{
 const rodar=async linkUrl=>{let salvo=null;const fetcher=async(url,init={})=>{
  if(url.includes('siteverify'))return Response.json({success:true,hostname:'app.leeleo.com.br'});
  if(url.endsWith('/rpc/create_checkout_order'))return Response.json({id:'d5763e2a-21e0-44c3-8a08-1d3f00af8ee0',status:'creating',plan:'monthly',months:1,card_cents:7880,pix_cents:7880,expires_at:'2026-11-20T02:59:59Z',customer:{name:'Leandro Teste',email:'l@t.co',phone:'5562999999999'}});
  if(url==='https://api.checkout.infinitepay.io/links')return Response.json({url:linkUrl});
  if(url.includes('checkout_orders?id=eq.')){salvo=JSON.parse(init.body);return new Response(null,{status:204});}
  throw Error('inesperado '+url);};
  const r=await createHandler({env:readyEnv,fetcher})(request('create',{plan:'monthly',name:'Leandro Teste',email:'l@t.co',phone:'62999999999',accepted:true,request_id:'0b8f6a52-6d2e-4f5e-9a1b-2c3d4e5f6a7b',challenge:'ok'}));
  return {status:r.status,body:await r.json(),salvo};};
 const ok=await rodar('https://checkout.infinitepay.io/romeland?lenc=abc.v1.def');
 assert.equal(ok.status,200);assert.equal(ok.body.checkout_url,'https://checkout.infinitepay.io/romeland?lenc=abc.v1.def');assert.equal(ok.salvo.status,'pending');
 const ruim=await rodar('https://checkout.golpe.example/romeland');
 assert.equal(ruim.status,400);assert.match(ruim.body.error,/Link de pagamento inválido/);
});

test('Falha no link cancela o pedido (não prende cupom) e o motivo real do banco aparece para a cliente',async()=>{
 const corpo={plan:'monthly',name:'Leandro Teste',email:'l@t.co',phone:'62999999999',accepted:true,request_id:'0b8f6a52-6d2e-4f5e-9a1b-2c3d4e5f6a7b',challenge:'ok',coupon:'TESTE-DIVAFIT'};
 let cancelado=null;
 const base=async(url,init={})=>{if(url.includes('siteverify'))return Response.json({success:true,hostname:'app.leeleo.com.br'});
  if(url.endsWith('/rpc/create_checkout_order'))return Response.json({id:'d5763e2a-21e0-44c3-8a08-1d3f00af8ee0',status:'creating',plan:'monthly',months:1,card_cents:7880,pix_cents:7880,expires_at:'2026-11-20T02:59:59Z',customer:{name:'Leandro Teste',email:'l@t.co',phone:'5562999999999'}});
  if(url==='https://api.checkout.infinitepay.io/links')return Response.json({url:'https://outro.exemplo/x'});
  if(url.includes('checkout_orders?id=eq.')&&url.includes('status=eq.creating')){cancelado=JSON.parse(init.body);return new Response(null,{status:204});}
  throw Error('inesperado '+url);};
 const r=await createHandler({env:readyEnv,fetcher:base})(request('create',corpo));
 assert.equal(r.status,400);assert.match((await r.json()).error,/Nenhuma cobrança foi feita/);assert.deepEqual(cancelado,{status:'canceled'});
 const esgotado=async(url,init)=>url.endsWith('/rpc/create_checkout_order')?Response.json({message:'Cupom esgotado'},{status:400}):base(url,init);
 const r2=await createHandler({env:readyEnv,fetcher:esgotado})(request('create',corpo));
 assert.equal((await r2.json()).error,'Cupom esgotado.');
 const fechado=async(url,init)=>url.endsWith('/rpc/create_checkout_order')?Response.json({id:'d5763e2a-21e0-44c3-8a08-1d3f00af8ee0',status:'canceled'}):base(url,init);
 const r3=await createHandler({env:readyEnv,fetcher:fechado})(request('create',corpo));
 assert.equal(r3.status,409);
});
