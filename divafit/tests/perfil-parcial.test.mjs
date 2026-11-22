import test from 'node:test';
import assert from 'node:assert/strict';
import {perfilParcial,alternarAlimento,alimentosFavoraveis} from '../avaliacao/perfil-parcial.mjs';

const base={modalidade:'intenso',treinos:3,tempoSentada:10,sono:6,alimentacao:alimentosFavoraveis};
test('Converte intensidade e classifica sedentarismo, condicionamento e sono',()=>{
  assert.deepEqual(perfilParcial(base),{minutos:132,condicionamento:'Sedentária',qualidadeSono:'Atenção',nota:10,qualidadeAlimentacao:'Boa'});
  assert.equal(perfilParcial({...base,tempoSentada:8}).condicionamento,'Pouco ativa');
  assert.equal(perfilParcial({...base,modalidade:'musculacao',treinos:5}).condicionamento,'Ativa');
  assert.equal(perfilParcial({...base,modalidade:'corrida',treinos:5,sono:8}).condicionamento,'Muito ativa');
});
test('Opções alimentares conflitantes se excluem e existe piso para a nota',()=>{
  assert.deepEqual(alternarAlimento(['carbo','gordura'],'carboExcesso'),['gordura','carboExcesso']);
  assert.deepEqual(alternarAlimento(['carboExcesso'],'carboExcesso'),[]);
  assert.equal(perfilParcial({...base,alimentacao:['alcool']}).nota,0);
  assert.throws(()=>perfilParcial({...base,alimentacao:['gordura','gorduraExcesso']}));
});

test('Downsell expira à meia-noite de 30/11 em São Paulo',async()=>{
  const {checkoutDesafioAte}=await import('../checkout/desafio-saida.mjs');
  assert.equal(checkoutDesafioAte('',new Date('2026-11-30T20:00Z')),null);
  assert.equal(checkoutDesafioAte('https://example.test/checkout',new Date('2026-12-01T02:59:59Z')),'https://example.test/checkout');
  assert.equal(checkoutDesafioAte('https://example.test/checkout',new Date('2026-12-01T03:00:00Z')),null);
});
