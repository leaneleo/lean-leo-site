import {avaliar, composicao} from './calculos.mjs';

const fmt=(value,digits=1)=>value.toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits});

/** HTML para envio futuro com o PNG do velocímetro anexado como CID imc-gauge. */
export function emailAvaliacao(dados,{gordura=null,exemplo=false}={}){
  const r=avaliar(dados), c=composicao(dados,gordura);
  const cintura=dados.cintura===null?'Não informada':fmt(dados.cintura)+' cm';
  const bloqueado='Envie suas fotos para desbloquear';
  const rows=[
    ['Idade',dados.idade+' anos'],['Altura',fmt(dados.altura,2)+' m'],['Peso',fmt(dados.peso)+' kg'],
    ['Cintura',cintura],['Risco à saúde · IMC × cintura',r.risco],
    ['Cintura/altura',r.razao===null?'Não informada':fmt(r.razao,2)],
    ['Taxa metabólica de repouso',fmt(c.tmr,0)+' kcal/dia'],
    ['Gordura corporal',gordura===null?bloqueado:fmt(c.gordura)+'% · '+c.classeGordura],
    ['Massa magra',gordura===null?bloqueado:fmt(c.magra)+'%'],
    ['IMLG',gordura===null?bloqueado:fmt(c.imlg)+' · '+c.classeImlg],
    ['Gordura alvo',gordura===null?bloqueado:fmt(c.alvo)+'%'],
    ['Excedente de gordura',gordura===null?bloqueado:fmt(c.excedente)+' kg'],
    ['Projeção teórica a 500 kcal/dia',gordura===null?bloqueado:Math.ceil(c.dias)+' dias']
  ];
  const cards=rows.map(([label,value])=>`<tr><td style="padding:14px 18px;background:#fff;border:1px solid #eaded7;border-radius:18px">
  <div style="color:#655951;font-size:13px">${label}</div><strong style="display:block;margin-top:6px;font-size:20px">${value}</strong></td></tr>`).join('');
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <body style="margin:0;background:#fcfaf8;color:#25201e;font:16px Comfortaa,Arial,sans-serif">
  <table role="presentation" style="width:100%;max-width:540px;margin:auto"><tr><td style="padding:26px 18px;background:#af351e;color:#fff">
  <strong>Le&amp;LeoFit</strong><h1 style="font-size:29px;margin:16px 0 0">Sua avaliação completa</h1>
  ${exemplo?'<p>Exemplo fictício para revisão</p>':''}</td></tr>
  <tr><td style="padding:24px 18px;text-align:center">
  <img src="cid:imc-gauge" width="260" alt="Velocímetro do IMC" style="display:block;max-width:100%;height:auto;margin:auto">
  <p style="font-size:32px;margin:10px 0"><strong>${fmt(r.imc)}</strong></p>
  <span style="display:inline-block;padding:8px 14px;border-radius:20px;background:#f9e4dc;color:#942b19">${r.categoria}</span>
  </td></tr><tr><td style="padding:0 12px"><table role="presentation" style="width:100%;border-spacing:0 8px">${cards}</table>
  <p style="padding:10px;font-size:13px">Estimativa feita por IA e fórmulas, pode conter erros e não substitui avaliação presencial.</p></td></tr>
  </table></body></html>`;
}
