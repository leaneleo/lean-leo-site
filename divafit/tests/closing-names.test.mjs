import test from 'node:test';import assert from 'node:assert/strict';
import {closingDetails,closingText} from '../finance-painel-data.js';
const a={code:'a',name:'Pessoa A',gender:'m',recipient:true},b={code:'b',name:'Pessoa B',gender:'f'},c={code:'c',name:'Pessoa C',gender:'f'};
const row=(people,quantity)=>({people,quantity});
test('fechamento: destinatário, duplas distintas e aulas individuais sem siglas',()=>{
 const result=closingDetails({format_version:2,rows:[row([a],6),row([b,c],2),row([a,c],1),row([b],3)]});
 assert.equal(result.unresolved,false);assert.equal(result.text,'Você treinou sozinho em 6 aulas.\nPessoa B e Pessoa C treinaram juntas em 2 aulas.\nVocê e Pessoa C treinaram juntos em 1 aula.\nPessoa B treinou sozinha em 3 aulas.');
});
test('fechamento: pessoa com cobrança por responsável resume individual, dupla e trio',()=>{
 const person={...b,recipient:false};const result=closingDetails({format_version:2,compact_person:'b',rows:[row([person],7),row([person,c],2),row([c,person],1),row([a,c],4)]});
 assert.equal(result.text,'Pessoa B treinou sozinha em 7 aulas e em dupla em 3 aulas.\nVocê e Pessoa C treinaram juntos em 4 aulas.');
});
test('fechamento: não presume gênero, identifica trios e preserva serviços',()=>{
 const p={code:'d',name:'Pessoa D'};const result=closingDetails({format_version:2,rows:[row([p],1),row([p,b,c],2),{service:true,label:'Ginástica laboral',quantity:3}]});
 assert.equal(result.text,'Pessoa D treinou individualmente em 1 aula.\nPessoa B, Pessoa C e Pessoa D treinaram em trio em 2 aulas.\nGinástica laboral: 3 aulas.');
});
test('fechamento: não expõe código antigo e marca combinação desconhecida para conferir',()=>{
 assert.equal(closingDetails({rows:[{code:'ABC1',quantity:2}]}).unresolved,true);
 const r=closingDetails({format_version:2,rows:[{unresolved:true,quantity:2,code:'ABC1'}]});assert(r.unresolved);assert(!r.text.includes('ABC1'));assert(r.text.includes('participantes a conferir'));
});
test('fechamento: quebra de linha importada, tratamento e valor preservados',()=>{
 const text=closingText({month:'2026-11-01',snapshot:{format_version:2,address:'gata',contact:'Pessoa B',rows:[row([b],1)],total_cents:12300,template:'{saudacao} {tratamento}\\\\n{detalhes}\\\\nTotal: {valor}'}},new Date('2026-11-19T23:00:00Z'));
 assert.equal(text,'Boa noite, gata.\nPessoa B treinou sozinha em 1 aula.\nTotal: R$ 123,00');assert(!text.includes('\\'));
});
