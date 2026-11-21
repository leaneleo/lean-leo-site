// Avaliacao Física Lean&Leofit, Histórico I2, J2 e AL2.
export const faixasAdulto = ['Abaixo do peso','Normal','Sobrepeso','Obesidade 1','Obesidade 2','Obesidade 3'];
const faixaAdulta = imc => imc<18.5?0:imc<25?1:imc<30?2:imc<35?3:imc<40?4:5;
export function avaliar({idade,altura,peso,cintura,sexo}) {
  if (!Number.isInteger(idade)||idade<18||idade>120||!Number.isFinite(altura)||altura<1||altura>2.5||
      !Number.isFinite(peso)||peso<25||peso>350||!['F','M'].includes(sexo)||
      (cintura!==null&&(!Number.isFinite(cintura)||cintura<40||cintura>250))) throw Error('Confira as medidas informadas.');
  const imc=peso/altura**2, faixa=faixaAdulta(imc);
  const categoria=idade<60?faixasAdulto[faixa]:imc<=22?'Magreza':imc<27?'Normal':imc<30?'Sobrepeso':'Obesidade';
  const [baixo,alto]=sexo==='F'?[80,88]:[94,102];
  let risco='Cintura não informada';
  if(cintura!==null) {
    if(imc<18.5) risco='Não considerado';
    else if(imc<=24.9) risco=cintura<=alto?'Baixo risco':'Risco moderado';
    else risco=cintura<baixo?'Baixo risco':cintura<=alto?'Risco moderado':'Risco elevado';
  }
  return {imc,faixa,categoria,risco,razao:cintura===null?null:cintura/(altura*100)};
}

export function parseMeasure(raw) {
  if (typeof raw!=='string' || !/^\d+(?:[.,]\d+)?$/.test(raw.trim())) return null;
  const value=Number(raw.trim().replace(',','.'));
  return Number.isFinite(value)?value:null;
}

// Histórico AS2 e AY2, preservando as faixas extras da planilha.
const gorduraLimites={
  F:[[13,16.9,19.9,22.9,25.9,28.9,31.9],[14,16.9,20.9,23.9,25.9,29.9,32.9],
    [16,19.9,23.9,26.9,29.9,31.9,36.9],[17,21.9,25.9,28.9,31.9,34.9,38.9],[18,22.9,26.9,29.9,32.9,35.9,38.9]],
  M:[[4,6.9,10.9,13.9,16.9,20.9,23.9],[8,11.9,15.9,18.9,20.9,23.9,26.9],
    [10,14.9,18.9,21.9,23.9,25.9,28.9],[12,16.9,20.9,23.9,25.9,27.9,29.9],[13,18.9,21.9,23.9,25.9,27.9,29.9]]
};
export const objetivos=['Emagrecimento','Definição Muscular','Hipertrofia'];
const classes=['Muito Baixo','Excelente','Muito Bom','Bom','Adequado','Moderadamente Alto','Alto','Muito Alto'];
const metas={
  F:[[31.9,28.9,24.9,19.9,16.9],[33.9,29.9,25.9,20.9,16.9],[35.9,31.9,27.9,23.9,19.9],
     [36.9,33.9,29.9,25.9,21.9],[37.9,34.9,30.9,26.9,22.9]],
  M:[[20.9,16.9,13.9,10.9,6.9],[24.9,21.9,18.9,15.9,11.9],[27.9,24.9,21.9,18.9,14.9],
     [28.9,25.9,23.9,20.9,16.9],[30.9,27.9,24.9,21.9,18.9]]
};
export function composicao(dados,gordura=null){
  avaliar(dados);
  const {idade,altura,peso,sexo}=dados;
  const tmr=10*peso+625*altura-5*idade+(sexo==='F'?-161:5); // AW2
  if(gordura===null)return {tmr};
  if(!Number.isFinite(gordura)||gordura<=0||gordura>=100)throw Error('Percentual de gordura inválido.');
  const grupo=[25,35,45,55,Infinity].findIndex(max=>idade<=max);
  const limites=gorduraLimites[sexo][grupo];
  const limite=limites.slice(1).findIndex(max=>gordura<=max);
  const faixa=gordura<limites[0]?0:limite===-1?7:limite+1;
  const ao=gordura/100, at=1-ao;
  const magra=at*100, magraKg=peso*at, gorduraKg=peso*ao, imlg=magraKg/altura**2;
  const [muitoBaixo,baixo,normal,desenvolvido,excelente]=sexo==='F'?[13,15,17,19,21]:[16,19,21,24,25];
  const classeImlg=imlg<muitoBaixo?'Muito Baixo':imlg<baixo?'Baixo':imlg<normal?'Normal':
    imlg<desenvolvido?'Desenvolvido':imlg<=excelente?'Excelente':'Suspeito';
  const {objetivo}=dados;
  if(!objetivos.includes(objetivo))throw Error('Selecione o objetivo principal.');
  const emagrecimento=objetivo===objetivos[0], hipertrofia=objetivo===objetivos[2];
  const alvo=hipertrofia?null:faixa<=1?gordura:metas[sexo][grupo][Math.min(4,7-faixa)];
  const proporcao=sexo==='F'?.75:.80;
  const pesoComMagraConstante=emagrecimento?magraKg/(1-alvo/100):null;
  const massaMagraAlvo=emagrecimento?pesoComMagraConstante*proporcao:
    magraKg<peso*proporcao?peso*proporcao:magraKg+1;
  const ganho=massaMagraAlvo-magraKg;
  const ganhoMagra=ganho>.1?ganho:null;
  const pesoAlvo=emagrecimento?pesoComMagraConstante:peso+(ganhoMagra??0);
  const excedente=!hipertrofia&&peso-pesoAlvo>.1?peso-pesoAlvo:null;
  const kcal=hipertrofia?(ganhoMagra===null?null:ganhoMagra*12000):(excedente===null?null:-excedente*7700);
  const dias=hipertrofia?(ganhoMagra===null?null:ganhoMagra*30):(excedente===null?null:excedente*7700/500);
  const mensagemId=objetivo===objetivos[1]?1:emagrecimento?(ganhoMagra!==null?2:3):(excedente!==null?4:5);
  return {tmr,objetivo,gordura,classeGordura:classes[faixa],magra,magraKg,gorduraKg,imlg,classeImlg,
    alvo,pesoAlvo,massaMagraAlvo,ganhoMagra,excedente,kcal,dias,mensagemId};
}

