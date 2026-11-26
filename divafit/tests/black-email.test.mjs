import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shortEmail} from '../supabase/functions/public-body-analysis/template.mjs';
import {desafioBlack} from '../desafio-config.js';
import {readFileSync} from 'node:fs';

test('E-mail 2 usa a oferta aprovada na janela e ignora o checkout do Desafio',()=>{
 const render=at=>shortEmail({nome:'Pessoa Teste',full:false,origin:'https://app.leeleo.com.br',checkout:'https://buy.infinitepay.io/desafio',now:Date.parse(at)}).html;
 for(const [at,expected] of [['2026-11-26T23:59:59-03:00',false],['2026-11-27T00:00:00-03:00',true],
  ['2026-11-30T23:59:59-03:00',true],['2026-12-01T00:00:00-03:00',false]]) {
  const html=render(at);
  assert.equal(html.includes('https://app.leeleo.com.br/checkout/divafit/'),expected);
  assert.doesNotMatch(html,/infinitepay|desafio-21-dias|Quero entrar no Desafio/i);
 }
});

test('Página do Desafio mantém as vendas fechadas na data nova',()=>{
 assert.equal(desafioBlack.dates,'4 a 24 de janeiro de 2027');
 assert.equal(desafioBlack.status,'Vendas fechadas');
 assert.doesNotMatch(readFileSync(new URL('../desafio-21-dias/index.html',import.meta.url),'utf8'),/infinitepay|comprar/i);
});
