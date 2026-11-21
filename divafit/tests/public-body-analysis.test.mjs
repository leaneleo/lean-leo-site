import test from 'node:test';
import assert from 'node:assert/strict';
import {createPublicHandler} from '../supabase/functions/public-body-analysis/handler.mjs';

const origin='https://preview.example.test';
const jpg=new Blob([Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==','base64')],{type:'image/jpeg'});
function request(overrides={},site=origin,headers={}){
  const data=new FormData();
  for(const [k,v] of Object.entries({email:' TEST@example.test ',whatsapp:'+55 (62) 90000-0000',weight:72,
    height:165,age:35,sex:'feminino',objective:'Emagrecimento',purpose:'body-photo-v1',challenge:'fixture-token',
    frente:jpg,lado:jpg,costas:jpg,...overrides}))data.set(k,v);
  return new Request(origin+'/public',{method:'POST',headers:{origin:site,...headers},body:data});
}
function harness(overrides={}){
  const keys=[], seen=new Map();
  let calls=0,slots=0,allowed=true;
  const handler=createPublicHandler({
    origins:[origin],ready:()=>true,challenge:async()=>allowed,hash:async value=>value,
    async reserve(id,email,phone){
      keys.push(email,phone);
      if(slots>=30)return 'limit';
      if([...seen.values()].some(pair=>pair.includes(email)||pair.includes(phone)))return 'duplicate';
      slots++;seen.set(id,[email,phone]);return 'ok';
    },
    release:async id=>{seen.delete(id);},resize:async photo=>new Uint8Array(await photo.arrayBuffer()),
    async call(photos,measures){
      calls++;assert.equal(photos.length,3);assert.equal(measures.height,165);
      return {usage:{input_tokens:321,output_tokens:123},content:[{type:'text',text:JSON.stringify({
        fotos_ok:true,problemas_fotos:[],gordura_percentual:{min:29,estimado:32,max:35},confianca:'baixa',
        motivo_confianca:'Fixture',massa_gorda_kg:23,massa_magra_kg:49,
        observacoes:{distribuicao_gordura:'',definicao_muscular:'',postura:'',assimetrias:''},
        comparacao_anterior:'',sugestoes_para_o_personal:[],limitacoes:''
      })}]};
    },
    ...overrides
  });
  return {handler,keys,calls:()=>calls,block:()=>{allowed=false;}};
}
test('Uma análise por e-mail ou celular, com contatos normalizados e resposta sem dados de contato',async()=>{
  const {handler,calls,keys}=harness();
  const first=await handler(request());
  assert.equal(first.status,200);
  assert.deepEqual(await first.json(),{gordura:{min:29,estimado:32,max:35},confianca:'baixa'});
  assert.deepEqual(keys,['0:test@example.test','1:62900000000']);
  assert.equal((await handler(request({email:'test@example.test',whatsapp:'62911111111'}))).status,429);
  assert.equal((await handler(request({email:'outro@example.test',whatsapp:'62900000000'}))).status,429);
  assert.equal(calls(),1);
});
test('Origem, propósito, três fotos e desafio são verificados antes de chamar o modelo',async()=>{
  const {handler,calls}=harness();
  assert.equal((await handler(request({},'https://other.example.test'))).status,403);
  assert.equal((await handler(request({purpose:''}))).status,400);
  assert.equal((await handler(request({costas:''}))).status,400);
  assert.equal((await handler(request({challenge:''}))).status,403);
  assert.equal(calls(),0);
});
test('O bloqueio diário impede a 31ª análise',async()=>{
  const {handler,calls}=harness();
  const replies=await Promise.all(Array.from({length:31},(_,i)=>handler(request({
    email:'p'+i+'@example.test',whatsapp:'629'+String(i).padStart(8,'0')
  }))));
  assert.equal(replies.filter(r=>r.status===429).length,1);
  assert.equal(calls(),30);
});

test('Modo de teste requer passe de uso único, marca a reserva e bloqueia e-mail',async()=>{
  let available=true, flags=[], emails=0;
  const {handler,calls}=harness({
    testMode:true,
    testPass:async pass=>{
      if(pass!=='fixture' || !available)return false;
      available=false;
      return true;
    },
    reserve:async (id,email,phone,isTest)=>{flags.push(isTest);return 'ok';},
    email:async()=>{emails++;return true;}
  });
  assert.equal((await handler(request())).status,403);
  const signed=()=>request({},origin,{'x-fixture-pass':'fixture'});
  const accepted=await handler(signed());
  assert.equal(accepted.status,200);
  assert.deepEqual(await accepted.json(),{gordura:{min:29,estimado:32,max:35},confianca:'baixa',
    teste:true,input_tokens:321,output_tokens:123});
  assert.equal((await handler(signed())).status,403);
  assert.deepEqual(flags,[true]);
  assert.equal(calls(),1);
  assert.equal(emails,0);
});
