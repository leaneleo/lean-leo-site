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
  const alvo=faixa<=1?gordura:metas[sexo][grupo][Math.min(4,7-faixa)];
  const bc=alvo/100;
  const gorduraPermitida=magraKg*bc/(1-bc);
  const perda=metaMinima(gorduraKg-gorduraPermitida);
  const gorduraMeta={kg:perda,dias:perda*7700/500};

  const proporcao=sexo==='F'?.75:.80;
  const baseBf=objetivo===objetivos[0]?magraKg/(1-bc)*proporcao:
    magraKg<peso*proporcao?peso*proporcao:magraKg+1;
  const area=altura**2;
  // BF/BG é o ponto de partida. O intervalo Excelente guia a meta, sem ultrapassá-lo.
  const bf=imlg>=desenvolvido?magraKg:Math.min(excelente*area,Math.max(desenvolvido*area,baseBf));
  const ganho=metaMinima(bf-magraKg);
  const musculoMeta={kg:ganho,gramas:Math.round(ganho*1000+1e-9),dias:ganho*30};
  const manter=faixa===1&&classeImlg==='Excelente';
  return {tmr,objetivo,gordura,classeGordura:classes[faixa],magra,magraKg,gorduraKg,imlg,classeImlg,
    alvo,gorduraMeta,musculoMeta,manter};
}

function metaMinima(kg){
  return kg>=.5-1e-10?kg:0;
}

const numero=(n,digits=2)=>n.toLocaleString('pt-BR',{maximumFractionDigits:digits});
export function mensagemMeta({gorduraMeta,musculoMeta,manter}){
  const gordura=gorduraMeta.kg>0, musculo=musculoMeta.kg>0;
  const perda=gordura?numero(gorduraMeta.kg)+' kg de gordura em cerca de '+numero(gorduraMeta.dias,1)+' dias':'';
  const ganho=musculo?numero(musculoMeta.gramas,0)+' g de músculo em cerca de '+numero(musculoMeta.dias,1)+' dias':'';
  if(manter)return 'Parabéns! Seu percentual de gordura e seu volume muscular estão na faixa Excelente. Agora o foco é manter esse resultado com constância no treino, na alimentação e na recuperação.';
  if(gordura&&musculo)return 'Para avançar na recomposição corporal, a projeção é eliminar '+perda+' e ganhar '+ganho+'. São metas calculadas separadamente. Planeje as etapas e o ajuste alimentar com seu nutricionista.';
  if(gordura)return 'Seu foco principal é reduzir gordura preservando a massa magra. A projeção é eliminar '+perda+' com déficit de 500 kcal/dia. Planeje a estratégia alimentar com seu nutricionista.';
  if(musculo)return 'O foco agora é ganhar massa magra. Com superávit de 400 kcal/dia, a projeção é ganhar '+ganho+'. Ajuste a estratégia alimentar com seu nutricionista.';
  return 'Pelos cálculos, não há meta de perda de gordura nem de ganho muscular acima do limite adotado. Siga acompanhando suas medidas e seu desempenho nos treinos.';
}

export const notaMeta='Projeções teóricas calculadas separadamente. Prazos e resultados variam. Ajustes de alimentação devem ser individualizados por um profissional.';
export function linhasMeta({alvo,gorduraMeta,musculoMeta}){
  return [
    ['Gordura alvo',numero(alvo,1)+'%'],
    ['Gordura a eliminar',gorduraMeta.kg?numero(gorduraMeta.kg)+' kg':'Sem meta de perda'],
    ...(gorduraMeta.kg?[['Prazo de perda · déficit de 500 kcal/dia',numero(gorduraMeta.dias,1)+' dias']]:[]),
    ['Músculo a ganhar',musculoMeta.kg?numero(musculoMeta.kg)+' kg ('+numero(musculoMeta.gramas,0)+' g)':'Sem meta de ganho'],
    ...(musculoMeta.kg?[['Prazo de ganho · superávit de 400 kcal/dia',numero(musculoMeta.dias,1)+' dias']]:[])
  ];
}
