// Trello: https://trello.com/c/vOQ3FzDw. As faixas são calculadas sem depender da apresentação.
export const minutosEquivalentesPorTreino=Object.freeze({
  musculacao:30, intenso:44, corrida:80, caminhada:30, esportes:40, outro:30, nenhum:0
});
export const alimentosFavoraveis=Object.freeze(['frutas','verduras','legumes','proteina','carbo','gordura','agua','refeicoes']);
export const alimentosDeAtencao=Object.freeze(['carboExcesso','gorduraExcesso','doces','ultraprocessados','bebidas','alcool','puloRefeicoes','beliscos']);
const pares=[['carbo','carboExcesso'],['gordura','gorduraExcesso']];

export function alternarAlimento(selecao,item){
  if(selecao.includes(item))return selecao.filter(valor=>valor!==item);
  const par=pares.find(valores=>valores.includes(item));
  return [...selecao.filter(valor=>!par?.includes(valor)),item];
}

export function perfilParcial({modalidade,treinos,tempoSentada,sono,alimentacao}){
  const modalidades=[...new Set(Array.isArray(modalidade)?modalidade:[modalidade])];
  if(!modalidades.length||modalidades.some(item=>!Object.hasOwn(minutosEquivalentesPorTreino,item))||
    (modalidades.length>1&&modalidades.includes('nenhum'))||!Number.isInteger(treinos)||treinos<0||treinos>7||
    !['emPe',0,6,8,10,12].includes(tempoSentada)||![4,5,6,7,8].includes(sono)||
    !Array.isArray(alimentacao)) throw Error('Perfil parcial inválido.');
  const selecao=new Set(alimentacao);
  if([...selecao].some(item=>!alimentosFavoraveis.includes(item)&&!alimentosDeAtencao.includes(item))||
    pares.some(par=>par.every(item=>selecao.has(item))))throw Error('Seleção alimentar inválida.');
  const media=modalidades.reduce((total,item)=>total+minutosEquivalentesPorTreino[item],0)/modalidades.length;
  const minutos=Math.round(treinos*media);
  const condicionamento=minutos>=300?'Muito ativa':minutos>=150?'Ativa':tempoSentada>=10?'Sedentária':'Pouco ativa';
  const qualidadeSono=sono>=7?'Adequado':sono===6?'Atenção':'Insuficiente';
  const favoraveis=alimentosFavoraveis.filter(item=>selecao.has(item)).length;
  const atencao=alimentosDeAtencao.filter(item=>selecao.has(item)).length-Number(selecao.has('puloRefeicoes')&&selecao.has('beliscos'));
  const nota=Math.max(0,Math.round(10*favoraveis/alimentosFavoraveis.length-atencao));
  return {minutos,condicionamento,qualidadeSono,nota,
    qualidadeAlimentacao:nota>=8?'Boa':nota>=5?'Regular':'Precisa de atenção'};
}

export function topicosParciais(respostas,resultado,copy,limite=3){
  const p=perfilParcial(respostas);
  const risco=['Baixo risco','Risco moderado','Risco elevado'].indexOf(resultado.risco);
  const selecao=new Set(respostas.alimentacao);
  const food=copy.food;
  const negativos=[
    ...['carboExcesso','gorduraExcesso','doces','ultraprocessados','bebidas','alcool']
      .filter(item=>selecao.has(item)).map(item=>food[item]),
    selecao.has('beliscos')||selecao.has('puloRefeicoes')?food.refeicoes:null
  ].filter(Boolean);
  const verduras=selecao.has('verduras'), legumes=selecao.has('legumes');
  const dicaVegetais=verduras?(legumes?null:food.semLegumes):(legumes?food.semVerduras:food.semVegetais);
  const litros=(respostas.peso*35/1000).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
  const faltantes=[
    !selecao.has('proteina')&&food.proteina,dicaVegetais,
    !selecao.has('frutas')&&food.frutas,
    !selecao.has('agua')&&food.agua.replace('{peso x 35ml}',litros)
  ].filter(Boolean);
  const dicas=negativos.length?negativos:faltantes;
  const encerramento=negativos.length?food.finalComNegativos:food.finalSemNegativos;
  return [
    ['Risco à saúde',[copy.risk[risco]].filter(Boolean)],
    ['Nível de condicionamento',[copy.activity[['Sedentária','Pouco ativa','Ativa','Muito ativa'].indexOf(p.condicionamento)].replace('{min}',p.minutos)]],
    ['Sono',[copy.sleep[respostas.sono<=5?0:respostas.sono===6?1:2].replace('{h}',respostas.sono)]],
    ['Alimentação',[...(dicas.length?dicas.slice(0,limite):[food.semCorrecoes]),encerramento]]
  ];
}
