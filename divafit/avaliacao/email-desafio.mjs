import {desafioBlack} from '../desafio-config.js';

import {trelloCopy,escapar,substituir} from './email-textos.mjs';
export const assuntoDesafio=nome=>substituir(trelloCopy.desafio.subject,{nome});
export function emailDesafio(nome,{preview=false}={}){
  const origin='https://deploy-preview-7--consultoria-divafit.netlify.app';
  const url=origin+desafioBlack.path;
  const {blocks,footer}=trelloCopy.desafio;
  const content=blocks.map(block=>{
    const copy=escapar(substituir(block,{nome})).replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
    if(block.startsWith('[Botão] '))return `<p><a href="${url}" style="display:inline-block;padding:15px 20px;background:#a23822;color:#fff;border-radius:12px;text-decoration:none;font-weight:bold">${copy.slice(8)}</a></p>`;
    if(block.startsWith('O que você recebe:\n')){
      const [title,...items]=copy.split('\n');
      return `<p><strong>${title}</strong></p><ul style="padding-left:22px;line-height:1.6">${items.map(item=>`<li>${item}</li>`).join('')}</ul>`;
    }
    return `<p style="line-height:1.55">${copy.replaceAll('\n','<br>')}</p>`;
  }).join('');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow"><title>${escapar(assuntoDesafio(nome))}</title>
  <style>@font-face{font-family:Comfortaa;src:url('${origin}/assets/brand/comfortaa.ttf') format('truetype');font-display:swap}</style></head>
  <body style="margin:0;background:#101010;color:#fff5ee;font-family:Comfortaa,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#101010"><tr><td style="padding:24px 14px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;background:#1b1514;border:1px solid #673322;border-radius:22px">
  <tr><td style="padding:30px 26px 12px;color:#f3a385;font-size:14px;font-weight:bold">Le&amp;LeoFit${preview?' · Prévia com nome fictício':''}</td></tr>
  <tr><td style="padding:0 26px 26px">
    ${content}
    <p style="margin:0;border-top:1px solid #673322;padding-top:16px;color:#d5c4bb;font-size:12px;line-height:1.55">${footer.map(escapar).join('<br>')}</p>
  </td></tr></table></td></tr></table></body></html>`;
}
