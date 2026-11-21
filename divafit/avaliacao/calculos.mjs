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
