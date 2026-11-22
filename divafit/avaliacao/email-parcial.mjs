import {avaliar} from './calculos.mjs';
import {perfilParcial,topicosParciais} from './perfil-parcial.mjs';
import {parcialCopy} from './parcial-textos.mjs';
import {email2Copy} from './email2-textos.mjs';
import {escapar,substituir,presenteEbook} from './email-textos.mjs';

export function blocosParciais(dados){
  const p=perfilParcial(dados), r=avaliar(dados);
  return {
    cards:[
      ['Risco à saúde · IMC × cintura',r.risco],
      ['Nível de condicionamento',p.minutos+' min/semana ('+p.condicionamento+')'],
      ['Sono',dados.sono+' h ('+p.qualidadeSono+')'],
      ['Alimentação',p.nota+'/10 ('+p.qualidadeAlimentacao+')']
    ].map(([rotulo,valor])=>`<p><small>${escapar(rotulo)}</small><br><strong>${escapar(valor)}</strong></p>`).join(''),
    topicos:topicosParciais(dados,r,parcialCopy,Infinity)
  };
}

export function emailParcial(dados,{nome='',preview=false,checkout=null,ebookUrl=null}={}){
  const {cards,topicos}=blocosParciais(dados);
  const instrucoes=email2Copy.body.match(/^O que fazer esta semana: .+$/gm);
  const paragrafo=texto=>`<p>${escapar(texto).replaceAll('\n','<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')}</p>`;
  const greeting=email2Copy.body.match(/^Oi, .+$/m)[0];
  const closing=email2Copy.body.split('\n\n').at(-1);
  const offer=email2Copy.offer.split('\n\n').map(bloco=>{
    if(bloco.startsWith('[Botão]'))return checkout
      ?`<p><a style="color:#fff;background:#a23822;padding:12px;text-decoration:none" href="${escapar(checkout)}">Quero entrar no Desafio</a></p>`
      :'<p><strong>Quero entrar no Desafio</strong></p>';
    return paragrafo(bloco);
  }).join('');
  const src=preview?'./imc-exemplo.svg':'cid:imc-gauge';
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>@font-face{font-family:Comfortaa;src:url('/assets/brand/comfortaa.ttf')}</style>
  <body style="background:#fff8f3;color:#29201d;font:16px Comfortaa,Arial,sans-serif"><main style="max-width:560px;margin:auto;padding:20px">
  <h1 style="text-align:center">SUA AVALIAÇÃO PARCIAL</h1><h2 style="font-size:28px;line-height:1.1;margin:10px 0 2px">IMC</h2><p style="font-size:12px;margin:0 0 8px">índice de massa corporal</p><img src="${src}" width="260" alt="IMC" style="max-width:100%"><p><strong>${avaliar(dados).imc.toLocaleString('pt-BR',{maximumFractionDigits:1})}</strong> (${escapar(avaliar(dados).categoria)})</p>
  ${cards}${paragrafo(substituir(greeting,{nome}))}
  ${topicos.map(([titulo,frases],i)=>`<h2>${titulo}</h2>${frases.map(paragrafo).join('')}${paragrafo(instrucoes[i])}`).join('')}
  ${paragrafo(closing)}<section style="padding:22px;background:#191211;color:#fff7f2;border:1px solid #673322;border-radius:16px">${offer}</section>
  ${presenteEbook(ebookUrl,preview)}
  ${paragrafo(email2Copy.footer)}</main></body></html>`;
}
