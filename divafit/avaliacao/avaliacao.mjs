import {avaliar,faixasAdulto} from './calculos.mjs';
const $=selector=>document.querySelector(selector);
const form=$('#form'), step=$('#step'), result=$('#result'), feedback=$('#feedback'), back=$('#back');
const aviso='Estimativa feita por IA e fórmulas, pode conter erros e não substitui avaliação presencial.';
const fields=[
 ['nome','Qual é seu primeiro nome?','text'],
 ['sexo','Qual é seu sexo biológico?','select'],
 ['idade','Qual é sua idade?','number',18,120,1],
 ['altura','Qual é sua altura em centímetros?','number',100,250,0.1],
 ['peso','Qual é seu peso em quilos?','number',25,350,0.1],
 ['treinos','Quantas vezes você treina por semana?','number',0,7,1],
 ['cintura','Qual é a medida da sua cintura em centímetros?','number',40,250,0.1],
 ['fotos','Quer incluir fotos?','photos']
];
const answers={};
const totalSteps=fields.length+2;
const progress=$('#progress'), progressLabel=$('#progress-label');
progress.max=totalSteps;
function showProgress(n,done=false){
  progress.value=done?n:n-1;
  progressLabel.textContent=done?'Preenchimento concluído':`Etapa ${n} de ${totalSteps}`;
}

let current=0;
const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
function btn(text,action){const b=el('button',text);b.type='button';b.addEventListener('click',action);return b;}
function field(label,control){const l=el('label');l.append(el('span',label),control);return l;}
function render(){
  showProgress(current+1);
  step.replaceChildren();
  feedback.textContent='';
  back.hidden=current===0;
  const [name,label,type,min,max,increment]=fields[current];
  if(type==='photos'){
    step.append(el('h2',label),el('p','Fotos são opcionais. Em uso real, suas fotos seriam enviadas ao armazenamento privado e à Anthropic para estimar a composição corporal.'));
    const check=el('input');
    check.type='checkbox';check.name='consent';
    step.append(field(' Autorizo o uso das fotos para essa finalidade.',check),el('p','Nesta prévia, teste com arquivos fictícios. As fotos não são enviadas.'));
    for(const angle of ['Frente','Lado','Costas']){
      const file=el('input');file.type='file';file.accept='image/jpeg,image/png,image/webp';file.disabled=true;
      check.addEventListener('change',()=>{file.disabled=!check.checked;if(file.disabled)file.value='';});
      step.append(field(angle,file));
    }
    return;
  }
  let control;
  if(type==='select'){
    control=el('select');
    for(const [value,text] of [['','Selecione'],['F','Feminino'],['M','Masculino']]){
      const option=el('option',text);option.value=value;control.append(option);
    }
  }else{
    control=el('input');control.type=type;
    if(type==='number')Object.assign(control,{min,max,step:increment,inputMode:'decimal'});
    if(name==='nome')control.maxLength=60;
  }
  control.name=name;control.required=true;control.value=answers[name]??'';
  step.append(field(label,control));
  if(name==='cintura'){
    step.append(el('p','Passe um barbante na altura do umbigo, marque com caneta e meça com régua ou trena.'),
      btn('Não consigo medir',()=>{answers.cintura=null;current++;render();}));
  }
  control.focus();
}
function gauge(r){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 220 115');svg.setAttribute('class','gauge');
  svg.setAttribute('role','img');svg.setAttribute('aria-label','Velocímetro do IMC');
  for(let i=0;i<6;i++){
    const point=theta=>[110-88*Math.cos(theta),105-88*Math.sin(theta)];
    const [x,y]=point(i*Math.PI/6+.025),[a,b]=point((i+1)*Math.PI/6-.025);
    const path=document.createElementNS(svg.namespaceURI,'path');
    path.setAttribute('d',`M ${x} ${y} A 88 88 0 0 1 ${a} ${b}`);
    path.setAttribute('opacity',String(.28+i*.13));svg.append(path);
  }
  const hand=document.createElementNS(svg.namespaceURI,'line'), theta=(r.faixa+.5)*Math.PI/6;
  for(const [k,v] of Object.entries({x1:110,y1:105,x2:110- 70*Math.cos(theta),y2:105- 70*Math.sin(theta)}))hand.setAttribute(k,String(v));
  svg.append(hand);return svg;
}
function show(r){
  form.hidden=true;result.hidden=false;
  const principal=el('div');principal.className='risk';
  principal.append(el('h3','Indicador principal · IMC × cintura'),el('p',r.risco));
  const labels=el('div');labels.className='gauge-labels';
  faixasAdulto.forEach((f,i)=>labels.append(el(i===r.faixa?'strong':'span',f)));
  result.replaceChildren(el('h2','Sua avaliação parcial'),principal,el('h3',`IMC ${r.imc.toFixed(1).replace('.',',')} · ${r.categoria}`),
    gauge(r),labels,el('p',answers.idade>=60?'O velocímetro usa as faixas adultas. A classificação em texto aplica as faixas 60+ da planilha.':''),
    el('p',r.razao===null?'Cintura/altura indisponível sem a medida da cintura.':`Cintura/altura · ${r.razao.toFixed(2).replace('.',',')}`),el('p',aviso));
  if(answers.treinos>=5)result.append(el('p','Em pessoas com muita massa muscular o IMC pode indicar peso acima do real; por isso olhamos também a cintura e as fotos.'));
  result.append(btn('Continuar para a avaliação completa',()=>contact('email')));
}
function contact(key){
  showProgress(fields.length+(key==='email'?1:2));
  const box=el('form'), control=el('input');
  control.type=key==='email'?'email':'tel';control.required=true;control.name=key;
  const next=el('button','Continuar');next.type='submit';
  box.append(field(key==='email'?'Qual é seu e-mail?':'Qual é seu WhatsApp com DDD?',control),next);
  result.replaceChildren(el('h2','Avaliação completa'),el('p','Prévia de revisão. Use dados fictícios. Os contatos não serão enviados.'),box);
  control.focus();
  box.addEventListener('submit',ev=>{
    ev.preventDefault();
    if(key==='email'){contact('whatsapp');return;}
    showProgress(totalSteps,true);
    result.replaceChildren(el('h2','Consultoria Online'),el('p','Treino com acompanhamento personalizado.'),
      el('p','O resultado por fotos e a integração com o CRM ainda não estão ativos nesta prévia.'),
      btn('Conhecer o Desafio 21 dias',()=>location.assign('/desafio-21-dias/')));
  });
}
back.addEventListener('click',()=>{if(current>0){current--;render();}});
form.addEventListener('submit',ev=>{
  ev.preventDefault();
  const [name,,type]=fields[current];
  if(type==='photos'){show(avaliar(answers));return;}
  const v=new FormData(form).get(name);
  if(type==='text'&&!String(v).trim()){feedback.textContent='Informe seu primeiro nome.';return;}
  answers[name]=type==='number'?Number(v):v;
  current++;render();
});
render();
