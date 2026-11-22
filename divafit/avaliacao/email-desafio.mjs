import {desafioBlack} from '../desafio-config.js';

export const assuntoDesafio='Desafio Black | Emagrecimento e Definição';
const escapar=texto=>String(texto).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

export function emailDesafio(nome,{preview=false}={}){
  const origin='https://deploy-preview-7--consultoria-divafit.netlify.app';
  const url=origin+desafioBlack.path;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow"><title>${assuntoDesafio}</title>
  <style>@font-face{font-family:Comfortaa;src:url('${origin}/assets/brand/comfortaa.ttf') format('truetype');font-display:swap}</style></head>
  <body style="margin:0;background:#101010;color:#fff5ee;font-family:Comfortaa,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#101010"><tr><td style="padding:24px 14px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;background:#1b1514;border:1px solid #673322;border-radius:22px">
  <tr><td style="padding:30px 26px 12px;color:#f3a385;font-size:14px;font-weight:bold">Le&amp;LeoFit${preview?' · Prévia com nome fictício':''}</td></tr>
  <tr><td style="padding:0 26px 26px">
    <h1 style="margin:8px 0;color:#fff5ee;font-size:38px;line-height:1.15">${desafioBlack.name}</h1>
    <p style="margin:8px 0 22px;color:#f3a385;font-size:22px">${desafioBlack.theme}</p>
    <p style="line-height:1.55">Olá, ${escapar(nome)}! Se você quer retomar o ritmo, o Desafio Black é um convite para colocar o treino e a alimentação na rotina ao longo de 21 dias.</p>
    <p style="padding:14px;background:#29201d;border-radius:12px;line-height:1.5"><strong>${desafioBlack.dates}</strong><br>${desafioBlack.delivery} · ${desafioBlack.status}</p>
    <p style="margin:26px 0"><a href="${url}" style="display:inline-block;padding:15px 20px;background:#a23822;color:#fff;border-radius:12px;text-decoration:none;font-weight:bold">Conhecer o Desafio Black</a></p>
    <p style="margin:0;border-top:1px solid #673322;padding-top:16px;color:#d5c4bb;font-size:12px;line-height:1.55">🔒 Seus dados estão protegidos pela Lei Geral de Proteção de Dados (LGPD): Lei n. 13.709, de 14 de agosto de 2018. Nada será publicado sem sua autorização.</p>
  </td></tr></table></td></tr></table></body></html>`;
}
