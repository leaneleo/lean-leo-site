import {emailAvaliacao} from '../avaliacao/email.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {avaliar,composicao,parseMeasure,mensagemImc,mensagemMeta,linhasMeta} from '../avaliacao/calculos.mjs';
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
  assert.equal(alta.gorduraMeta.dias,alta.gorduraMeta.kg*7700/500);
  assert.equal(composicao(base,16.9).alvo,16.9);
  assert.throws(()=>composicao(base,100));
});

test('Quatro cenários escolhem a mensagem pelos resultados e renderizam tela e email sem traços',()=>{
  const cases=[
    [72,32,'Definição Muscular',2.15691868758917,5.04,5040,/recomposição corporal/],
    [80,32,'Hipertrofia',2.39657631954352,0,0,/reduzir gordura preservando/],
    [60,16,'Emagrecimento',0,1.3275,1328,/superávit de 400 kcal/],
    [65,16,'Hipertrofia',0,0,0,/Parabéns/]
  ];
  for(const [peso,gordura,objetivo,perda,ganho,gramas,esperado] of cases){
    const dados={idade:35,sexo:'F',altura:1.65,peso,cintura:null,objetivo};
    const r=composicao(dados,gordura), msg=mensagemMeta(r);
    assert.ok(Math.abs(r.gorduraMeta.kg-perda)<1e-9);
    assert.ok(Math.abs(r.musculoMeta.kg-ganho)<1e-9);
    assert.equal(r.musculoMeta.gramas,gramas);
    assert.equal(r.gorduraMeta.dias,r.gorduraMeta.kg*7700/500);
    assert.equal(r.musculoMeta.dias,r.musculoMeta.kg*30);
    assert.match(msg,esperado);
    assert.ok(emailAvaliacao(dados,{gordura}).includes(msg));
    assert.doesNotMatch(JSON.stringify(linhasMeta(r))+msg,/"-"|eliminar -|NaN/);
  }
});

test('Metas inferiores a 500 g ficam fora e 500 g entram',()=>{
  const dados={idade:35,sexo:'F',altura:1.65,peso:65,cintura:null,objetivo:'Emagrecimento'};
  assert.equal(composicao(dados,30.1).gorduraMeta.kg,0);
  const gorduraNoCorte=29.9+.5*(1-.299)/dados.peso*100;
  assert.ok(Math.abs(composicao(dados,gorduraNoCorte).gorduraMeta.kg-.5)<1e-9);
  const peso=(19*dados.altura**2-.4)/.84;
  const r=composicao({...dados,peso},16);
  assert.equal(r.musculoMeta.kg,0);
  assert.match(mensagemMeta(r),/não há meta/);
});

test('Cada faixa de IMC tem duas mensagens distintas',()=>{
  const all=[0,1,2,3,4,5].flatMap(faixa=>[0,1].map(variante=>mensagemImc({faixa},variante)));
  assert.equal(new Set(all).size,12);
  assert.ok(all.every(msg=>msg.length>80));
  assert.equal(mensagemImc({faixa:0,categoria:'Normal'},0),mensagemImc({faixa:1},0));
});
