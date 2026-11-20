import test from 'node:test';import assert from 'node:assert/strict';
import {faturamento,annualSeries,saudacao,closingText,parseClassNames,weekDays,rateFor,onlineActivity} from '../finance-painel-data.js';
test('painel: faturamento não duplica recebimento de aula nem juros do comprador',()=>{
 const data={entries:[{bucket:'leandro',kind:'aula',day:'2026-11-01',cents:11000,quantity:1,status:'confirmado'},{bucket:'leandro',kind:'recebimento',day:'2026-11-01',cents:11000,quantity:1,status:'confirmado'},{bucket:'leandro',kind:'aula',day:'2026-11-02',cents:null,quantity:1,status:'a_revisar'}]};
 const payments=[{id:'p',status:'Pago',paid_on:'2026-11-01',amount:120,import_data:{principal_cents:10000}}];
 const result=faturamento(data,payments,'2026-11');assert.equal(result.total,21000);assert.equal(result.pending.leandro,1);assert.equal(result.counts.leandro,1);assert.equal(annualSeries(data,payments,2026).length,12);
});
test('fechamento: saudação considera horário de São Paulo e tratamento é preservado',()=>{
 assert.equal(saudacao(new Date('2026-11-19T11:00:00Z')),'Bom dia');assert.equal(saudacao(new Date('2026-11-19T18:00:00Z')),'Boa tarde');assert.equal(saudacao(new Date('2026-11-19T23:00:00Z')),'Boa noite');
 const s=closingText({month:'2026-11-01',snapshot:{contact:'Aluno A',address:'grande Doutor Aluno A',closing:'Até mais!',total_cents:11000,rows:[{code:'Aluno A',quantity:1,cents:11000}]}},new Date('2026-11-19T23:00:00Z'));
 assert(s.startsWith('Boa noite grande Doutor Aluno A'));assert(s.includes('NOVEMBRO'));assert(s.includes('110,00'));assert(s.endsWith('Até mais!'));
});
test('agenda: texto aceita várias pessoas, mas não decide tarifa de grupo nem inventa nome',()=>{
 const clients=[{id:'a',bucket:'leandro',name:'Vitória',code:'Vitória'},{id:'b',bucket:'leandro',name:'Alexsander',code:'Alexsander'},{id:'c',bucket:'leandro',name:'Vanessa',code:'Vanessa'}];
 assert.deepEqual(parseClassNames('Hoje Vitória, Alexander e Vanessa treinaram',clients,'leandro').map(c=>c.id),['a','b','c']);assert.throws(()=>parseClassNames('Vitória e Vitória',clients,'leandro'));assert.throws(()=>parseClassNames('Outra pessoa treinou',clients,'leandro'));
 assert.equal(rateFor([{client_id:'a',starts_on:'2026-01-01',cents:10000},{client_id:'a',starts_on:'2026-12-01',cents:12000}],'a','2026-11-19'),10000);
});
test('agenda: semana cruza mês/ano sem perder data e métricas online usam confirmação',()=>{
 assert.deepEqual(weekDays('2027-01-01'),['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01']);
 const result=onlineActivity([{id:'1',student_ids:['a'],paid_on:'2026-10-01',status:'Pago'},{id:'2',student_ids:['a'],paid_on:'2026-11-01',status:'Pago'},{id:'3',student_ids:['b'],paid_on:'2026-11-01',status:'Pago'},{id:'4',student_ids:['c'],paid_on:'2026-11-01',status:'Pendente'}],'2026-11');assert.deepEqual(result,{fresh:1,renewals:1});
});
