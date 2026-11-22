import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler,MODEL} from '../supabase/functions/body-analysis/handler.mjs';

const student = '0d2fca00-fdcd-4a4e-870a-e406f70a9752';
const actor = 'e150bfca-74cf-41a8-87ff-a0d3980d099d';
const good = {
  fotos_ok:true,problemas_fotos:[],gordura_percentual:{min:20,estimado:25,max:30},
  confianca:'baixa',motivo_confianca:'Aproximação.',massa_gorda_kg:19,massa_magra_kg:61,
  observacoes:{distribuicao_gordura:'',definicao_muscular:'',postura:'',assimetrias:''},
  comparacao_anterior:'',sugestoes_para_o_personal:[],limitacoes:'Aproximação.'
};
function request() {
  const form = new FormData();
  for (const [key,value] of Object.entries({student_id:student,weight:80,height:170,age:32,sex:'feminino'})) form.set(key,value);
  for (const angle of ['frente','lado','costas']) form.set(angle,new Blob(['fictício'],{type:'image/jpeg'}),angle+'.jpg');
  return new Request('https://example.test/functions/v1/body-analysis',{method:'POST',headers:{Authorization:'Bearer test'},body:form});
}
function setup(options={}) {
  const calls = {anthropic:0,uploaded:[],cleaned:[],reservations:0};
  const handler = createHandler({
    teamUser:async()=>options.user===false?null:actor,hasConsent:async()=>options.consent!==false,
    ready:()=>true,resize:async()=>new Uint8Array([9]),
    begin:async()=>{calls.reservations++;return options.limit?'limit':'ok';},
    upload:async path=>calls.uploaded.push(path),
    cleanUncommitted:async (_,paths)=>calls.cleaned.push(...paths),
    finish:async (id,who,data)=>{calls.finished={id,who,data};},
    call:async()=>{
      calls.anthropic++;
      const value = options.invalid || (options.retry && calls.anthropic===1) ? 'resposta inválida' : JSON.stringify(good);
      return {usage:{input_tokens:1000,output_tokens:200},content:[{type:'text',text:value}]};
    }
  });
  return {handler,calls};
}
test('Fora da equipe não processa fotos nem reserva análise', async()=>{
  const {handler,calls}=setup({user:false});
  assert.equal((await handler(request())).status,403);
  assert.deepEqual(calls,{anthropic:0,uploaded:[],cleaned:[],reservations:0});
});
test('Sem consentimento bloqueia antes de armazenar fotos', async()=>{
  const {handler,calls}=setup({consent:false});
  const response=await handler(request());
  assert.equal(response.status,409);
  assert.match((await response.json()).message,/consentimento/);
  assert.deepEqual(calls,{anthropic:0,uploaded:[],cleaned:[],reservations:0});
});
test('Limite diario não envia fotos ou chama a Anthropic', async()=>{
  const {handler,calls}=setup({limit:true});
  assert.equal((await handler(request())).status,429);
  assert.equal(calls.anthropic,0);
  assert.equal(calls.uploaded.length,0);
});
test('Dois JSON inválidos devolvem erro claro e limpam fotos sem gravar rascunho', async()=>{
  const {handler,calls}=setup({invalid:true});
  const response=await handler(request());
  assert.equal(response.status,502);
  assert.match((await response.json()).message,/dois resultados inválidos/);
  assert.equal(calls.anthropic,2);
  assert.equal(calls.finished,undefined);
  assert.deepEqual(calls.cleaned,calls.uploaded);
});
test('Retry válido acumula tokens e finaliza como rascunho', async()=>{
  const {handler,calls}=setup({retry:true});
  const response=await handler(request());
  assert.equal(response.status,201);
  assert.equal((await response.json()).status,'rascunho');
  const {who,data}=calls.finished;
  assert.equal(who,actor);
  assert.equal(data.model,MODEL);
  assert.equal(data.input_tokens,2000);
  assert.equal(data.output_tokens,400);
  assert.equal(data.result.massa_gorda_kg,20);
  assert.equal(data.result.massa_magra_kg,60);
  assert.equal(calls.cleaned.length,0);
});
