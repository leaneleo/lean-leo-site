// Regras do CRM DivaFit: situação de cada aluna e funil de leads. Funções puras, sem acesso à rede.
export const STAGES=[['novo','Novos'],['conversando','Conversando'],['link_enviado','Link enviado'],['comprou','Comprou'],['perdido','Perdido']];
export const OPEN_STAGES=['novo','conversando','link_enviado'];
export const ORIGINS=['Instagram direct','Instagram comentário','Instagram story','WhatsApp','Indicação','Site','Checkout','Outro'];
export const INTERESTS=['Mensal','Trimestral','Desafio DIVAFIT','Avaliação física','Personal presencial','A definir'];
export const RESPONSIBLES=['Leandro','Leonardo'];
export const PRESCRIPTION_CENTS=5000; // Elisângela: cerca de R$ 50 por treino novo montado.
export const EXTENSION_CENTS=2000;    // Prorrogação: R$ 20 para manter o mesmo treino por mais um mês.
export const SITUATIONS=[
 ['cobrar','Cobrar','Pagamento pendente ou vencido.'],
 ['devendo','Devendo treino','A rotina está acabando e o plano ainda tem treino a entregar.'],
 ['renovar','Renovar ou prorrogar','A rotina termina em até 7 dias (ou terminou há pouco) e o plano foi entregue.'],
 ['montando','Treino em preparo','Há uma rotina em elaboração.'],
 ['em_dia','Em dia','Rotina vigente por mais de 7 dias.'],
 ['conferir','Conferir dados','Falta data de término da rotina.'],
 ['inativa','Reativar','Rotina terminou há mais de 30 dias.'],
 ['sem_ficha','Sem rotina','Nenhuma rotina registrada.']
];
const normalize=s=>String(s??'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
export function planInfo(plan){const t=normalize(plan);
 if(/prorrog/.test(t))return {kind:'prorrogacao',label:'Prorrogação',treinos:0,meses:1};
 if(/trimestr/.test(t))return {kind:'trimestral',label:'Trimestral (3 + 1 de bônus)',treinos:4,meses:4};
 if(/semestr/.test(t))return {kind:'semestral',label:'Semestral',treinos:null,meses:6};
 if(/mensal/.test(t))return {kind:'mensal',label:'Mensal',treinos:1,meses:1};
 return {kind:'conferir',label:'Plano a conferir',treinos:null,meses:null};
}
export function daysBetween(from,to){return Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000);}
export function addMonths(day,n){const d=new Date(day+'T12:00:00Z');const target=d.getUTCMonth()+n;d.setUTCDate(1);d.setUTCMonth(target);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(Number(day.slice(8,10)),last));return d.toISOString().slice(0,10);}
const payDay=p=>p.paid_on||p.starts_on||String(p.created_at??'').slice(0,10)||'';
export function studentSituation(student,payments,assignments,today){
 const mine=(assignments??[]).filter(a=>a.student_id===student.id&&!a.archived).sort((a,b)=>String(b.starts_on??'').localeCompare(String(a.starts_on??''))||String(b.created_at??'').localeCompare(String(a.created_at??'')));
 const building=mine.find(a=>a.status==='Em elaboração')??null;
 const current=mine.find(a=>a.status!=='Em elaboração')??null;
 const pays=(payments??[]).filter(p=>!p.archived&&p.status!=='Cancelado'&&(p.student_ids??[]).includes(student.id)).sort((a,b)=>payDay(b).localeCompare(payDay(a)));
 const base=pays.find(p=>planInfo(p.plan).kind!=='prorrogacao')??null;
 const info=planInfo(base?.plan);
 const start=base?.starts_on||base?.paid_on||null;
 const extensions=pays.filter(p=>planInfo(p.plan).kind==='prorrogacao'&&(!start||payDay(p)>=start)).length;
 const delivered=start?mine.filter(a=>a.starts_on&&a.starts_on>=start&&a.status!=='Em elaboração'&&a.routine_kind!=='Igual').length:null;
 const end=current?.ends_on??null,days=end?daysBetween(today,end):null;
 const owing=pays.some(p=>p.status==='Pendente'||(p.due_on&&p.due_on<today&&p.status!=='Pago'));
 let status;
 if(owing)status='cobrar';
 else if(building)status='montando';
 else if(!current)status='sem_ficha';
 else if(days===null)status='conferir';
 else if(days<-30)status='inativa';
 else if(days<=7)status=info.treinos!=null&&delivered!=null&&delivered<info.treinos?'devendo':'renovar';
 else status='em_dia';
 return {student,current,building,base,info,start,delivered,extensions,end,days,status};
}
export function situationBoard(students,payments,assignments,today){
 const rows=(students??[]).filter(s=>!s.archived&&s.status!=='Encerrado').map(s=>studentSituation(s,payments,assignments,today));
 const order=Object.fromEntries(SITUATIONS.map(([k],i)=>[k,i]));
 return rows.sort((a,b)=>order[a.status]-order[b.status]||(a.days??9999)-(b.days??9999)||a.student.name.localeCompare(b.student.name,'pt-BR'));
}
export function countBy(rows){const c={};for(const r of rows)c[r.status]=(c[r.status]??0)+1;return c;}
// Treinos novos montados no mês (cópias "Igual" não contam) × valor por treino.
export function prescriptionCost(assignments,period){const n=(assignments??[]).filter(a=>!a.archived&&a.starts_on?.startsWith(period)&&a.routine_kind!=='Igual').length;return {treinos:n,cents:n*PRESCRIPTION_CENTS};}
export function leadAlert(lead,today){
 if(!OPEN_STAGES.includes(lead.stage))return null;
 if(lead.next_on&&lead.next_on<today)return {kind:'atrasado',text:'Follow-up atrasado'};
 if(lead.next_on===today)return {kind:'hoje',text:'Falar hoje'};
 if(!lead.next_on&&lead.last_contact_on&&daysBetween(lead.last_contact_on,today)>3)return {kind:'parado',text:'Parado há '+daysBetween(lead.last_contact_on,today)+' dias'};
 return null;
}
export function nextStage(stage){const i=OPEN_STAGES.indexOf(stage);return i<0?null:(OPEN_STAGES[i+1]??'comprou');}
export function funnelStats(leads,period){
 const mine=(leads??[]).filter(l=>!l.archived&&String(l.created_at??'').slice(0,7)===period);
 const bought=mine.filter(l=>l.stage==='comprou').length,lost=mine.filter(l=>l.stage==='perdido').length;
 const byOrigin={};for(const l of mine)byOrigin[l.origin]=(byOrigin[l.origin]??0)+1;
 return {total:mine.length,bought,lost,open:mine.length-bought-lost,rate:mine.length?bought/mine.length:null,byOrigin:Object.entries(byOrigin).sort((a,b)=>b[1]-a[1])};
}
export function whatsappLink(phone){const d=String(phone??'').replace(/\D/g,'');if(d.length<10)return null;return 'https://wa.me/'+(d.length<=11?'55'+d:d);}
