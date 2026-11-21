import test from 'node:test';
import assert from 'node:assert/strict';
import {avaliar,composicao,parseMeasure,mensagemMeta} from '../avaliacao/calculos.mjs';
const base={idade:30,altura:2,peso:100,sexo:'F',objetivo:'Emagrecimento',cintura:88};
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

test('Composição usa faixas da planilha e o meta BC da planilha',()=>{
  assert.equal(composicao(base).tmr,1939);
  assert.equal(composicao(base,29.9).classeGordura,'Moderadamente Alto');
  const alta=composicao(base,32);
  assert.equal(alta.classeGordura,'Alto');
  assert.equal(alta.alvo,29.9);
  assert.ok(Math.abs(alta.magra-68)<1e-10);
  assert.ok(Math.abs(alta.imlg-17)<1e-10);
  assert.equal(alta.classeImlg,'Desenvolvido');
  assert.equal(alta.dias,alta.excedente*7700/500);
  assert.equal(composicao(base,16.9).alvo,16.9);
  assert.throws(()=>composicao(base,100));
});

test('Três objetivos reproduzem as células do Histórico recalculadas com dados fictícios',()=>{
  const columns=['classeGordura','magra','magraKg','gorduraKg','tmr','imlg','classeImlg','alvo',
    'excedente','kcal','massaMagraAlvo','ganhoMagra','pesoAlvo','dias','mensagemId'];
  const rows=[
    [[35,'F',1.65,72,32,'Emagrecimento'],['Alto',68,48.96,23.04,1415.25,17.9834710743802,'Desenvolvido',
      29.9,2.15691868758917,-16608.2738944366,52.3823109843081,3.42231098430813,69.8430813124108,33.2165477888732,2]],
    [[48,'F',1.60,68,32,'Definição Muscular'],['Moderadamente Alto',68,46.24,21.76,1279,18.0625,'Desenvolvido',
      29.9,null,null,51,4.76,72.76,null,1]],
    [[32,'M',1.78,80,18,'Hipertrofia'],['Bom',82,65.6,14.4,1757.5,20.7044565080167,'Normal',
      null,null,12000,66.6,1,81,30,5]]
  ];
  for(const [[idade,sexo,altura,peso,gordura,objetivo],expected] of rows){
    const result=composicao({idade,sexo,altura,peso,cintura:null,objetivo},gordura);
    for(const [i,key] of columns.entries()){
      const value=expected[i];
      if(typeof value==='number')assert.ok(Math.abs(result[key]-value)<1e-8,objetivo+' · '+key);
      else assert.equal(result[key],value,objetivo+' · '+key);
    }
    assert.doesNotMatch(mensagemMeta(result),/\{|undefined|NaN/);
  }
});
