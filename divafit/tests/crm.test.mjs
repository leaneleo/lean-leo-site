import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {planInfo,studentSituation,situationBoard,prescriptionCost,leadAlert,nextStage,funnelStats,whatsappLink,addMonths,daysBetween} from '../crm-domain.js';
import {faturamento,familySummary,reportCoverageEnd} from '../finance-painel-data.js';
const T='2026-11-20';
const aluna={id:'a',name:'Ana',status:'Ativo'};
test('crm: planos reconhecem mensal, trimestral (3+1), prorrogação e texto livre',()=>{
 assert.deepEqual([planInfo('Mensal · 1 mês').treinos,planInfo('Plano TRIMESTRAL').treinos,planInfo('Prorrogação ficha 6').kind,planInfo('Consultoria — histórico a conferir').kind],[1,4,'prorrogacao','conferir']);
 assert.equal(planInfo(null).treinos,null);
});
test('crm: datas — meses no fim do mês e diferença em dias',()=>{
 assert.equal(addMonths('2026-01-31',1),'2026-02-28');assert.equal(addMonths('2026-11-20',1),'2026-12-20');assert.equal(daysBetween('2026-11-20','2026-11-27'),7);
});
test('crm: trimestral com 2 de 4 treinos e ficha acabando = devendo treino',()=>{
 const pays=[{id:'p',student_ids:['a'],plan:'Trimestral',starts_on:'2026-09-01',status:'Pago'}];
 const asg=[{student_id:'a',starts_on:'2026-09-01',ends_on:'2026-10-01',status:'Liberada'},{student_id:'a',starts_on:'2026-10-01',ends_on:'2026-11-24',status:'Liberada'}];
 const r=studentSituation(aluna,pays,asg,T);assert.equal(r.status,'devendo');assert.equal(r.delivered,2);assert.equal(r.days,4);
});
test('crm: mensal entregue e ficha acabando = renovar; prorrogação não conta como plano nem como treino novo',()=>{
 const pays=[{id:'p',student_ids:['a'],plan:'Mensal',starts_on:'2026-10-20',status:'Pago'},{id:'x',student_ids:['a'],plan:'Prorrogação',starts_on:'2026-11-01',paid_on:'2026-11-01',status:'Pago'}];
 const asg=[{student_id:'a',starts_on:'2026-10-20',ends_on:'2026-11-22',status:'Liberada'},{student_id:'a',starts_on:'2026-11-01',ends_on:'2026-11-22',status:'Liberada',routine_kind:'Igual'}];
 const r=studentSituation(aluna,pays,asg,T);assert.equal(r.status,'renovar');assert.equal(r.delivered,1);assert.equal(r.extensions,1);assert.equal(r.info.kind,'mensal');
});
test('crm: pagamento pendente tem prioridade; ficha em elaboração e falta de dados aparecem',()=>{
 assert.equal(studentSituation(aluna,[{student_ids:['a'],plan:'Prorrogação',status:'Pendente'}],[{student_id:'a',starts_on:'2026-11-01',ends_on:'2027-01-01',status:'Liberada'}],T).status,'cobrar');
 assert.equal(studentSituation(aluna,[],[{student_id:'a',starts_on:'2026-11-18',status:'Em elaboração'}],T).status,'montando');
 assert.equal(studentSituation(aluna,[],[{student_id:'a',starts_on:'2026-11-01',status:'Em revisão'}],T).status,'conferir');
 assert.equal(studentSituation(aluna,[],[],T).status,'sem_ficha');
 assert.equal(studentSituation(aluna,[],[{student_id:'a',starts_on:'2026-08-01',ends_on:'2026-09-01',status:'Liberada'}],T).status,'inativa');
 assert.equal(studentSituation(aluna,[],[{student_id:'a',starts_on:'2026-11-01',ends_on:'2026-12-31',status:'Em revisão'}],T).status,'em_dia');
});
test('crm: quadro ignora encerradas/arquivadas e ordena por urgência',()=>{
 const students=[{id:'a',name:'Ana'},{id:'b',name:'Bia',status:'Encerrado'},{id:'c',name:'Cris',archived:true},{id:'d',name:'Duda'}];
 const rows=situationBoard(students,[{student_ids:['d'],plan:'Mensal',status:'Pendente'}],[],T);
 assert.deepEqual(rows.map(r=>r.student.name),['Duda','Ana']);
});
test('crm: custo de prescrição conta só treinos novos do mês (R$ 50 cada)',()=>{
 const c=prescriptionCost([{starts_on:'2026-11-02'},{starts_on:'2026-11-10',routine_kind:'Igual'},{starts_on:'2026-10-30'},{starts_on:'2026-11-15',archived:true}],'2026-11');
 assert.deepEqual(c,{treinos:1,cents:5000});
});
test('crm: leads — alertas, próxima etapa, funil e link do WhatsApp',()=>{
 assert.equal(leadAlert({stage:'conversando',next_on:'2026-11-19'},T).kind,'atrasado');
 assert.equal(leadAlert({stage:'novo',next_on:T},T).kind,'hoje');
 assert.equal(leadAlert({stage:'link_enviado',last_contact_on:'2026-11-10'},T).kind,'parado');
 assert.equal(leadAlert({stage:'comprou',next_on:'2026-11-01'},T),null);
 assert.deepEqual(['novo','conversando','link_enviado','comprou'].map(nextStage),['conversando','link_enviado','comprou',null]);
 const f=funnelStats([{created_at:'2026-11-02T10:00:00Z',stage:'comprou',origin:'Instagram direct'},{created_at:'2026-11-03T10:00:00Z',stage:'perdido',origin:'WhatsApp'},{created_at:'2026-11-05T10:00:00Z',stage:'novo',origin:'Instagram direct'},{created_at:'2026-10-05T10:00:00Z',stage:'novo',origin:'Site'}],'2026-11');
 assert.deepEqual([f.total,f.bought,f.lost,f.open,Math.round(f.rate*100),f.byOrigin[0][0]],[3,1,1,1,33,'Instagram direct']);
 assert.equal(whatsappLink('(11) 99999-0000'),'https://wa.me/5511999990000');assert.equal(whatsappLink('5511999990000'),'https://wa.me/5511999990000');assert.equal(whatsappLink('123'),null);
});
test('financeiro: relatório InfinitePay entra como Le&LeoFit e não soma de novo pagamento do mesmo período',()=>{
 const rep=(day,cents,fim)=>({kind:'recebimento',bucket:'leandro',day,cents,quantity:3,status:'confirmado',source:{rotulo:'Faturamento Le&LeoFit',cobertura_fim:fim}});
 const data={entries:[rep('2026-11-01',52439,'2026-11-20'),{kind:'aula',bucket:'leandro',day:'2026-11-03',cents:9000,quantity:1,status:'confirmado'},{kind:'recebimento',bucket:'leandro',day:'2026-11-03',cents:9000,quantity:1,status:'confirmado'}]};
 const payments=[{id:'teste',status:'Pago',paid_on:'2026-11-19',amount:78.8},{id:'novo',status:'Pago',paid_on:'2026-11-25',amount:157.6}];
 const f=faturamento(data,payments,'2026-11');
 assert.equal(reportCoverageEnd(data.entries),'2026-11-20');
 assert.equal(f.sums.divafit,52439+15760);assert.equal(f.sums.leandro,9000);
});
test('família: entradas x saídas, saldo e ranking por categoria',()=>{
 const data={entries:[{kind:'aula',bucket:'leandro',day:'2026-11-03',cents:100000,quantity:1,status:'confirmado'},
  {kind:'despesa',bucket:'familia',day:'2026-11-05',cents:30000,status:'confirmado',category:'Mercado'},
  {kind:'despesa',bucket:'familia',day:'2026-11-06',cents:50000,status:'confirmado',category:'Moradia'},
  {kind:'despesa',bucket:'familia',day:'2026-11-07',cents:99999,status:'cancelado',category:'Lazer'},
  {kind:'despesa',bucket:'familia',day:'2026-11-08',cents:20000,status:'confirmado',category:'Mercado'}]};
 const s=familySummary(data,[],'2026-11');
 assert.deepEqual([s.entradas,s.saidas,s.saldo],[100000,100000,0]);
 assert.deepEqual(s.ranking.map(r=>[r.category,r.cents]),[['Mercado',50000],['Moradia',50000]].sort((a,b)=>b[1]-a[1]));
 assert.equal(s.items[0].day,'2026-11-08');
});
test('build e app incluem o CRM somente para administradores',async()=>{
 const build=await readFile(new URL('../scripts/build.mjs',import.meta.url),'utf8'),app=await readFile(new URL('../app.js',import.meta.url),'utf8'),html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 for(const f of ['crm-domain.js','crm-ui.js','crm.css'])assert.ok(build.includes("'"+f+"'"));
 assert.ok(html.includes('href="crm.css"'));
 assert.ok(app.includes("(k!=='payments'&&k!=='crm')||isAdmin()||preview"));
 assert.ok(app.includes("if(view==='crm'&&isAdmin())crm.mount()"));
});
