export const FINANCE_BUCKETS={divafit:'Consultoria Online DivaFit',leandro:'Personal Leandro Romachelli',leonardo:'Personal Leonardo Landim'};
export const reais=c=>c===null||c===undefined?'A conferir':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(c/100);
export function centavos(v){if(typeof v!=='string'||!/^\d+(?:[.,]\d{1,2})?$/.test(v.trim()))throw Error('Informe um valor com até duas casas decimais.');const [i,d='']=v.trim().replace(',','.').split('.');const n=Number(i)*100+Number(d.padEnd(2,'0'));if(!Number.isSafeInteger(n)||n>100000000)throw Error('Valor fora do limite.');return n;}
const cents=v=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:null;
export function financeSummary({entries=[],payments=[],clients=[]},period){
 if(!/^\d{4}(?:-\d{2})?$/.test(period))throw Error('Período inválido.');
 const buckets=Object.fromEntries(Object.keys(FINANCE_BUCKETS).map(k=>[k,{earned:0,received:0,expenses:0,classes:0,unknown:0}])),people=new Map();let familyExpenses=0,familyExtra=0;
 const person=(key,name,bucket)=>{if(!people.has(key))people.set(key,{name,bucket,earned:0,received:0,classes:0,unknown:0});return people.get(key);};
 for(const e of entries){if(e.status==='cancelado'||!e.day?.startsWith(period))continue;const v=cents(e.cents),b=buckets[e.bucket],c=clients.find(c=>c.id===e.client_id),p=c?person(c.id,c.name,c.bucket):null;
  if(e.status!=='confirmado'||v===null){if(b)b.unknown++;if(p)p.unknown++;continue;}
  if(e.kind==='aula'&&b){b.earned+=v;b.classes+=e.quantity;if(p){p.earned+=v;p.classes+=e.quantity;}}
  if(e.kind==='recebimento'){if(b)b.received+=v;else familyExtra+=v;if(p)p.received+=v;}
  if(e.kind==='despesa'){if(b)b.expenses+=v;else familyExpenses+=v;}
  if(e.kind==='extra'){if(b)b.received+=v;else familyExtra+=v;}
 }
 const seen=new Set();for(const p of payments){if(seen.has(p.id)||p.archived||p.status!=='Pago'||!p.paid_on?.startsWith(period))continue;seen.add(p.id);const n=p.amount===null||p.amount===''?NaN:Number(p.amount),v=Math.round(n*100);if(!Number.isFinite(n)||!Number.isSafeInteger(v)||v<0){buckets.divafit.unknown++;continue;}buckets.divafit.received+=v;person('plano:'+(p.student_ids?.length?[...p.student_ids].sort().join('|'):p.id),p.student_names||p.plan||'Plano da consultoria','divafit').received+=v;}
 const totalReceived=Object.values(buckets).reduce((s,b)=>s+b.received,0)+familyExtra,totalExpenses=Object.values(buckets).reduce((s,b)=>s+b.expenses,0)+familyExpenses;
 return {buckets,people:[...people.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),totalReceived,totalExpenses,balance:totalReceived-totalExpenses,familyExtra};
}

export function interpretarAula(text,clients,bucket,day){
 const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim().replace(/\s+/g,' ');
 const t=normalize(text),match=/^hoje (.+?) treinou(?: com (leandro|leonardo))?[.!]?$/.exec(t);
 if(!match)throw Error('Use: Hoje nome do aluno treinou. Escolha o personal e confira o aluno antes de salvar.');
 if(match[2]&&match[2]!==bucket)throw Error('O nome do personal não corresponde ao card selecionado.');
 const found=clients.filter(c=>c.bucket===bucket&&(normalize(c.name)===match[1]||normalize(c.code)===match[1]));
 if(found.length!==1)throw Error('Aluno não identificado de forma única. Selecione aluno/modalidade no formulário.');
 return {clientId:found[0].id,bucket,day,quantity:1};
}
