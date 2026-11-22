import {perfilParcial,alternarAlimento,topicosParciais} from './perfil-parcial.mjs';
import {parcialCopy} from './parcial-textos.mjs';
import {photoChallenge,sendPublicPhotos,publicPhotosEnabled} from './public-photos.mjs';
import {avaliar,faixasAdulto,parseMeasure,objetivos} from './calculos.mjs';

const $=selector=>document.querySelector(selector);
const form=$('#form'), step=$('#step'), result=$('#result'), feedback=$('#feedback'), back=$('#back'), next=$('#next');
const progress=$('#progress'), progressLabel=$('#progress-label');
const publicEnabled=publicPhotosEnabled(window.DIVAFIT_PUBLIC_BODY);
const choices=(values)=>values.map(([value,label])=>[String(value),label,'activity']);
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
  ['doces','Doces quase todo dia'],['ultraprocessados','Ultraprocessados quase todo dia (biscoito, salgadinho, fast food, embutidos)'],
  ['bebidas','Refrigerante ou suco adoçado'],['alcool','Bebida alcoólica'],
  ['beliscos','Pulo refeições ou belisco o dia todo']])},
 {key:'cintura',label:'Medida da cintura',placeholder:'Ex.: 82',unit:'cm',min:40,max:250},
 {key:'fotos',label:'Quer incluir fotos?'}
];
const total=fields.length+3, answers={}, photoFiles=new Map();
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
    group.setAttribute('role','group');group.setAttribute('aria-label',spec.label);
    for(const [value,label,symbol] of spec.choices){
      const item=el('label',undefined,'choice'), input=el('input');
      input.type=spec.multiple?'checkbox':'radio';input.name=spec.key;input.value=value;
      input.checked=spec.multiple?(answers[spec.key]??[]).includes(value):String(answers[spec.key])===value;
      if(spec.multiple)input.addEventListener('change',()=>{
        answers[spec.key]=alternarAlimento(answers[spec.key]??[],value);
        for(const control of group.querySelectorAll('input'))control.checked=answers[spec.key].includes(control.value);
      });
      item.append(input,icon(symbol),el('span',label));group.append(item);
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
function partialContent(r){
  const profile=perfilParcial(answers), wrap=el('div',undefined,'result-layout partial');
  const core=el('div',undefined,'panel gauge-core');
  core.append(el('h2','IMC','imc-title'),el('p','índice de massa corporal','imc-subtitle'),gauge(r),el('strong',format(r.imc,1)),el('span',r.categoria,'badge'));
  const cards=el('div',undefined,'metrics');
  for(const [label,value,alerta] of [
    ['Risco à saúde · IMC × cintura',r.risco,r.risco==='Risco elevado'],
    ['Nível de condicionamento',profile.minutos+' min/semana ('+profile.condicionamento+')',profile.minutos<150],
    ['Sono',answers.sono+' h ('+profile.qualidadeSono+')',answers.sono<7],
    ['Alimentação',profile.nota+'/10 ('+profile.qualidadeAlimentacao+')',profile.nota<8]
  ]){
    const card=metric(label,value);if(alerta)card.classList.add('metric-alert');cards.append(card);
  }
  wrap.append(core,cards);
  for(const [name,paragraphs] of topicosParciais(answers,r,parcialCopy)){
    const topic=el('section',undefined,'panel reading');
    topic.append(el('h3',name),...paragraphs.map(text=>el('p',text)));
    wrap.append(topic);
  }
  return wrap;
}

function show(r){
  form.hidden=true;result.hidden=false;
  setProgress(fields.length-1);
  const heading=title('SUA AVALIAÇÃO PARCIAL');
  heading.classList.add('partial-title');
  const content=partialContent(r);
  content.prepend(heading);
  content.append(el('p',parcialCopy.imc),btn('Sim, quero saber minha composição',()=>render(),'primary'),
    btn('Não, só isso está bom',()=>{photoAgreementAt=null;photoFiles.clear();contact(r);}),
    btn('Rever respostas',()=>{current=0;render();}));
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
  const submit=el('button','Ver minha avaliação','primary');submit.type='submit';
  const status=el('p','','hint');status.setAttribute('role','status');
  let challenge='';
  if(publicEnabled){
    const widget=el('div');
    box.append(widget);
    submit.textContent='Enviar';
    if(window.DIVAFIT_PUBLIC_BODY.sitekey==='1x00000000000000000000AA')
      status.textContent='Modo de teste. Use apenas imagens fictícias. A análise exige um passe temporário.';
    if(!status.textContent)status.textContent='Carregando a verificação de segurança…';
    photoChallenge(widget,(token,message)=>{
      challenge=token;
      status.textContent=token?'Verificação concluída. Você já pode continuar.':message;
    }).catch(()=>{status.textContent='Não foi possível carregar a verificação. Volte e tente novamente ou veja o resumo.';});

  }
  submit.textContent='Enviar';
  if(!photoAgreementAt)box.prepend(btn('Baixar avaliação parcial',()=>baixarParcial(r)));
  box.append(status,submit,btn('Voltar',()=>photoAgreementAt?render():show(r),'secondary'),
    el('p',publicEnabled?'O e-mail e o WhatsApp são usados para limitar a análise a uma por contato.':'Os contatos ficam nesta tela de teste.','hint'));
  shell.append(shadow,box);result.replaceChildren(heading,shell);
  window.scrollTo(0,0);heading.focus({preventScroll:true});
  box.addEventListener('submit',async ev=>{
    ev.preventDefault();
    const name=box.elements.nomeCompleto, phone=box.elements.whatsapp;
    Object.assign(contactValues,{nomeCompleto:name.value.trim(),whatsapp:phone.value.trim(),email:box.elements.email.value.trim()});
    if(name.value.trim().split(/\s+/).length<2){name.setCustomValidity('Informe seu nome e sobrenome.');name.reportValidity();return;}
    if(!/^\+?[0-9(). -]+$/.test(phone.value)||!(/^(?:55)?[1-9]\d9\d{8}$/.test(phone.value.replace(/\D/g,'')))){
      phone.setCustomValidity('Informe um celular brasileiro com DDD.');phone.reportValidity();return;
    }
    if(!publicEnabled){if(!photoAgreementAt)baixarParcial(r);complete(r);return;}
    if(submit.disabled)return;
    if(!challenge){
      if(!status.textContent||status.textContent.startsWith('Carregando'))
        status.textContent='Aguarde a verificação de segurança. Se ela não aparecer, volte e tente novamente.';
      return;
    }
    for(const control of box.elements)control.disabled=true;
    status.textContent=photoAgreementAt?'Analisando as fotos. Isso pode levar alguns instantes.':'Enviando a avaliação inicial.';
    try{
      const response=await sendPublicPhotos(window.DIVAFIT_PUBLIC_BODY,answers,photoFiles,{
        nome:name.value.trim(),email:box.elements.email.value,whatsapp:phone.value
      },challenge);
      if(!photoAgreementAt)baixarParcial(r);
      complete(r,answers,{emailSent:response.email_enviado===true,awaitingApproval:response.aguardando_aprovacao===true});
    }catch(error){
      complete(r,answers,{error:error.message});
    }
  });
}
function baixarParcial(r){
  const bloco=partialContent(r);
  const linhas=[answers.nome,...[...bloco.querySelectorAll('h3,strong,.badge,p')].map(node=>node.textContent)];
  const escape=value=>String(value).replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[char]);
  const rows=linhas.flatMap(line=>line.match(/.{1,65}(?:\s|$)|\S+/g)??[]).map(line=>line.trim()).filter(Boolean);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="520" height="${110+rows.length*24}"><rect width="100%" height="100%" fill="#fff8f3"/><text x="24" y="42" style="font:bold 22px sans-serif;fill:#a23822">SUA AVALIAÇÃO PARCIAL</text>${rows.map((line,i)=>`<text x="24" y="${82+i*24}" style="font:14px sans-serif;fill:#29201d">${escape(line)}</text>`).join('')}</svg>`;
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  const link=el('a');link.href=url;link.download='avaliacao-parcial.svg';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}

function complete(r,dados=answers,analysis={}){
  setProgress(total,'Etapa '+total+' de '+total+' · Concluída');
  const nome=contactValues.nomeCompleto||dados.nome||'';
  const heading=title('Obrigado');
  const content=el('div',undefined,'result-layout reveal'), summary=el('dl',undefined,'panel summary');
  for(const [label,value] of [
    ['Nome',nome],['Sexo',dados.sexo==='F'?'Feminino':'Masculino'],['Idade',dados.idade+' anos'],
    ['Altura',format(dados.altura,2)+' m'],['Peso',format(dados.peso,1)+' kg'],
    ['Treinos por semana',dados.treinos],['Objetivo principal',dados.objetivo],
    ['Cintura',dados.cintura===null?'Não informada':format(dados.cintura,1)+' cm'],
    ['IMC',format(r.imc,1)+' · '+r.categoria],['IMC × cintura',r.risco],
    ['E-mail',contactValues.email],['WhatsApp',contactValues.whatsapp],
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
