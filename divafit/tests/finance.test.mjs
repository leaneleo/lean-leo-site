import test from 'node:test';import assert from 'node:assert/strict';
import {financeSummary,centavos,interpretarAula} from '../finance-domain.js';
test('financeiro: soma dinheiro confirmado uma vez e separa aulas de caixa',()=>{
 const s=financeSummary({clients:[{id:'a',name:'Aluno A',bucket:'leandro'}],entries:[{bucket:'leandro',client_id:'a',kind:'aula',day:'2026-11-01',quantity:2,cents:22000,status:'confirmado'},{bucket:'leandro',client_id:'a',kind:'recebimento',day:'2026-11-03',quantity:1,cents:11000,status:'confirmado'},{bucket:'familia',kind:'despesa',day:'2026-11-01',cents:3000,status:'confirmado'}],payments:[{id:'p',amount:100,status:'Pago',paid_on:'2026-11-05'},{id:'p',amount:100,status:'Pago',paid_on:'2026-11-05'}]},'2026-11');
 assert.equal(s.totalReceived,21000);assert.equal(s.balance,18000);assert.equal(s.buckets.leandro.earned,22000);assert.equal(s.buckets.leandro.classes,2);assert.equal(s.people[0].received,11000);
});
test('financeiro: desconhecido não vira faturamento, cancelamento e outros períodos ficam fora',()=>{
 const entries=[{bucket:'leonardo',kind:'aula',day:'2026-11-01',quantity:1,cents:null,status:'a_revisar'},{bucket:'leonardo',kind:'aula',day:'2026-11-02',quantity:1,cents:10000,status:'a_revisar'},{bucket:'leonardo',kind:'recebimento',day:'2026-11-01',cents:10000,status:'cancelado'},{bucket:'leandro',kind:'recebimento',day:'2025-11-01',cents:10000,status:'confirmado'}];
 const s=financeSummary({entries},'2026');assert.equal(s.totalReceived,0);assert.equal(s.buckets.leonardo.unknown,2);assert.equal(s.buckets.leonardo.earned,0);
});
test('financeiro: centavos exatos, zero válido e dados malformados recusados',()=>{
 assert.equal(centavos('67,50'),6750);assert.equal(centavos('0'),0);for(const v of ['1.001','-1','1e3','1.000,50','R$ 10',''])assert.throws(()=>centavos(v));
});
test('financeiro: plano compartilhado é um único recebimento, pendente não é receita',()=>{
 const s=financeSummary({payments:[{id:'p',student_ids:['a','b'],amount:199,status:'Pago',paid_on:'2026-11-02'},{id:'n',amount:999,status:'Pendente',paid_on:null}]},'2026');assert.equal(s.buckets.divafit.received,19900);assert.equal(s.people.length,1);
});
test('aula pelo texto: exige nome único e personal correspondente, sem gravar nada',()=>{
 const clients=[{id:'a',name:'Aluno Teste',code:'a',bucket:'leandro'}];
 assert.deepEqual(interpretarAula('Hoje Aluno Teste treinou com Leandro',clients,'leandro','2026-11-19'),{clientId:'a',bucket:'leandro',day:'2026-11-19',quantity:1});
 assert.throws(()=>interpretarAula('Hoje Aluno Teste treinou com Leonardo',clients,'leandro','2026-11-19'));
 assert.throws(()=>interpretarAula('Hoje Aluno treinou',clients,'leandro','2026-11-19'));
 assert.throws(()=>interpretarAula('Hoje Aluno Teste treinou com L',clients,'leandro','2026-11-19'));
 assert.throws(()=>interpretarAula('Hoje Aluno Teste treinou',[...clients,{...clients[0],id:'b'}],'leandro','2026-11-19'));
});
