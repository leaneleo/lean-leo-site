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
const classes=['Muito baixa','Excelente','Muito boa','Boa','Adequada','Moderadamente alta','Alta','Muito alta'];
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
  const magra=100-gordura, magraKg=peso*magra/100, imlg=magraKg/altura**2;
  const [muitoBaixo,baixo,normal,desenvolvido,excelente]=sexo==='F'?[13,15,17,19,21]:[16,19,21,24,25];
  const classeImlg=imlg<muitoBaixo?'Muito baixo':imlg<baixo?'Baixo':imlg<normal?'Normal':
    imlg<desenvolvido?'Desenvolvido':imlg<=excelente?'Excelente':'Suspeito';
  // Meta consecutiva solicitada, usando limites de AS2. BC2 usa metas diferentes.
  const alvo=faixa<=1?gordura:limites[faixa-1];
  const perda=peso-magraKg/(1-alvo/100);
  const excedente=perda>0.1?perda:0; // BD2
  return {tmr,gordura,classeGordura:classes[faixa],magra,imlg,classeImlg,alvo,excedente,dias:excedente*7700/500}; // BI2
}
