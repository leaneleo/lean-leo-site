import test from 'node:test';
import assert from 'node:assert/strict';
import {avaliar,composicao,parseMeasure} from '../avaliacao/calculos.mjs';
const base={idade:30,altura:2,peso:100,sexo:'F',cintura:88};
test('Faixas adultas e camada de 60+ acompanham a planilha',()=>{
  assert.deepEqual([70,74,100,120,140,160].map(peso=>avaliar({...base,peso}).faixa),[0,1,2,3,4,5]);
  assert.equal(avaliar({...base,idade:60,peso:88}).categoria,'Magreza');
  assert.equal(avaliar({...base,idade:60}).categoria,'Normal');
});
test('Risco cruza IMC, sexo e medida de cintura sem usar quadril',()=>{
  assert.equal(avaliar(base).risco,'Risco moderado');
  assert.equal(avaliar({...base,cintura:88.1}).risco,'Risco elevado');
  assert.equal(avaliar({...base,sexo:'M',cintura:102}).risco,'Risco moderado');
  assert.equal(avaliar({...base,peso:96,cintura:88.1}).risco,'Risco moderado');
  assert.equal(avaliar({...base,cintura:null}).razao,null);
  assert.equal(avaliar(base).razao,0.44);
});
test('Rejeita idade infantil e medidas ausentes ou fora do intervalo',()=>{
  assert.throws(()=>avaliar({...base,idade:17}));
  assert.throws(()=>avaliar({...base,altura:0}));
  assert.throws(()=>avaliar({...base,cintura:NaN}));
});

test('Altura em metros aceita vírgula ou ponto, com cintura em centímetros',()=>{
  assert.equal(parseMeasure('1,65'),1.65);
  assert.equal(parseMeasure('1.65'),1.65);
  assert.equal(parseMeasure('1,65 m'),null);
  assert.throws(()=>avaliar({...base,altura:165}));
  assert.ok(Math.abs(avaliar({...base,altura:1.65,cintura:82.5}).razao-0.5)<1e-12);
});

test('Composição usa faixas da planilha e o teto da faixa imediatamente melhor',()=>{
  assert.equal(composicao(base).tmr,1939);
  assert.equal(composicao(base,29.9).classeGordura,'Moderadamente alta');
  const alta=composicao(base,32);
  assert.equal(alta.classeGordura,'Alta');
  assert.equal(alta.alvo,29.9);
  assert.equal(alta.magra,68);
  assert.equal(alta.imlg,17);
  assert.equal(alta.classeImlg,'Desenvolvido');
  assert.equal(alta.dias,alta.excedente*7700/500);
  assert.equal(composicao(base,16.9).alvo,16.9);
  assert.throws(()=>composicao(base,100));
});
