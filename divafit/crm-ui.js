import {reais} from './finance-domain.js';
import {STAGES,OPEN_STAGES,ORIGINS,INTERESTS,RESPONSIBLES,SITUATIONS,EXTENSION_CENTS,situationBoard,countBy,prescriptionCost,leadAlert,nextStage,funnelStats,whatsappLink,addMonths} from './crm-domain.js';
const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const dateLabel=d=>d?d.split('-').reverse().join('/'):'—';
function button(text,fn,cls='secondary'){const b=e('button',text,cls);b.type='button';b.addEventListener('click',fn);return b;}
function field(box,label,node){const l=e('label',null,'field');l.append(e('span',label),node);box.append(l);return node;}
function input(box,label,type='text',value=''){const n=e(type==='textarea'?'textarea':'input');if(type!=='textarea')n.type=type;n.value=value??'';n.setAttribute('aria-label',label);return field(box,label,n);}
function select(box,label,items,value){const n=e('select');n.setAttribute('aria-label',label);for(const [v,t]of items){const o=e('option',t);o.value=v;if(v===value)o.selected=true;n.append(o);}return field(box,label,n);}
function stat(box,label,value,hint){const n=e('div',null,'fp-stat');n.append(e('small',label),e('strong',String(value)));if(hint)n.title=hint;box.append(n);return n;}
const pair=v=>[v,v];

