import test from 'node:test';import assert from 'node:assert/strict';import {studentRateRows,rateFor} from '../finance-painel-data.js';
const clients=[{id:'a',code:'a',name:'Pessoa A',bucket:'leandro'},{id:'b',code:'b',name:'Pessoa B',bucket:'leandro'},{id:'old',code:'Antiga1',name:'Antiga1',bucket:'leandro'},{id:'off',code:'inativa',name:'Pessoa Inativa',bucket:'leandro'},{id:'pair',code:'familia-dupla',name:'familia-dupla',bucket:'leandro'},{id:'service',code:'servico',name:'Serviço',bucket:'leandro'},{id:'other',code:'outro',name:'Outro personal',bucket:'leonardo'}];
const contacts=[{bucket:'leandro',source:{calculator:{active:true,kind:'pessoa',people:['a','b'],tariffs:{2:'familia-dupla'},starts_on:'2026-01-01'},closing:{people:{b:{name:'Nome de uso'}}}}},{bucket:'leandro',source:{calculator:{active:false,people:['inativa'],starts_on:'2026-01-01'}}},{bucket:'leandro',source:{calculator:{active:true,kind:'servico',people:['servico'],starts_on:'2026-01-01'}}}];
test('valores: pessoas confirmadas, grupos legíveis e serviço; exclui códigos antigos e inativos',()=>{
 const rates=clients.map(c=>({client_id:c.id,cents:12300,starts_on:'2026-01-01'}));const rows=studentRateRows({clients,rates},contacts,'leandro','2026-11-25');assert.equal(rows.filter(r=>r.kind==='pessoa').length,2);assert.equal(rows.length,4);assert(!rows.some(r=>['old','off','other'].includes(r.id)));assert(rows.some(r=>r.label==='Nome de uso'));assert(rows.find(r=>r.id==='pair').label.includes('dupla'));assert(!rows.find(r=>r.id==='pair').label.includes('familia-dupla'));assert.equal(rateFor(rates,rows[0].id,'2026-11-25'),12300);assert.equal(clients.length,7);
});
test('valores: não reativa lista antiga quando todos foram marcados inativos ou vigência é futura',()=>{
 assert.deepEqual(studentRateRows({clients,rates:[]},contacts.filter(c=>c.source.calculator.active===false),'leandro','2026-11-25'),[]);
 assert.deepEqual(studentRateRows({clients,rates:[]},contacts,'leandro','2025-12-31'),[]);
});
