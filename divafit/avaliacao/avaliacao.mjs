import {avaliar,faixasAdulto,parseMeasure} from './calculos.mjs';

const $=selector=>document.querySelector(selector);
const form=$('#form'), step=$('#step'), result=$('#result'), feedback=$('#feedback'), back=$('#back'), next=$('#next');
const progress=$('#progress'), progressLabel=$('#progress-label');
const aviso='Estimativa feita por IA e fórmulas, pode conter erros e não substitui avaliação presencial.';
const fields=[
 {key:'nome',label:'Qual é seu primeiro nome?',placeholder:'Seu nome'},
 {key:'sexo',label:'Qual é seu sexo biológico?',choices:[['F','Feminino','person'],['M','Masculino','person']]},
 {key:'idade',label:'Qual é sua idade?',placeholder:'Ex.: 35',unit:'anos',min:18,max:120,integer:true},
 {key:'altura',label:'Qual é sua altura?',placeholder:'Ex.: 1,65',unit:'m',min:1,max:2.5},
 {key:'peso',label:'Qual é seu peso?',placeholder:'Ex.: 68,5',unit:'kg',min:25,max:350},
 {key:'treinos',label:'Quantas vezes você treina por semana?',choices:Array.from({length:8},(_,i)=>[String(i),i===0?'Não treino':i===1?'1 vez':i+' vezes','activity'])},
 {key:'cintura',label:'Qual é a medida da sua cintura?',placeholder:'Ex.: 82',unit:'cm',min:40,max:250},
 {key:'fotos',label:'Quer incluir fotos?'}
];
const total=fields.length+2, answers={}, photoFiles=new Map();
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
  setProgress(current);
  result.hidden=true;form.hidden=false;
  const spec=fields[current];
  const heading=title(spec.label);
  step.classList.remove('stage');step.replaceChildren(heading);requestAnimationFrame(()=>step.classList.add('stage'));
  feedback.textContent='';
  back.hidden=current===0;
  next.textContent=spec.key==='fotos'?'Ver avaliação parcial':'Continuar';
  heading.focus({preventScroll:true});
  if(spec.key==='fotos'){
    step.append(el('p','Inclua frente, lado e costas, com o corpo inteiro e boa iluminação.','hint'));
    const photos=el('div',undefined,'photos');
    for(const angle of ['Frente','Lado','Costas']){
      const pick=el('label',undefined,'pick-file'), file=el('input'), label=el('span',angle,'file-text');
      file.type='file';file.accept='image/jpeg,image/png,image/webp';file.setAttribute('aria-label','Foto de '+angle.toLowerCase());
      const previous=photoFiles.get(angle);
      if(previous)label.textContent=angle+' · '+previous.name;
      file.addEventListener('change',()=>{
        const chosen=file.files[0];
        if(chosen)photoFiles.set(angle,chosen);else photoFiles.delete(angle);
        label.textContent=chosen?angle+' · '+chosen.name:angle;
        next.textContent=photoFiles.size?'Enviar fotos e ver avaliação':'Ver avaliação parcial';
        feedback.textContent='';
      });
      pick.append(file,icon('camera'),label);photos.append(pick);
    }
    if(photoFiles.size)next.textContent='Enviar fotos e ver avaliação';
    step.append(photos,btn('Continuar sem fotos',()=>{photoFiles.clear();photoAgreementAt=null;show(avaliar(answers));},'subtle'),
      el('p','LGPD · Ao enviar as fotos, você autoriza a Le&LeoFit a usá-las para estimar sua composição corporal com IA, com armazenamento privado e processamento pela Anthropic. Nesta prévia, use imagens fictícias. Nenhuma foto é transmitida.','notice'));
    return;
  }
  if(spec.choices){
    const group=el('div',undefined,spec.key==='sexo'?'choices sex':'choices');
    group.setAttribute('role','group');group.setAttribute('aria-label',spec.label);
    for(const [value,label,symbol] of spec.choices){
      const item=el('label',undefined,'choice'), input=el('input');
      input.type='radio';input.name=spec.key;input.value=value;input.checked=String(answers[spec.key])===value;
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
      btn('Não consigo medir',()=>{answers.cintura=null;current++;render();},'subtle'));
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
function show(r){
  form.hidden=true;result.hidden=false;
  setProgress(fields.length,`Avaliação parcial · ${fields.length} de ${total} etapas`);
  const heading=title('Sua avaliação parcial');
  const content=el('div',undefined,'result-layout reveal'), indicator=el('article',undefined,'risk');
  const tone=r.risco==='Baixo risco'?'safe':r.risco==='Risco moderado'?'mid':'';
  indicator.append(el('h3','Indicador principal · IMC × cintura'),el('strong',r.risco),el('p','Este indicador cruza o IMC com a medida da cintura.','hint'));
  const panel=el('article',undefined,'panel'), core=el('div',undefined,'gauge-core'), legends=el('div',undefined,'gauge-labels');
  core.append(gauge(r),el('strong',format(r.imc,1)),el('span',r.categoria,'badge '+tone));
  faixasAdulto.forEach((name,i)=>{const item=el('span',name,i===r.faixa?'active':'');item.style.setProperty('--segment',palette[i]);legends.append(item);});
  panel.append(core,legends);
  if(answers.idade>=60)panel.append(el('p','O velocímetro usa a escala adulta. O selo aplica as faixas de 60 anos ou mais.','hint'));
  const metrics=el('div',undefined,'metrics');
  metrics.append(metric('IMC',format(r.imc,1)),metric('Cintura',answers.cintura===null?'Não informada':format(answers.cintura,1)+' cm'),
    metric('Cintura/altura',r.razao===null?'Indisponível':format(r.razao,2)),metric('Faixa de gordura',photoAgreementAt?'Aguardando análise':'Disponível com fotos'));
  content.append(heading,indicator,panel,metrics);
  if(answers.treinos>=5)content.append(el('p','Em pessoas com muita massa muscular o IMC pode indicar peso acima do real; por isso olhamos também a cintura e as fotos.','hint'));
  content.append(el('p',aviso,'hint'),btn('Desbloquear avaliação completa',()=>contact('email',r),'primary'));
  result.replaceChildren(content);window.scrollTo(0,0);heading.focus({preventScroll:true});
}
function contact(key,r){
  const isEmail=key==='email';
  setProgress(fields.length+(isEmail?0:1));
  const heading=title('Desbloqueie sua avaliação completa');
  const shell=el('div',undefined,'lead-shell reveal'), shadow=el('div',undefined,'lead-shadow metrics');
  shadow.setAttribute('aria-hidden','true');
  shadow.append(metric('Composição corporal','— %'),metric('Cintura/altura',r.razao===null?'—':format(r.razao,2)),
    metric('Faixa de gordura','— a —'),metric('Indicador IMC × cintura',r.risco));
  const box=el('form',undefined,'lead-form');
  const label=isEmail?'Qual é seu e-mail?':'Qual é seu WhatsApp com DDD?';
  const {wrap,control}=textField(key,label,isEmail?'nome@exemplo.com':'(62) 90000-0000',isEmail?'email':'tel');
  control.autocomplete=isEmail?'email':'tel-national';
  if(!isEmail){control.pattern='[0-9()+ .-]{10,22}';control.maxLength=22;}
  const submit=el('button','Continuar','primary');submit.type='submit';
  box.append(el('h3',label),wrap,submit,btn('← Voltar',()=>isEmail?show(r):contact('email',r),'secondary'),
    el('p','Prévia com dados fictícios. Os contatos não são enviados.','hint'));
  shell.append(shadow,box);result.replaceChildren(heading,shell);
  window.scrollTo(0,0);heading.focus({preventScroll:true});
  box.addEventListener('submit',ev=>{
    ev.preventDefault();
    if(isEmail){contact('whatsapp',r);return;}
    setProgress(total,'Preenchimento concluído');
    result.replaceChildren(el('div',undefined,'result-layout reveal'));
    result.firstChild.append(title('Consultoria Online'),el('p','Treino com acompanhamento personalizado.'),
      el('p','A avaliação por fotos e a integração com o CRM seguem em preparação nesta prévia.','hint'),
      btn('Conhecer o Desafio 21 dias',()=>location.assign('/desafio-21-dias/'),'primary'));
  });
}
back.addEventListener('click',()=>{if(current>0){current--;render();}});
form.addEventListener('submit',ev=>{
  ev.preventDefault();
  const spec=fields[current];
  if(spec.key==='fotos'){
    if(photoFiles.size!==0&&photoFiles.size!==3){feedback.textContent='Escolha os três ângulos ou continue sem fotos.';return;}
    photoAgreementAt=photoFiles.size===3?new Date().toISOString():null;
    show(avaliar(answers));return;
  }
  const raw=new FormData(form).get(spec.key);
  if(spec.choices){
    if(raw===null){feedback.textContent='Escolha uma opção para continuar.';return;}
    answers[spec.key]=spec.key==='treinos'?Number(raw):raw;
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
  current++;render();
});
render();