export function createCrm({api,db,isAdmin,notice,reload,openStudent}){
 let tab='alunas',filter='acao',leads=null,generation=0,editing=null;
 const clear=()=>{generation++;leads=null;editing=null;document.querySelector('#crm-board')?.replaceChildren();};
 async function mount(){const box=document.querySelector('#crm-board');if(!box)return;if(!isAdmin())return clear();const g=++generation;
  if(leads===null){box.replaceChildren(e('p','Carregando…','muted'));try{const l=await api.crmLeads();if(g!==generation||!box.isConnected)return;leads=l;}catch(err){if(g===generation)box.replaceChildren(e('p','Não foi possível carregar o CRM: '+err.message));return;}}
  draw(box);
 }
 function redraw(){const box=document.querySelector('#crm-board');if(box&&isAdmin()&&leads)draw(box);}
 async function refreshLeads(){leads=null;await mount();}
 function draw(box){box.replaceChildren();box.className='crm finance-painel';const t=today(),data=db();
  const board=situationBoard(data.students,data.payments,data.assignments,t),counts=countBy(board),cost=prescriptionCost(data.assignments,t.slice(0,7));
  const open=(leads??[]).filter(l=>OPEN_STAGES.includes(l.stage)),late=open.filter(l=>leadAlert(l,t));
  const metrics=e('div',null,'fp-stats crm-stats');
  stat(metrics,'Leads em aberto',open.length);stat(metrics,'Follow-ups para hoje/atrasados',late.length);
  stat(metrics,'Alunas para cobrar',counts.cobrar??0);stat(metrics,'Renovar ou prorrogar',counts.renovar??0);stat(metrics,'Devendo treino',counts.devendo??0);
  stat(metrics,'Prescrição no mês (estimado)',reais(cost.cents),cost.treinos+' treino(s) novo(s) iniciados neste mês × R$ 50. Cópias iguais não contam.');
  box.append(metrics);
  const tabs=e('div',null,'crm-tabs');for(const [k,label]of [['alunas','Situação das alunas'],['leads','Funil de leads']]){const b=button(label,()=>{tab=k;editing=null;redraw();},tab===k?'primary':'secondary');b.setAttribute('aria-pressed',String(tab===k));tabs.append(b);}box.append(tabs);
  if(tab==='alunas')students(box,board,counts,t);else leadsView(box,t);
 }
 function students(box,board,counts,t){
  const chips=e('div',null,'crm-chips');const action=['cobrar','devendo','renovar','montando'];const actionCount=action.reduce((a,k)=>a+(counts[k]??0),0);
  const chip=(k,label,n)=>{const b=button(label+' ('+n+')',()=>{filter=k;redraw();},'crm-chip'+(filter===k?' selected':''));chips.append(b);};
  chip('acao','Precisam de ação',actionCount);for(const [k,label]of SITUATIONS)if(counts[k])chip(k,label,counts[k]);chip('todas','Todas',board.length);box.append(chips);
  const rows=board.filter(r=>filter==='todas'||(filter==='acao'?action.includes(r.status):r.status===filter));
  const info=SITUATIONS.find(([k])=>k===filter);box.append(e('p',info?info[2]:filter==='acao'?'Cobrar, entregar treino, renovar ou terminar de montar.':'Todas as alunas ativas ou a revisar.','muted'));
  if(!rows.length){box.append(e('p','Nada aqui. 🎉','crm-empty'));return;}
  const list=e('div',null,'crm-list');
  for(const r of rows){const card=e('article',null,'crm-card status-'+r.status),head=e('div',null,'crm-card-head');
   head.append(e('h3',r.student.name),e('span',SITUATIONS.find(([k])=>k===r.status)[1],'crm-badge badge-'+r.status));card.append(head);
   const facts=e('ul',null,'crm-facts');
   facts.append(e('li',r.info.label+(r.extensions?' · '+r.extensions+' prorrogação(ões)':'')));
   facts.append(e('li',r.info.treinos==null?'Treinos do plano: a conferir':r.delivered==null?'Treinos: '+r.info.treinos+' no plano · início do plano a conferir':'Treinos entregues: '+r.delivered+' de '+r.info.treinos));
   if(r.end)facts.append(e('li','Ficha atual termina em '+dateLabel(r.end)+(r.days>=0?' (em '+r.days+' dia'+(r.days===1?'':'s')+')':' (há '+(-r.days)+' dia'+(r.days===-1?'':'s')+')')));
   if(r.building)facts.append(e('li','Nova ficha em elaboração'+(r.building.number?' (nº '+r.building.number+')':'')));
   card.append(facts);
   const actions=e('div',null,'crm-actions');actions.append(button('Abrir aluna',()=>openStudent(r.student.id)));
   if(r.current&&['renovar','inativa','em_dia','devendo'].includes(r.status))actions.append(button('Registrar prorrogação (R$ 20)',async ev=>{
    const start=r.end&&r.end>=t?r.end:t;if(!confirm('Registrar prorrogação de '+r.student.name+' por mais 1 mês (R$ 20)? Fica como Pendente até você marcar como pago no Financeiro.'))return;
    const b=ev.currentTarget;b.disabled=true;b.textContent='Registrando…';
    try{await api.save('payments',{student_ids:[r.student.id],plan:'Prorrogação',amount:EXTENSION_CENTS/100,starts_on:start,ends_on:addMonths(start,1),status:'Pendente',notes:'Prorrogação do mesmo treino por mais 1 mês (R$ 20). Registrada pelo CRM.'});notice('Prorrogação registrada como pendente.');await reload();}
    catch(err){notice(err.message,'error');b.disabled=false;b.textContent='Registrar prorrogação (R$ 20)';}},'secondary'));
   card.append(actions);list.append(card);}
  box.append(list);
 }
 function leadsView(box,t){
  const stats=funnelStats(leads,t.slice(0,7)),m=e('div',null,'crm-funnel');
  m.append(e('span','Neste mês: '+stats.total+' lead(s) · '+stats.bought+' compraram · '+stats.lost+' perdidos'+(stats.rate==null?'':' · conversão '+Math.round(stats.rate*100)+'%')));
  if(stats.byOrigin.length)m.append(e('small','Origem: '+stats.byOrigin.slice(0,4).map(([o,n])=>o+' '+n).join(' · ')));box.append(m);
  box.append(button(editing==='new'?'Fechar formulário':'+ Novo lead',()=>{editing=editing==='new'?null:'new';redraw();},'primary crm-new'));
  if(editing==='new')box.append(editor(null));
  const columns=e('div',null,'crm-columns');
  for(const [stage,label]of STAGES){const col=e('section',null,'crm-column'),items=(leads??[]).filter(l=>l.stage===stage);
   col.append(e('h3',label+' · '+items.length));
   if(stage==='perdido'||stage==='comprou')items.splice(10);
   for(const l of items){if(editing===l.id){col.append(editor(l));continue;}
    const c=e('article',null,'crm-lead'),alert=leadAlert(l,t);
    c.append(e('strong',l.name),e('small',l.interest+' · '+l.origin+' · '+l.responsible));
    if(alert)c.append(e('span',alert.text,'crm-alert alert-'+alert.kind));else if(l.next_on)c.append(e('small','Próximo contato: '+dateLabel(l.next_on)));
    if(l.notes)c.append(e('p',l.notes.length>140?l.notes.slice(0,140)+'…':l.notes,'crm-note'));
    const a=e('div',null,'crm-actions');const next=nextStage(l.stage);
    if(next)a.append(button(next==='comprou'?'Comprou ✓':'Avançar →',()=>save(l,{stage:next,last_contact_on:t}),'secondary'));
    const wa=whatsappLink(l.phone);if(wa){const link=e('a','WhatsApp','crm-wa');link.href=wa;link.target='_blank';link.rel='noopener';a.append(link);}
    a.append(button('Editar',()=>{editing=l.id;redraw();},'text-button'));c.append(a);col.append(c);}
   if(!items.length)col.append(e('p','—','muted'));columns.append(col);}
  box.append(columns);
 }
 async function save(lead,changes){try{await api.crmLeadSave({p_id:lead?.id??null,p_version:lead?.version??null,p_data:{...(lead??{}),...changes}});editing=null;await refreshLeads();notice(lead?'Lead atualizado.':'Lead cadastrado.');}catch(err){notice(err.message,'error');throw err;}}
 function editor(l){const f=e('form',null,'panel form-grid crm-editor'),t=today();f.append(e('h3',l?'Editar lead':'Novo lead'));
  const name=input(f,'Nome','text',l?.name),phone=input(f,'WhatsApp (com DDD)','tel',l?.phone),origin=select(f,'Origem',ORIGINS.map(pair),l?.origin??'Instagram direct'),interest=select(f,'Interesse',INTERESTS.map(pair),l?.interest??'A definir');
  const stage=select(f,'Etapa',STAGES,l?.stage??'novo'),resp=select(f,'Responsável',RESPONSIBLES.map(pair),l?.responsible??'Leandro'),next=input(f,'Próximo contato','date',l?.next_on??''),last=input(f,'Último contato','date',l?.last_contact_on??t);
  const student=select(f,'Aluna cadastrada (quando comprar)',[['','—'],...db().students.filter(s=>!s.archived).map(s=>[s.id,s.name])],l?.student_id??''),lost=input(f,'Motivo da perda','text',l?.lost_reason),notes=input(f,'Observações','textarea',l?.notes);
  name.required=true;phone.inputMode='tel';const msg=e('p'),submit=e('button','Salvar','primary');submit.type='submit';
  f.append(submit,button('Cancelar',()=>{editing=null;redraw();}));
  if(l)f.append(button('Arquivar',async()=>{if(!confirm('Arquivar este lead? Ele sai do funil, mas o histórico fica guardado.'))return;try{await api.crmLeadArchive({p_id:l.id,p_version:l.version});editing=null;await refreshLeads();}catch(err){msg.textContent=err.message;}},'text-button'));
  f.append(msg);
  f.addEventListener('submit',async ev=>{ev.preventDefault();if(!name.reportValidity())return;submit.disabled=true;submit.textContent='Salvando…';
   try{await save(l,{name:name.value.trim(),phone:phone.value,origin:origin.value,interest:interest.value,stage:stage.value,responsible:resp.value,next_on:next.value,last_contact_on:last.value,student_id:student.value,lost_reason:lost.value,notes:notes.value});}
   catch(err){msg.textContent=err.message;submit.disabled=false;submit.textContent='Salvar';}});
  return f;}
 return {mount,clear};
}
