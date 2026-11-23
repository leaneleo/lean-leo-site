import test from 'node:test';import assert from 'node:assert/strict';
import {faturamento,annualSeries,saudacao,closingText,parseClassNames,weekDays,rateFor,onlineActivity,calculatorPeople,calculatorTap,knownGroupRate,configuredGroupRate,confirmedActivePeople} from '../finance-painel-data.js';
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

test('calculadora: nomes, mais, trio, remoção e duplicação preservam atendimentos',()=>{
 let g=calculatorTap([], 'a');g=calculatorTap(g,'b');assert.deepEqual(g,[['a'],['b']]);g=calculatorTap([['a']],'b',true);g=calculatorTap(g,'c',true);assert.deepEqual(g,[['a','b','c']]);assert.throws(()=>calculatorTap(g,'d',true));assert.throws(()=>calculatorTap(g,'a'));assert.throws(()=>calculatorTap([],'a',true));
 assert.equal(knownGroupRate([{kind:'aula',status:'confirmado',day:'2026-11-01',client_id:'tarifa',source:{participants:['b','a']}}],['a','b'],'2026-11-19'),'tarifa');assert.equal(knownGroupRate([],['a','b'],'2026-11-19'),null);
});
test('calculadora: modalidades não viram pessoas e a lista não declara status ativo',()=>{
 const clients=[{id:'a',bucket:'leandro',name:'Pessoa',code:'Pessoa'},{id:'b',bucket:'leandro',name:'Pessoa1',code:'Pessoa1'},{id:'c',bucket:'leandro',name:'Laboral',code:'Laboral'}];const data={clients,rates:clients.map(c=>({client_id:c.id}))};assert.deepEqual(calculatorPeople(data,[{bucket:'leandro',name:'Pessoa',client_codes:['Pessoa','Pessoa1']}],'leandro').map(c=>c.id),['a']);
});

test('famílias: contagem usa pessoas confirmadas e preço novo não retroage',()=>{
 const clients=[{id:'a',bucket:'leandro',code:'Pessoa A'},{id:'b',bucket:'leandro',code:'Pessoa B'},{id:'c',bucket:'leandro',code:'Pessoa C'},{id:'d',bucket:'leandro',code:'dupla'},{id:'t',bucket:'leandro',code:'trio'},{id:'s',bucket:'leandro',code:'servico'}];
 const contacts=[{bucket:'leandro',source:{calculator:{active:true,kind:'pessoa',people:['Pessoa A','Pessoa B','Pessoa C'],starts_on:'2026-11-19',tariffs:{2:'dupla',3:'trio'}}}},{bucket:'leandro',source:{calculator:{active:true,kind:'servico',people:['servico']}}}];
 assert.equal(confirmedActivePeople(contacts,'leandro'),3);assert.equal(confirmedActivePeople(contacts,'leonardo'),null);
 assert.equal(configuredGroupRate({clients},contacts,'leandro',['a','b'],'2026-11-18'),null);assert.equal(configuredGroupRate({clients},contacts,'leandro',['a','b'],'2026-11-19'),'d');assert.equal(configuredGroupRate({clients},contacts,'leandro',['b','a','c'],'2026-11-20'),'t');assert.equal(configuredGroupRate({clients},contacts,'leandro',['a','s'],'2026-11-19'),null);
 const rates=[{client_id:'a',starts_on:'2026-01-01',cents:16000},{client_id:'a',starts_on:'2026-11-19',cents:14000}];assert.equal(rateFor(rates,'a','2026-10-31'),16000);assert.equal(rateFor(rates,'a','2026-11-18'),16000);assert.equal(rateFor(rates,'a','2026-11-19'),14000);
});
