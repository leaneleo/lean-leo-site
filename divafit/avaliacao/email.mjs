import {blocosParciais} from './email-parcial.mjs';
import {trelloCopy,escapar,substituir,presenteEbook} from './email-textos.mjs';
import {avaliar, composicao, linhasMeta} from './calculos.mjs';

const fmt=(value,digits=1)=>value.toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits});

/** HTML para envio futuro com o PNG do velocímetro anexado como CID imc-gauge. */
export const assuntoAvaliacao=nome=>substituir(trelloCopy.avaliacao.subject,{nome});

export function emailAvaliacao(dados,{gordura=null,exemplo=false,nome='',checkout=null,ebookUrl=null}={}){
  const r=avaliar(dados), c=composicao(dados,gordura);
  const cintura=dados.cintura===null?'Não informada':fmt(dados.cintura)+' cm';
  const bloqueado='Envie suas fotos para desbloquear';
  const rows=[
    ['Idade',dados.idade+' anos'],['Altura',fmt(dados.altura,2)+' m'],['Peso',fmt(dados.peso)+' kg'],
    ['Cintura',cintura],['Risco à saúde · IMC × cintura',r.risco],
    ['Taxa metabólica de repouso',fmt(c.tmr,0)+' kcal/dia'],
    ['Gordura corporal',gordura===null?bloqueado:fmt(c.gordura)+'% · '+c.classeGordura],
    ['Massa magra',gordura===null?bloqueado:fmt(c.magra)+'% · '+fmt(c.magraKg,2)+' kg'],
    ['Massa gorda',gordura===null?bloqueado:fmt(c.gorduraKg,2)+' kg'],
    ['IMLG',gordura===null?bloqueado:fmt(c.imlg)+' · '+c.classeImlg],
    ...(gordura===null?[]:[['Objetivo principal',c.objetivo],...linhasMeta(c)])
  ];
  const perfil=dados.modalidade?blocosParciais(dados):null;
  const topicos=perfil?perfil.topicos.map(([label,frases])=>`<h3>${escapar(label)}</h3>${frases.map(f=>`<p>${escapar(f)}</p>`).join('')}`).join(''):'';
  const texto=trelloCopy.avaliacao;
  const final=gordura===null?'':substituir(texto.messages[c.manter?3:c.gorduraMeta.kg?c.musculoMeta.kg?0:1:c.musculoMeta.kg?2:4],{
    nome,X:fmt(c.gorduraMeta.kg,2),D:fmt(c.gorduraMeta.dias,1),G:fmt(c.musculoMeta.gramas,0),D2:fmt(c.musculoMeta.dias,1)
  });
  const cards=rows.map(([label,value])=>`<tr><td style="padding:14px 18px;background:#fff;border:1px solid #eaded7;border-radius:18px">
  <div style="color:#655951;font-size:13px">${label}</div><strong style="display:block;margin-top:6px;font-size:20px">${value}</strong></td></tr>`).join('');
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <body style="margin:0;background:#fcfaf8;color:#25201e;font:16px Comfortaa,Arial,sans-serif">
  <table role="presentation" style="width:100%;max-width:540px;margin:auto"><tr><td style="padding:26px 18px;background:#af351e;color:#fff">
  <strong>Le&amp;LeoFit</strong><h1 style="font-size:29px;margin:16px 0 0">Sua avaliação completa</h1>
  ${exemplo?'<p>Exemplo fictício para revisão</p>':''}</td></tr>
  <tr><td style="padding:24px 18px;text-align:center">
  <h2 style="font-size:28px;line-height:1.1;margin:10px 0 2px">IMC</h2><p style="font-size:12px;margin:0 0 8px">índice de massa corporal</p><img src="${exemplo?'./imc-exemplo.svg':'cid:imc-gauge'}" width="260" alt="Velocímetro do IMC" style="display:block;max-width:100%;height:auto;margin:auto">
  <p style="font-size:32px;margin:10px 0"><strong>${fmt(r.imc)}</strong></p>
  <span style="display:inline-block;padding:8px 14px;border-radius:20px;background:#f9e4dc;color:#942b19">${r.categoria}</span>
  </td></tr><tr><td style="padding:0 12px"><table role="presentation" style="width:100%;border-spacing:0 8px"></table>
  ${topicos}<table role="presentation" style="width:100%;border-spacing:0 8px">${cards}</table>
  ${final?`<p>${escapar(final)}</p>`:''}
  <p>${escapar(texto.offer)}</p><p><a href="${escapar(checkout??'https://deploy-preview-7--consultoria-divafit.netlify.app/checkout/divafit/')}">${escapar(texto.button)}</a></p>
  ${presenteEbook(ebookUrl,exemplo)}
  <p style="padding:10px;font-size:13px">${texto.footer.map(escapar).join('<br>')}</p></td></tr>
  </table></body></html>`;
}
