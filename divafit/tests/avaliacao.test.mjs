import test from 'node:test';
import assert from 'node:assert/strict';
import {avaliar} from '../avaliacao/calculos.mjs';
const base={idade:30,altura:200,peso:100,sexo:'F',cintura:88};
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