// Dashboard P58:P62. Redação original.
const mensagens=[
  "Para conquistarmos a sua Definição Muscular, o foco é recomposição corporal. Uma meta alcançável seria eliminar {fat0} kg de gordura pura e construir {gain} kg de massa magra. Em aproximadamente {days} dias de consistência com um planejamento focado esse resultado é totalmente viável, mas o ajuste fino calórico e metabólico para essa recomposição deve ser traçado com o sua nutricionista e médico.",
  "Para alcançar o seu objetivo de emagrecimento de forma acessível, será necessário um déficit calórico total estimado de {kcalGrouped} kcal para eliminar {fat} kg de gordura, enquanto ganhamos {gain} kg de massa magra para blindar seu metabolismo. Mantendo uma constância ativa, em cerca de {days} dias com uma meta diária saudável de 500 kcal/dia de déficit você atinge essa marca. A estratégia alimentar e de saúde para esse processo deve ser feita em parceria com o seu nutricionista e médico.",
  "O seu foco principal será a redução do percentual de gordura. Para alcançar com segurança seu emagrecimento, será necessário eliminar {fat} kg de gordura pura, mantendo seus músculos intactos. Em {days} dias, mantendo um déficit calórico de 500 kcal/dia, alcançamos essa meta. O plano alimentar estratégico para tal deve ser feito com o nutricionista.",
  "Para construirmos um físico volumoso e com um pouco mais de definição no seu processo de Hipertrofia, o caminho mais inteligente será ajustar moderadamente {fat} kg de gordura excedente antes de focar puramente no ganho de peso isolado. Isso garantirá que você construa massa magra com o ambiente metabólico super regulado, buscando a meta de {target} de gordura corporal. Mas, em aproximadamente {days} dias de consistência com o planejamento focado de superávit calórico de 400 kcal/dia, o ganho de {gain} de músculo pode ser totalmente viável. O direcionamento com o nutricionista e médico será essencial para criar essa transição perfeita.",
  "O seu corpo está no cenário perfeito para focar 100% no ganho de volume e densidade muscular, já que seu percentual de gordura está {class} em {target}. Buscaremos construir {gain} kg de massa magra sólida. Fisiologicamente, iniciantes com ótima genética, nutrição e sono ganham até 2 kg de músculo/mês. Sendo realistas e visando um ganho limpo (metade desse potencial), estimamos que em {days} dias, mantendo um superávit estratégico de 400 kcal/dia ( {kcal} kcal/mês), você atingirá a meta. O ajuste de macronutrientes com o nutricionista será essencial."
];

export function mensagemMeta(meta){
  const text=(n,digits,group=false)=>n===null?'-':n.toLocaleString('pt-BR',{
    minimumFractionDigits:digits,maximumFractionDigits:digits,useGrouping:group
  });
  const values={fat0:text(meta.excedente,0),fat:text(meta.excedente,1),gain:text(meta.ganhoMagra,1),
    days:text(meta.dias,0),kcalGrouped:text(meta.kcal===null?null:Math.abs(meta.kcal),0,true),
    target:text(meta.alvo??meta.gordura,1)+'%',class:meta.classeGordura,kcal:text(meta.kcal,0)};
  return mensagens[meta.mensagemId-1].replace(/\{(\w+)\}/g,(_,key)=>values[key]);
}

export const notaMeta='Projeção teórica da planilha. Prazos e resultados variam. Ajustes de alimentação devem ser individualizados por um profissional.';
export function linhasMeta(meta){
  const measure=(n,unit,digits=2)=>n===null?'-':n.toLocaleString('pt-BR',{maximumFractionDigits:digits})+unit;
  return [
    ['Gordura alvo',measure(meta.alvo,'%',1)],['Peso alvo',measure(meta.pesoAlvo,' kg')],
    ['Massa magra alvo',measure(meta.massaMagraAlvo,' kg')],['Ganho de massa magra',measure(meta.ganhoMagra,' kg')],
    ['Excedente de gordura',measure(meta.excedente,' kg')],['Saldo energético estimado',measure(meta.kcal,' kcal',0)],
    ['Prazo estimado',measure(meta.dias,' dias')]
  ];
}
