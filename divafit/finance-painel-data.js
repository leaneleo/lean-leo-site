const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const valid=n=>Number.isSafeInteger(n)&&n>=0;
export const FINANCE_NAMES={divafit:'Le&LeoFit',leandro:'Personal Leandro Romacheli',leonardo:'Personal Leonardo Landim',familia:'Família'};
export const ONLINE_REPORT_LABEL='Faturamento Le&LeoFit';
export const EXPENSE_CATEGORIES=['Moradia','Mercado','Contas da casa','Transporte','Saúde','Educação','Lazer','Cartão de crédito','Equipe (Elisângela)','Ferramentas e sistemas','Impostos e taxas','Outros'];
const isReport=e=>e.kind==='recebimento'&&e.source?.rotulo===ONLINE_REPORT_LABEL;
export function reportCoverageEnd(entries){let end='';for(const e of entries??[])if(isReport(e)&&!e.archived&&e.status!=='cancelado'&&(e.source?.cobertura_fim??'')>end)end=e.source.cobertura_fim;return end;}
export const MONTHS=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
export function faturamento(data,payments,period){
 const reports=(data.entries??[]).filter(e=>e.kind==='recebimento'&&e.source?.type==='personal_monthly_revenue'&&['leandro','leonardo'].includes(e.bucket)&&!e.archived&&e.status==='confirmado'&&valid(e.cents)&&e.source?.month===e.day?.slice(0,7));
 const coveredPersonal=new Set(reports.map(e=>e.bucket+'|'+e.source.month));
 const sums={divafit:0,leandro:0,leonardo:0},counts={leandro:0,leonardo:0},pending={leandro:0,leonardo:0};
 for(const e of data.entries??[]){if(e.kind!=='aula'||e.archived||e.status==='cancelado'||!e.day?.startsWith(period)||!(e.bucket in counts))continue;
  if(e.status!=='confirmado'||!valid(e.cents)){pending[e.bucket]++;continue;}if(!coveredPersonal.has(e.bucket+'|'+e.day.slice(0,7)))sums[e.bucket]+=e.cents;counts[e.bucket]+=e.quantity;
 }
 for(const e of reports)if(e.day.startsWith(period))sums[e.bucket]+=e.cents;
 // Relatórios mensais da InfinitePay (consultoria online): contam como Le&LeoFit.
 for(const e of data.entries??[]){if(!isReport(e)||e.archived||e.status!=='confirmado'||!e.day?.startsWith(period)||!valid(e.cents))continue;sums.divafit+=e.cents;}
 // Pagamentos dentro do período já coberto por relatório não são somados outra vez.
 const covered=reportCoverageEnd(data.entries);
 const seen=new Set();for(const p of payments??[]){if(seen.has(p.id)||p.archived||p.status!=='Pago'||!p.paid_on?.startsWith(period)||(covered&&p.paid_on<=covered))continue;seen.add(p.id);
 const cents=p.import_data?.principal_cents??(p.amount===null||p.amount===''?null:Math.round(Number(p.amount)*100));if(valid(cents))sums.divafit+=cents;}
 return {sums,counts,pending,total:Object.values(sums).reduce((a,b)=>a+b,0)};
}
export function annualSeries(data,payments,year){return MONTHS.map((name,i)=>{const period=year+'-'+String(i+1).padStart(2,'0');return {name,period,...faturamento(data,payments,period)};});}
export function rateFor(rates,id,day){return rates.filter(r=>r.client_id===id&&r.starts_on<=day).sort((a,b)=>b.starts_on.localeCompare(a.starts_on))[0]?.cents??null;}
export function saudacao(now=new Date()){const h=Number(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',hourCycle:'h23'}).format(now));return h>=5&&h<12?'Bom dia':h>=12&&h<18?'Boa tarde':'Boa noite';}
export function closingText(closing,now=new Date()){
 const s=closing.snapshot,month=Number(closing.month.slice(5,7))-1;
 const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100);
 const vars={saudacao:saudacao(now),tratamento:s.address||s.contact,mes:MONTHS[month].toLocaleUpperCase('pt-BR'),ano:closing.month.slice(0,4),detalhes:(s.rows??[]).map(r=>r.code+': '+(r.quantity??0)+' aula(s) · '+(r.cents==null?'a conferir':money(r.cents))).join('\n'),valor:money(s.total_cents),despedida:s.closing||''};
 return String(s.template||'{saudacao} {tratamento}\n*FECHAMENTO {mes} - {ano}*\n{detalhes}\nTotal: {valor}\n{despedida}').replace(/\\n/g,'\n').replace(/\{([a-z_]+)\}/g,(all,key)=>vars[key]??all).trim();
}
export function parseClassNames(text,clients,bucket){
 let s=normalize(text).replace(/^[\s]*(hoje|ontem)\s+/,'').replace(/\s+trein(?:ou|aram)(?:\s+com\s+(?:leandro|leonardo))?[.!]?$/,'').trim();
 if(!s||s.length>1000)throw Error('Informe quem treinou.');
 const parts=s.split(/\s*,\s*|\s+e\s+/).filter(Boolean);if(parts.length>20)throw Error('Registre no máximo 20 pessoas por vez.');
 const ids=new Set(),result=[];for(let name of parts){if(name==='alexander')name='alexsander';const matches=clients.filter(c=>c.bucket===bucket&&!c.archived&&(normalize(c.name)===name||normalize(c.code)===name));
  if(matches.length!==1)throw Error('Confira o nome “'+name+'” na aba Alunos e valores.');if(ids.has(matches[0].id))throw Error('Uma pessoa foi informada duas vezes.');ids.add(matches[0].id);result.push(matches[0]);}
 return result;
}
export function weekDays(day){const d=new Date(day+'T12:00:00Z'),dow=d.getUTCDay();d.setUTCDate(d.getUTCDate()-(dow===0?6:dow-1));return Array.from({length:5},(_,i)=>{const v=new Date(d);v.setUTCDate(v.getUTCDate()+i);return v.toISOString().slice(0,10);});}
export function shiftDay(day,n){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function activePersonal(data,bucket,day){const start=shiftDay(day,-90),ids=new Set();for(const e of data.entries??[]){if(e.bucket!==bucket||e.kind!=='aula'||e.status!=='confirmado'||e.day<start||e.day>day)continue;const members=e.source?.participants?.length?e.source.participants:[e.client_id];members.forEach(id=>ids.add(id));}return ids.size;}
export function onlineActivity(payments,month){
 const first=new Map();for(const p of payments){if(p.status!=='Pago'||!p.paid_on||p.archived)continue;for(const id of p.student_ids??[])if(!first.has(id)||p.paid_on<first.get(id))first.set(id,p.paid_on);}
 const fresh=new Set();let renewals=0;for(const p of payments){if(p.status!=='Pago'||!p.paid_on?.startsWith(month)||p.archived)continue;let renewed=false;for(const id of p.student_ids??[]){if(first.get(id)===p.paid_on)fresh.add(id);else renewed=true;}if(renewed)renewals++;}return {fresh:fresh.size,renewals};
}

// Cadastros de cobrança e modalidades não representam um status de pessoa ativa.
export function calculatorPeople(data,contacts,bucket,all=false){
 const clients=(data.clients??[]).filter(c=>c.bucket===bucket&&!c.archived);
 const confirmed=contacts.filter(c=>c.bucket===bucket&&c.source?.calculator?.active===true&&c.source.calculator.kind==='pessoa');
 const codes=new Set(confirmed.length?confirmed.flatMap(c=>c.source.calculator.people):contacts.filter(c=>c.bucket===bucket).flatMap(c=>[c.name,...c.client_codes]));
 return clients.filter(c=>{
  if(!data.rates.some(r=>r.client_id===c.id))return false;
  if(/\d$/.test(c.code)||/^(laboral|lab|avaliação|avaliacao)/i.test(c.code))return false;
  if(clients.some(base=>base.id!==c.id&&normalize(base.code)===normalize(c.code.slice(0,-1))&&/[AR]$/.test(c.code)))return false;
  return all||!codes.size||codes.has(c.code);
 }).map(c=>({...c,label:c.name})).sort((a,b)=>a.label.localeCompare(b.label,'pt-BR'));
}
export function calculatorTap(groups,id,join=false){
 if(groups.some(g=>g.includes(id)))throw Error('Esse aluno já está no visor.');
 const next=groups.map(g=>[...g]);
 if(join){if(!next.length)throw Error('Escolha o primeiro aluno antes do +.');if(next.at(-1).length>=3)throw Error('Este atendimento já tem três pessoas.');next.at(-1).push(id);}else next.push([id]);
 return next;
}
export function knownGroupRate(entries,participants,day){
 const key=[...participants].sort().join('|');
 return entries.filter(v=>v.kind==='aula'&&v.status==='confirmado'&&v.day<=day&&v.source?.participants?.length>1&&[...v.source.participants].sort().join('|')===key).sort((a,b)=>b.day.localeCompare(a.day))[0]?.client_id??null;
}

export function confirmedActivePeople(contacts,bucket){
 const rules=contacts.filter(c=>c.bucket===bucket&&c.source?.calculator?.active===true&&c.source.calculator.kind==='pessoa');
 return rules.length?new Set(rules.flatMap(c=>c.source.calculator.people)).size:null;
}
export function configuredGroupRate(data,contacts,bucket,participants,day){
 if(participants.length<2||participants.length>3)return null;
 const codes=participants.map(id=>data.clients.find(c=>c.id===id&&c.bucket===bucket)?.code);if(codes.some(c=>!c))return null;
 const rules=contacts.filter(c=>c.bucket===bucket&&c.source?.calculator?.active===true&&c.source.calculator.kind==='pessoa'&&c.source.calculator.starts_on<=day&&codes.every(code=>c.source.calculator.people.includes(code)));
 if(rules.length!==1)return null;const code=rules[0].source.calculator.tariffs?.[String(participants.length)];return data.clients.find(c=>c.bucket===bucket&&c.code===code&&!c.archived)?.id??null;
}

// Família: entradas (faturamento registrado) x saídas (gastos da casa).
export function familySummary(data,payments,period){
 const entradas=faturamento(data,payments,period).total;let saidas=0;const byCategory={};const items=[];
 for(const e of data.entries??[]){if(e.kind!=='despesa'||e.bucket!=='familia'||e.archived||e.status!=='confirmado'||!e.day?.startsWith(period)||!valid(e.cents))continue;
  saidas+=e.cents;const c=e.category||'Outros';byCategory[c]=(byCategory[c]??0)+e.cents;items.push(e);}
 const ranking=Object.entries(byCategory).map(([category,cents])=>({category,cents,share:saidas?cents/saidas:0})).sort((a,b)=>b.cents-a.cents);
 return {entradas,saidas,saldo:entradas-saidas,ranking,items:items.sort((a,b)=>b.day.localeCompare(a.day))};
}
export function familySeries(data,payments,year){return MONTHS.map((name,i)=>{const period=year+'-'+String(i+1).padStart(2,'0');return {name,period,...familySummary(data,payments,period)};});}
