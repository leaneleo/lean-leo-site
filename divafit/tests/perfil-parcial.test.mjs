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

test('Atualização aprovada conta corrida e caminhada e exclui quem fica em pé do sedentarismo',()=>{
  assert.equal(perfilParcial({...base,modalidade:'corrida',treinos:2}).minutos,160);
  assert.equal(perfilParcial({...base,modalidade:'caminhada',treinos:2}).minutos,60);
  assert.equal(perfilParcial({...base,modalidade:'outro',treinos:2}).minutos,60);
  assert.equal(perfilParcial({...base,modalidade:'nenhum',treinos:7,tempoSentada:'emPe'}).condicionamento,'Pouco ativa');
});

test('Dicas respeitam os quatro casos de verduras e legumes e o encerramento por negativos',async()=>{
  const {topicosParciais}=await import('../avaliacao/perfil-parcial.mjs');
  const {parcialCopy}=await import('../avaliacao/parcial-textos.mjs');
  const food=alimentacao=>topicosParciais({...base,alimentacao},{risco:'Baixo risco'},parcialCopy).at(-1)[1];
  const outros=['frutas','proteina','agua'];
  assert.deepEqual(food([...outros,'verduras']),[parcialCopy.vegetais.soVerduras,parcialCopy.finalSemNegativos]);
  assert.deepEqual(food([...outros,'legumes']),[parcialCopy.vegetais.soLegumes,parcialCopy.finalSemNegativos]);
  assert.deepEqual(food(outros),[parcialCopy.food[1],parcialCopy.finalSemNegativos]);
  assert.deepEqual(food([...outros,'verduras','legumes']),[parcialCopy.food[10],parcialCopy.finalSemNegativos]);
  assert.deepEqual(food(['doces','bebidas']),[parcialCopy.food[5],parcialCopy.food[6],parcialCopy.food[11]]);
});

test('Os dois e-mails reservam o presente na prévia e só incluem link HTTPS informado',async()=>{
  const {emailParcial}=await import('../avaliacao/email-parcial.mjs');
  const {emailAvaliacao}=await import('../avaliacao/email.mjs');
  const dados={...base,idade:35,sexo:'F',altura:1.65,peso:72,cintura:92,objetivo:'Emagrecimento'};
  for(const [modelo,flags] of [[emailParcial,{preview:true}],[emailAvaliacao,{exemplo:true,gordura:32}]]){
    assert.match(modelo(dados,flags),/Os 7 segredos da definição muscular.*LINK DO PDF PENDENTE/);
    assert.doesNotMatch(modelo(dados),/LINK DO PDF PENDENTE|Os 7 segredos da definição muscular/);
    assert.match(modelo(dados,{ebookUrl:'https://example.com/guia.pdf'}),/href="https:\/\/example.com\/guia.pdf"/);
    assert.doesNotMatch(modelo(dados,{ebookUrl:'http://example.com/guia.pdf'}),/Os 7 segredos da definição muscular/);
  }
});

test('Download gera um PDF com a imagem e tabela de referências',async()=>{
  const {pdfFromJpeg}=await import('../avaliacao/download-pdf.mjs');
  const pdf=pdfFromJpeg(Uint8Array.of(255,216,255,217),600,800);
  assert.equal(pdf.type,'application/pdf');
  const bytes=Buffer.from(await pdf.arrayBuffer());
  const offset=Number(bytes.toString().match(/startxref\n(\d+)/)[1]);
  assert.equal(bytes.subarray(offset,offset+4).toString(),'xref');
  assert.ok(bytes.includes('/Subtype /Image'));
});
