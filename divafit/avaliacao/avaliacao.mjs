import {svgToPdf} from './download-pdf.mjs';
import {perfilParcial,alternarAlimento,topicosParciais,alimentosFavoraveis} from './perfil-parcial.mjs';
import {parcialCopy} from './parcial-textos.mjs';
import {photoChallenge,sendPublicPhotos,publicPhotosEnabled} from './public-photos.mjs';
import {avaliar,faixasAdulto,parseMeasure,objetivos} from './calculos.mjs';

const $=selector=>document.querySelector(selector);
const form=$('#form'), step=$('#step'), result=$('#result'), feedback=$('#feedback'), back=$('#back'), next=$('#next');
const progress=$('#progress'), progressLabel=$('#progress-label');
const publicEnabled=publicPhotosEnabled(window.DIVAFIT_PUBLIC_BODY);
const choices=(values)=>values.map(([value,label])=>[String(value),label,'activity']);
const choiceEmoji={
  objetivo:Object.fromEntries(objetivos.map((label,i)=>[label,['⚖️','🎯','💪'][i]])),
  modalidade:{musculacao:'🏋️',intenso:'🔥',corrida:'🏃',caminhada:'🚶',esportes:'⚽',outro:'✨',nenhum:'⏸️'},
  tempoSentada:{0:'🪑',6:'🪑',8:'🪑',10:'🪑',12:'🪑',emPe:'🧍'},
  sono:{4:'🥱',5:'😴',6:'😐',7:'🙂',8:'😄'}
};
const fields=[
 {key:'nome',label:'Qual é o seu primeiro nome?',placeholder:'Seu nome'},
 {key:'sexo',label:'Sexo biológico:',choices:[['F','Feminino','person'],['M','Masculino','person']]},
 {key:'idade',label:'Idade',placeholder:'Ex.: 35',unit:'anos',min:18,max:120,integer:true},
 {key:'altura',label:'Altura',placeholder:'Ex.: 1,65',unit:'m',min:1,max:2.5},
 {key:'peso',label:'Peso',placeholder:'Ex.: 68,5',unit:'kg',min:25,max:350},
 {key:'objetivo',label:'Qual é o seu objetivo principal?',choices:choices(objetivos.map(label=>[label,label]))},
 {key:'modalidade',label:'O que você treina hoje?',choices:choices([
  ['musculacao','Musculação'],['intenso','CrossFit / funcional / HIIT'],['corrida','Corrida'],['caminhada','Caminhada'],
  ['esportes','Lutas, dança ou esportes'],['outro','Outro'],['nenhum','Nada']])},
 {key:'treinos',label:'Quantas vezes por semana você treina?',choices:choices(Array.from({length:8},(_,i)=>[i,String(i)]))},
 {key:'tempoSentada',label:'Quantas horas por dia você passa sentada?',choices:choices([[0,'Até 6 h'],[6,'6 a 8 h'],[8,'8 a 10 h'],[10,'10 a 12 h'],[12,'Mais de 12 h'],['emPe','Fico em pé a maior parte do dia']])},
 {key:'sono',label:'Por volta de quantas horas de sono de qualidade você tem por noite?',choices:choices([[4,'4 ou menos'],[5,'5'],[6,'6'],[7,'7'],[8,'8 ou mais']])},
 {key:'alimentacao',label:'O que faz parte da sua alimentação na maioria dos dias?',multiple:true,choices:choices([
  ['frutas','Frutas'],['verduras','Verduras (ex: alface)'],
  ['legumes','Legumes (ex: cenoura)'],['proteina','Proteína em todas as refeições'],
  ['carbo','Carboidrato na medida'],['gordura','Gordura na medida'],['agua','2 litros de água ou mais'],
  ['refeicoes','3 a 5 refeições por dia'],['carboExcesso','Carboidrato em excesso'],['gorduraExcesso','Gordura em excesso'],
  ['doces','Doces quase todo dia'],['ultraprocessados','Alimentos industrializados (ex: salsicha)'],
  ['bebidas','Refrigerante ou bebidas adoçadas'],['alcool','Bebida alcoólica'],
  ['puloRefeicoes','Pulo refeições'],['beliscos','Belisco o dia todo']])},
 {key:'cintura',label:'Medida da cintura',placeholder:'Ex.: 82',unit:'cm',min:40,max:250},
 {key:'fotos',label:'Quer incluir fotos?'}
];
const thanksEnabled=window.DIVAFIT_PUBLIC_BODY?.thanksPreview===true;
const total=fields.length+(thanksEnabled?4:3), answers={}, photoFiles=new Map();
let current=0, photoAgreementAt=null;
progress.max=total;
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
function icon(kind){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','icon');
  const path=document.createElementNS(svg.namespaceURI,'path');
  const shapes={person:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M16 8a4 4 0 1 1-8 0a4 4 0 0 1 8 0',activity:'M3 12h4l3-7 4 14 3-7h4',camera:'M3 7h4l2-3h6l2 3h4v13H3z M16 13a4 4 0 1 1-8 0a4 4 0 0 1 8 0'};
  path.setAttribute('d',shapes[kind]);svg.append(path);return svg;
}
function btn(text,action,style='secondary'){
  const b=el('button',text,style);b.type='button';b.addEventListener('click',action);return b;
}
function title(text){
  const h=el('h2',text,'question');h.tabIndex=-1;return h;
}
function setProgress(completed,label){
  progress.value=completed;
  progressLabel.textContent=label??`Etapa ${completed+1} de ${total}`;
}
function textField(key,label,placeholder,type='text',unit){
  const wrap=el('label',undefined,'input-slot');
  const control=el('input',undefined,'entry');
  control.name=key;control.type=type;control.placeholder=placeholder;control.required=true;
  wrap.append(el('span',label,'sr-only'),control);
  if(unit)wrap.append(el('span',unit));
  return {wrap,control};
}
function render(){
  setProgress(current+(fields[current].key==='fotos'?1:0));
  result.hidden=true;form.hidden=false;
  const spec=fields[current];
  const heading=title(spec.label);
  step.classList.remove('stage');step.replaceChildren(heading);requestAnimationFrame(()=>step.classList.add('stage'));
  feedback.textContent='';
  back.hidden=current===0;
  next.hidden=false;
  next.textContent=spec.key==='fotos'?'Continuar sem fotos':'Continuar';
  heading.focus({preventScroll:true});
  if(spec.key==='fotos'){
    step.append(el('p','Inclua frente, lado e costas, com o corpo inteiro e boa iluminação.','hint'));
    if(publicEnabled)step.append(el('p','Ao enviar as fotos, você solicita seu processamento pela Anthropic para estimar a composição corporal.','hint'));
    const photos=el('div',undefined,'photos');
    for(const angle of ['Frente','Lado','Costas']){
      const pick=el('label',undefined,'pick-file'), file=el('input'), label=el('span',angle,'file-text');
      file.type='file';file.accept='image/jpeg,image/png,image/webp';file.setAttribute('aria-label','Foto de '+angle.toLowerCase());
      const previous=photoFiles.get(angle);
      if(previous)label.textContent=angle+' · Foto selecionada';
      file.addEventListener('change',()=>{
        const chosen=file.files[0];
        if(chosen)photoFiles.set(angle,chosen);else photoFiles.delete(angle);
        label.textContent=chosen?angle+' · Foto selecionada':angle;
        next.hidden=!photoFiles.size;
        next.textContent=photoFiles.size?'Usar fotos na avaliação':'Continuar sem fotos';
        feedback.textContent='';
      });
      pick.append(file,icon('camera'),label);photos.append(pick);
    }
    next.hidden=!photoFiles.size;
    if(photoFiles.size)next.textContent='Usar fotos na avaliação';
    step.append(photos,btn('Continuar sem fotos',()=>{photoFiles.clear();photoAgreementAt=null;contact(avaliar(answers));},'subtle'),
      el('p','🔒 Seus dados estão protegidos pela Lei Geral de Proteção de Dados (LGPD): Lei n. 13.709, de 14 de agosto de 2018. Nada será publicado sem sua autorização.','notice'));
    return;
  }
  if(spec.choices){
    const group=el('div',undefined,spec.key==='objetivo'?'choices goal':spec.key==='sexo'?'choices sex':'choices');
    group.classList.add(spec.key==='treinos'?'choices-count':'choices-wide');
    const sections=spec.multiple?['Pontos positivos','Pontos negativos'].map(name=>{
      const section=el('section',undefined,'food-section');
      const heading=el('h3',name), grid=el('div',undefined,'choices choices-wide');
      section.append(heading,grid);group.append(section);return grid;
    }):null;
    if(sections){group.classList.remove('choices');group.classList.add('food-groups');}
    group.setAttribute('role','group');group.setAttribute('aria-label',spec.label);
    const wideFood=['carboExcesso','gorduraExcesso','ultraprocessados'];
    const options=sections?[...spec.choices].sort(([a],[b])=>Number(wideFood.includes(b))-Number(wideFood.includes(a))):spec.choices;
    for(const [value,label,symbol] of options){
      const item=el('label',undefined,'choice'), input=el('input');
      input.type=spec.multiple?'checkbox':'radio';input.name=spec.key;input.value=value;
      input.checked=spec.multiple?(answers[spec.key]??[]).includes(value):String(answers[spec.key])===value;
      if(spec.multiple)input.addEventListener('change',()=>{
        answers[spec.key]=alternarAlimento(answers[spec.key]??[],value);
        for(const control of group.querySelectorAll('input'))control.checked=answers[spec.key].includes(control.value);
      });
      const foodIcons={frutas:'🍎',verduras:'🥬',legumes:'🥕',proteina:'🥚',carbo:'🍚',gordura:'🥑',agua:'💧',refeicoes:'🍽️',
        carboExcesso:'🍞',gorduraExcesso:'🍟',doces:'🍬',ultraprocessados:'🍔',bebidas:'🥤',alcool:'🍺',beliscos:'⏱️',puloRefeicoes:'🍽️'};
      const emoji=sections?foodIcons[value]:choiceEmoji[spec.key]?.[value];
      const visual=emoji?el('span',emoji,'food-icon'):icon(symbol);
      visual.setAttribute('aria-hidden','true');
      if(wideFood.includes(value))item.classList.add('food-wide');
      item.append(input,visual,el('span',label));
      (sections?sections[alimentosFavoraveis.includes(value)?0:1]:group).append(item);
    }
    step.append(group);return;
  }
  const {wrap,control}=textField(spec.key,spec.label,spec.placeholder,'text',spec.unit);
  control.value=answers[spec.key]===null||answers[spec.key]===undefined?'':String(answers[spec.key]).replace('.',',');
  control.maxLength=spec.min?7:60;
  if(spec.min)control.inputMode=spec.integer?'numeric':'decimal';
  else control.autocomplete='given-name';
  step.append(wrap);
  if(spec.key==='cintura'){
    step.append(el('p','Passe um barbante na altura do umbigo, marque com caneta e meça com régua ou trena.','hint'),
      btn('Não consigo medir',()=>{answers.cintura=null;current++;show(avaliar(answers));},'subtle'));
  }
}
const palette=['#39769d','#327c57','#e57446','#cf5037','#ab333e','#722d4b'];
function gauge(r){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 220 112');svg.setAttribute('class','gauge');
  svg.setAttribute('role','img');svg.setAttribute('aria-label','Velocímetro do IMC');
  const point=theta=>[110-88*Math.cos(theta),105-88*Math.sin(theta)];
  for(let i=0;i<6;i++){
    const [x,y]=point(i*Math.PI/6+.027),[a,b]=point((i+1)*Math.PI/6-.027);
    const path=document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('d',`M ${x} ${y} A 88 88 0 0 1 ${a} ${b}`);path.setAttribute('stroke',palette[i]);svg.append(path);
  }
  const [low,high]=[[12,18.5],[18.5,25],[25,30],[30,35],[35,40],[40,50]][r.faixa];
  const within=Math.max(.05,Math.min(.95,(r.imc-low)/(high-low)));
  const theta=(r.faixa+within)*Math.PI/6;
  const needle=document.createElementNS(svg.namespaceURI,'line');
  needle.classList.add('needle');needle.style.setProperty('--start',(-theta*180/Math.PI)+'deg');
  for(const [k,v] of Object.entries({x1:110,y1:105,x2:110-67*Math.cos(theta),y2:105-67*Math.sin(theta)}))needle.setAttribute(k,String(v));
  const hub=document.createElementNS(svg.namespaceURI,'circle');hub.setAttribute('cx','110');hub.setAttribute('cy','105');hub.setAttribute('r','5');
  svg.append(needle,hub);return svg;
}
const format=(value,digits)=>new Intl.NumberFormat('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
function metric(label,value){
  const node=el('article',undefined,'metric');node.append(el('h3',label),el('strong',value));return node;
}
const riscoCurto=risco=>({'Baixo risco':'Baixo','Risco moderado':'Moderado','Risco elevado':'Elevado'})[risco]??risco;
function resultIndicators(r,dados){
  const p=perfilParcial(dados);
  const tone=(name,good,attention)=>name===good?'good':name===attention?'attention':'alert';
  const risco=riscoCurto(r.risco);
  return [
    ['Risco à saúde','IMC × cintura',risco,['Baixo','Moderado','Elevado'].includes(risco)?tone(risco,'Baixo','Moderado'):'neutral',''],
    ['Nível de condicionamento','Atividade semanal',p.condicionamento,p.minutos>=150?'good':p.condicionamento==='Sedentária'?'alert':'attention',p.minutos+' min/semana'],
    ['Sono','Qualidade',p.qualidadeSono,tone(p.qualidadeSono,'Adequado','Atenção'),dados.sono+' h'],
    ['Alimentação','Nutrição',p.qualidadeAlimentacao,tone(p.qualidadeAlimentacao,'Boa','Regular'),p.nota+'/10']
  ];
}
function partialContent(r){
  const wrap=el('div',undefined,'result-layout partial');
  const core=el('div',undefined,'panel gauge-core');
  const legend=el('div',undefined,'gauge-labels');
  faixasAdulto.forEach((label,i)=>{
    const item=el('span',label,i===r.faixa?'active':'');
    item.style.setProperty('--segment',palette[i]);if(i===r.faixa)item.setAttribute('aria-current','true');
    legend.append(item);
  });
  core.append(el('h2','IMC','imc-title'),el('p','índice de massa corporal','imc-subtitle'),gauge(r),
    el('strong',format(r.imc,1)),el('span',r.categoria,'imc-result'),legend);
  const cards=el('div',undefined,'metrics');
  const indicators=resultIndicators(r,answers);
  for(const [label,subtitle,value,status,detail] of indicators){
    const card=el('article',undefined,'metric indicator indicator-'+status);
    card.append(el('h3',label),el('small',subtitle),el('strong',value));
    if(detail)card.append(el('small',detail));
    cards.append(card);
  }
  const statusLegend=el('div',undefined,'status-legend');
  for(const [key,label] of [['good','Excelente'],['attention','Regular'],['alert','Ruim']]){
    const entry=el('span',undefined,'legend-entry');
    entry.append(el('i',undefined,'dot-'+key),document.createTextNode(label));
    statusLegend.append(entry);
  }
  wrap.append(core,cards,statusLegend);
  topicosParciais(answers,r,parcialCopy).forEach(([name,paragraphs],i)=>{
    const topic=el('section',undefined,'panel reading indicator-'+indicators[i][3]);
    topic.append(el('h3',name),...paragraphs.map(text=>el('p',text)));
    wrap.append(topic);
  });
  return wrap;
}

function show(r){
  form.hidden=true;result.hidden=false;
  setProgress(fields.length-1);
  const heading=title();
  heading.append(el('span',answers.nome.toLocaleUpperCase('pt-BR'),'partial-name'),el('span',', SUA AVALIAÇÃO PARCIAL'));
  heading.classList.add('partial-title');
  const content=partialContent(r);
  content.prepend(heading);
  const callout=el('p',undefined,'imc-callout');
  callout.append(el('strong','IMC NÃO DIFERENCIA GORDURA DE MÚSCULO.'),el('span','Quer conhecer sua composição corporal?'));
  const actions=el('div',undefined,'partial-actions');
  actions.append(callout,btn('Sim, quero saber minha composição',()=>render(),'primary'),
    btn('Não, só isso está bom',()=>{photoAgreementAt=null;photoFiles.clear();contact(r);}),
    btn('Rever respostas',()=>{current=0;render();}));
  content.append(actions);
  result.replaceChildren(content);window.scrollTo(0,0);heading.focus({preventScroll:true});
}
const contactValues={};
function contact(r){
  form.hidden=true;result.hidden=false;
  setProgress(fields.length+1);
  const heading=title(photoAgreementAt?'Receba sua avaliação completa por e-mail':'SUA AVALIAÇÃO PARCIAL');
  const shell=el('div',undefined,'lead-shell reveal'), shadow=el('div',undefined,'lead-shadow metrics');
  shadow.setAttribute('aria-hidden','true');
  shadow.append(metric('Composição corporal','— %'),
    metric('Faixa de gordura','— a —'),metric('Indicador IMC × cintura',r.risco));
  const box=el('form',undefined,'lead-form');
  for(const [key,label,example,type,auto] of [
    ['nomeCompleto','Nome completo','Seu nome e sobrenome','text','name'],
    ['whatsapp','Celular com WhatsApp','(62) 90000-0000','tel','tel-national'],
    ['email','E-mail','nome@exemplo.com','email','email']
  ]){
    const {control}=textField(key,label,example,type);
    const field=el('label',undefined,'contact-field');
    control.value=contactValues[key]??(key==='nomeCompleto'?answers.nome:'');
    control.autocomplete=auto;control.maxLength=type==='tel'?23:120;
    control.addEventListener('input',()=>{contactValues[key]=control.value;control.setCustomValidity('');});
    field.append(el('span',label));
    const frame=el('span',undefined,'input-slot');
    frame.append(control);field.append(frame);box.append(field);
  }
  const submit=el('button','Enviar','primary');submit.type='button';
  const status=el('p','','hint');status.setAttribute('role','status');
  let challenge='';
  const widget=el('div',undefined,'security-widget');
  if(publicEnabled){

    if(window.DIVAFIT_PUBLIC_BODY.sitekey==='1x00000000000000000000AA')
      status.textContent='Modo de teste. Use apenas imagens fictícias. A análise exige um passe temporário.';
    if(!status.textContent)status.textContent='Carregando a verificação de segurança…';
    photoChallenge(widget,(token,message)=>{
      if(!widget.isConnected)return;
      challenge=token;
      status.textContent=token?'Verificação concluída. Você já pode continuar.':message;
    }).catch(()=>{status.textContent='Não foi possível carregar a verificação. Volte e tente novamente ou veja o resumo.';});

  }
  const previous=btn('Voltar',event=>{
    if(event.isTrusted&&!previous.disabled)photoAgreementAt?render():show(r);
  },'secondary');
  box.append(
    el('p',publicEnabled?'O e-mail e o WhatsApp são usados para limitar a análise a uma por contato.':'Os contatos ficam nesta tela de teste.','hint'));
  const controls=el('div',undefined,'lead-form contact-controls');
  controls.append(widget,status,submit,previous);
  shell.append(shadow,box,controls);result.replaceChildren(heading,shell);
  window.scrollTo(0,0);heading.focus({preventScroll:true});
  box.addEventListener('submit',event=>event.preventDefault());
  submit.addEventListener('click',async event=>{
    if(!event.isTrusted||submit.disabled||!box.reportValidity())return;
    const name=box.elements.nomeCompleto, phone=box.elements.whatsapp;
    Object.assign(contactValues,{nomeCompleto:name.value.trim(),whatsapp:phone.value.trim(),email:box.elements.email.value.trim()});
    if(name.value.trim().split(/\s+/).length<2){name.setCustomValidity('Informe seu nome e sobrenome.');name.reportValidity();return;}
    if(!/^\+?[0-9(). -]+$/.test(phone.value)||!(/^(?:55)?[1-9]\d9\d{8}$/.test(phone.value.replace(/\D/g,'')))){
      phone.setCustomValidity('Informe um celular brasileiro com DDD.');phone.reportValidity();return;
    }
    if(!publicEnabled){complete(r);return;}
    if(submit.disabled)return;
    if(!challenge){
      if(!status.textContent||status.textContent.startsWith('Carregando'))
        status.textContent='Aguarde a verificação de segurança. Se ela não aparecer, volte e tente novamente.';
      return;
    }
    for(const control of box.elements)control.disabled=true;
    previous.disabled=true;
    submit.disabled=true;
    if(thanksEnabled)setProgress(fields.length+2);
    const loading=el('div',undefined,'assessment-loading');
    loading.setAttribute('role','status');
    loading.append(el('span',undefined,'assessment-spinner'),
      el('strong',photoAgreementAt?'Analisando suas fotos…':'Enviando sua avaliação…'));
    controls.replaceChildren(loading);
    try{
      const response=await sendPublicPhotos(window.DIVAFIT_PUBLIC_BODY,answers,photoFiles,{
        nome:name.value.trim(),email:box.elements.email.value,whatsapp:phone.value
      },challenge);
      complete(r,answers,{emailSent:response.email_enviado===true,awaitingApproval:response.aguardando_aprovacao===true});
    }catch(error){
      complete(r,answers,{error:error.message});
    }
  });
}
async function baixarParcial(r){
  const escape=value=>String(value).replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[char]);
  const colors={good:palette[1],attention:palette[2],alert:palette[5],neutral:'#ded0c8'};
  const text=(x,y,content,size=14,color='#29201d',bold=false)=>
    `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-weight="${bold?'700':'400'}">${escape(content)}</text>`;
  const panel=(x,y,w,h,border)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#fff" stroke="${border}" stroke-width="2"/>`;
  const meter=gauge(r);
  meter.setAttribute('x','194');meter.setAttribute('y','114');meter.setAttribute('width','212');meter.setAttribute('height','108');
  for(const path of meter.querySelectorAll('path')){path.setAttribute('fill','none');path.setAttribute('stroke-width','10');}
  meter.querySelector('line').setAttribute('stroke','#30211d');meter.querySelector('line').setAttribute('stroke-width','3');
  const indicators=resultIndicators(r,answers);
  let y=535;
  const topics=topicosParciais(answers,r,parcialCopy,Infinity).map(([title,paragraphs],i)=>{
    const lines=paragraphs.flatMap(p=>p.match(/.{1,69}(?:\s|$)|\S+/g)??[]).map(line=>line.trim()).filter(Boolean);
    const height=65+lines.length*21;
    const block=panel(25,y,550,height,colors[indicators[i][3]])+text(44,y+31,title,18,'#a23822',true)+
      lines.map((line,j)=>text(44,y+58+j*21,line)).join('');
    y+=height+12;return block;
  }).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${y+16}" font-family="Arial,sans-serif">
    <rect width="100%" height="100%" fill="#fff7f2"/>
    ${text(25,32,'Le&LeoFit',16,'#a23822',true)}${text(25,68,'SUA AVALIAÇÃO PARCIAL',24,'#29201d',true)}
    ${text(25,96,answers.nome,16)}
    ${meter.outerHTML}
    <g text-anchor="middle">${text(300,246,'IMC '+format(r.imc,1),22,'#a23822',true)}${text(300,270,r.categoria,16)}</g>
    ${faixasAdulto.map((label,i)=>`<g text-anchor="middle"><rect x="${25+i*92}" y="290" width="88" height="4" rx="2" fill="${palette[i]}"/>${text(69+i*92,314,label,11,palette[i],i===r.faixa)}</g>`).join('')}
    ${indicators.map(([label,subtitle,value,status,detail],i)=>{
      const x=25+(i%2)*280,y=331+Math.floor(i/2)*88;
      return panel(x,y,270,78,colors[status])+text(x+12,y+20,label,13,'#29201d',true)+text(x+12,y+40,value.toLocaleUpperCase('pt-BR'),15,'#a23822',true)+text(x+12,y+61,detail||subtitle,12);
    }).join('')}
    ${[['good','Excelente'],['attention','Regular'],['alert','Ruim']].map(([status,label],i)=>
      `<circle cx="${163+i*108}" cy="517" r="4" fill="${colors[status]}"/>`+text(173+i*108,522,label,12)).join('')}
    ${topics}</svg>`;
  const url=URL.createObjectURL(await svgToPdf(svg,600,y+16));
  const link=el('a');link.href=url;link.download='avaliacao-parcial.pdf';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}

function complete(r,dados=answers,analysis={}){
  setProgress(total,'Etapa '+total+' de '+total+' · Concluída');
  if(thanksEnabled&&!analysis.error){
    const heading=title(`Obrigado, ${dados.nome}! 🧡`);
    const content=el('div',undefined,'panel result-layout reveal thanks-page');
    content.append(heading,el('p','Sua participação é muito importante para nós.'));
    if(analysis.emailSent){
      const message=el('p','📩 ');
      message.append(el('strong','Confere seu e-mail.'),' Lá tem um presente para você.');
      content.append(message,el('p','(Se não achar, olha na caixa de spam ou promoções.)'));
    }else if(publicEnabled){
      content.append(el('p','O envio do e-mail não foi confirmado.','notice'));
    }
    const instagram=el('a','Voltar para o Instagram @leeleofit','primary');
    instagram.href='https://instagram.com/leeleofit';
    content.append(instagram,el('p','Leandro e Leonardo · Le&LeoFit'));
    if(!photoAgreementAt)content.append(btn('Baixar avaliação parcial',()=>baixarParcial(r)));
    result.replaceChildren(content);
    window.scrollTo(0,0);
    heading.focus({preventScroll:true});
    return;
  }
  const nome=contactValues.nomeCompleto||dados.nome||'';
  const heading=title('Obrigado');
  const content=el('div',undefined,'result-layout reveal'), summary=el('dl',undefined,'panel summary');
  for(const [label,value] of [
    ['Nome',nome],['Sexo',dados.sexo==='F'?'Feminino':'Masculino'],['Idade',dados.idade+' anos'],
    ['Altura',format(dados.altura,2)+' m'],['Peso',format(dados.peso,1)+' kg'],
    ['Treinos por semana',dados.treinos],['Objetivo principal',dados.objetivo],
    ['Cintura',dados.cintura===null?'Não informada':format(dados.cintura,1)+' cm'],
    ['IMC',format(r.imc,1)+' · '+r.categoria],
    ...resultIndicators(r,dados).map(([label,,value,,detail])=>[label,detail?value+' · '+detail:value]),
    ['Fotos',photoAgreementAt?'Três fotos selecionadas':'Sem fotos']
  ]){
    if(value!==undefined&&value!=='')summary.append(el('dt',label),el('dd',String(value)));
  }
  content.append(heading,summary);
  if(analysis.emailSent){
    content.append(el('p',photoAgreementAt?'Parabéns! Sua avaliação mais aprofundada está no seu e-mail.':'Parabéns! O convite do Desafio Black foi enviado ao seu e-mail.','notice'));
  }else if(photoAgreementAt){
    content.append(el('p',analysis.error||(analysis.awaitingApproval?'O envio da avaliação aguarda aprovação.':'O envio da sua avaliação por e-mail não foi confirmado.'),'notice'));
    if(analysis.error)content.append(btn('← Rever fotos',()=>render()));
  }
  if(!photoAgreementAt){
    if(analysis.awaitingApproval)content.append(el('p','O convite por e-mail aguarda aprovação.','notice'));
    else if(analysis.error||analysis.emailSent===false)content.append(el('p',analysis.error||'O envio do e-mail não foi confirmado.','notice'));
    content.append(btn('Baixar avaliação parcial',()=>baixarParcial(r)));
  }
  result.replaceChildren(content);window.scrollTo(0,0);heading.focus({preventScroll:true});
}
back.addEventListener('click',()=>{if(fields[current].key==='fotos'){show(avaliar(answers));return;}if(current>0){current--;render();}});
form.addEventListener('submit',ev=>{
  ev.preventDefault();
  const spec=fields[current];
  if(spec.key==='fotos'){
    if(photoFiles.size!==0&&photoFiles.size!==3){feedback.textContent='Escolha os três ângulos ou continue sem fotos.';return;}
    photoAgreementAt=photoFiles.size===3?new Date().toISOString():null;
    contact(avaliar(answers));return;
  }
  const raw=new FormData(form).get(spec.key);
  if(spec.multiple){answers[spec.key]??=[];}else if(spec.choices){
    if(raw===null){feedback.textContent='Escolha uma opção para continuar.';return;}
    answers[spec.key]=['treinos','tempoSentada','sono'].includes(spec.key)&&raw!=='emPe'?Number(raw):raw;
  }else if(spec.min){
    const value=parseMeasure(raw);
    if(value===null||value<spec.min||value>spec.max||(spec.integer&&!Number.isInteger(value))){
      feedback.textContent=`Informe um valor entre ${spec.min} e ${spec.max} ${spec.unit}.`;return;
    }
    answers[spec.key]=value;
  }else{
    const value=String(raw??'').trim();
    if(!value){feedback.textContent='Informe seu primeiro nome.';return;}
    answers[spec.key]=value;
  }
  current++;if(fields[current].key==='fotos')show(avaliar(answers));else render();
});
if(new URLSearchParams(location.search).get('exemplo')==='1'){
  Object.assign(answers,{nome:'Marina',idade:35,sexo:'F',altura:1.65,peso:72,cintura:92,objetivo:objetivos[0],
    modalidade:'musculacao',treinos:3,tempoSentada:8,sono:6,alimentacao:['proteina','agua','doces']});
  current=fields.length-1;
  show(avaliar(answers));
}else render();
