import {FORM_ID} from './forms-domain.js';
const labels=[[/nome completo/i,'Nome'],[/nascimento/i,'Nascimento e idade declarada'],[/e.mail/i,'E-mail'],[/renda/i,'Renda declarada'],[/endereço completo/i,'Endereço'],[/whatsapp/i,'WhatsApp'],[/dias e horários/i,'Disponibilidade'],[/disponibilidade.*fixa/i,'Regularidade dos horários'],[/equipamentos|costuma treinar/i,'Academia e equipamentos'],[/comprometimento/i,'Comprometimento'],[/nível de treinamento/i,'Experiência declarada'],[/programa de exercícios anteriormente/i,'Programa anterior'],[/exercícios.*prazer/i,'Gosta'],[/exercícios.*não gosta/i,'Não gosta'],[/mesmos exercícios/i,'Preferência de variação'],[/tipo de treino/i,'Treino desejado'],[/peso atual/i,'Peso'],[/peso ideal/i,'Peso desejado'],[/altura/i,'Altura'],[/circunferência/i,'Abdômen'],[/polichinelos/i,'Polichinelos em 1 minuto'],[/5 quilômetros/i,'Caminhada de 5 km'],[/postura/i,'Postura'],[/horas.*sentada/i,'Tempo sentada'],[/nessa posição/i,'Teste de posição'],[/mãos nos pés/i,'Mãos nos pés'],[/braços para cima/i,'Elevação dos braços'],[/alongamento/i,'Dor ou rigidez ao alongar'],[/entediada/i,'O que desmotiva no treino'],[/3 fotos/i,'Fotos anexadas'],[/fuma/i,'Tabagismo'],[/bebida alcoólica/i,'Álcool'],[/pressão arterial/i,'Pressão'],[/problema cardiovascular/i,'Cardiovascular'],[/problema cardíaco/i,'Detalhe cardíaco'],[/pai ou irmão/i,'Histórico familiar paterno'],[/mãe ou irmã/i,'Histórico familiar materno'],[/diabete/i,'Diabetes'],[/colesterol/i,'Colesterol'],[/sobrepeso/i,'Peso — relato do aluno'],[/lesões ortopédicas/i,'Lesões ou dores'],[/medicamento/i,'Medicamentos e suplementos'],[/acompanhamento.*Nutri/i,'Acompanhamento nutricional'],[/rotina alimentar/i,'Alimentação'],[/emoções/i,'Emoções'],[/sono/i,'Sono'],[/condição médica/i,'Outras condições de saúde'],[/atividade física regularmente/i,'Outra atividade'],[/qual sua atividade/i,'Atividade e tempo de prática'],[/litros de água/i,'Água'],[/objetivo com o nosso/i,'Objetivo']];
export const formLabel=question=>labels.find(([pattern])=>pattern.test(question))?.[1]||question.split('\n')[0].replace(/^\d+\.\s*/,'');
export function googleFormsScript(secret){return `// DivaFit — mantenha este código privado na conta leaneleofit@gmail.com.
const DIVAFIT_FORM = ${JSON.stringify(FORM_ID)};
const DIVAFIT_ENDPOINT = 'https://ycchdswqaekdupmrnszz.supabase.co/functions/v1/forms-intake';
const DIVAFIT_TOKEN = ${JSON.stringify(secret)};
function instalarDivaFit() {
  const form = FormApp.openById(DIVAFIT_FORM);
  ScriptApp.getProjectTriggers().forEach(t => {if (['enviarRespostaDivaFit','repetirPendentesDivaFit'].includes(t.getHandlerFunction())) ScriptApp.deleteTrigger(t);});
  ScriptApp.newTrigger('enviarRespostaDivaFit').forForm(form).onFormSubmit().create();
  ScriptApp.newTrigger('repetirPendentesDivaFit').timeBased().everyMinutes(15).create();
  console.log('Gatilhos instalados. Novas respostas serão enviadas ao DivaFit.');
}
function enviarRespostaDivaFit(e) {
  if (!e || !e.response) throw new Error('Execute instalarDivaFit; esta função é chamada pelo envio do formulário.');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try { transmitirDivaFit(e.response); } finally { lock.releaseLock(); }
}
function transmitirDivaFit(response) {
  const pendingKey = 'pendente_' + response.getId();
  const props = PropertiesService.getScriptProperties();
  props.setProperty(pendingKey, response.getId());
  const form = FormApp.openById(DIVAFIT_FORM), sections = {}; let section = '';
  form.getItems().forEach(item => {
    if ([FormApp.ItemType.PAGE_BREAK,FormApp.ItemType.SECTION_HEADER].includes(item.getType())) section = item.getTitle();
    sections[item.getId()] = section;
  });
  const payload = {form_id:DIVAFIT_FORM,response_id:response.getId(),submitted_at:response.getTimestamp().toISOString(),respondent_email:response.getRespondentEmail()||'',answers:response.getItemResponses().map(r=>({question:r.getItem().getTitle(),answer:r.getResponse(),section:sections[r.getItem().getId()]||''}))};
  const result = UrlFetchApp.fetch(DIVAFIT_ENDPOINT,{method:'post',contentType:'application/json',headers:{'x-divafit-token':DIVAFIT_TOKEN},payload:JSON.stringify(payload),muteHttpExceptions:true});
  if (result.getResponseCode() !== 200) throw new Error('DivaFit indisponível. A resposta ficou pendente para nova tentativa.');
  props.deleteProperty(pendingKey);
}
function repetirPendentesDivaFit() {
  const lock=LockService.getScriptLock(); if(!lock.tryLock(1000)) return;
  try {
    const form=FormApp.openById(DIVAFIT_FORM), props=PropertiesService.getScriptProperties();
    Object.keys(props.getProperties()).filter(k=>k.startsWith('pendente_')).slice(0,15).forEach(k=>transmitirDivaFit(form.getResponse(props.getProperty(k))));
  } finally {lock.releaseLock();}
}
// Opcional: execute para importar respostas antigas, em lotes de até 15 por execução.
// Não altera o formulário nem envia mensagens aos alunos.
function importarAnterioresDivaFit() {
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const props=PropertiesService.getScriptProperties(), responses=FormApp.openById(DIVAFIT_FORM).getResponses();
    let cursor=Number(props.getProperty('cursor_importacao')||0), end=Math.min(cursor+15,responses.length);
    for(;cursor<end;cursor++){transmitirDivaFit(responses[cursor]);props.setProperty('cursor_importacao',String(cursor+1));}
    console.log(cursor+' de '+responses.length+' respostas processadas.');
  } finally {lock.releaseLock();}
}
`}
export function formsPanel(status,e,b){return `<section class="panel"><h2>Entrada automática pelo Google Forms</h2><p>Novas respostas criam alunos com cabeçalho e panorama nas observações. Em cadastros já existentes, preenche apenas campos vazios e anexa a nova avaliação, preservando os dados atuais da equipe e da Mfit.</p><p>${status?.last_received_at?'Última resposta recebida: '+e(new Date(status.last_received_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})):status?.configured?'Configuração preparada. Aguardando a primeira resposta do Google.':'Aguardando configuração e autorização na conta Google.'}</p>${status?`<p>Respostas recebidas: ${status.received??0} · A conferir por possível duplicidade: ${status.pending??0}</p>`:''}${b(status?.configured?'Gerar nova configuração':'Conectar Google Forms','forms-setup','','secondary')} ${b('Verificar recebimento','forms-status','','text-button')} ${status?.pending?b('Revisar possíveis duplicidades','forms-review','','secondary'):''}<p>A configuração é feita uma vez pelo administrador. Gerar uma nova chave substitui a anterior; atualize o código no Google se fizer isso.</p></section>`}
export function panoramaSections(entry){
 const groups={'Dados Gerais':[],'Avaliação Física':[],'Anamnese':[]};
 const normalize=q=>String(q||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const rows=entry.answers?.length?entry.answers:Object.values(entry.groups||{}).flat().map(r=>({question:r.label,answer:r.value}));
 for(const row of rows){const q=normalize(row.question),answer=String(row.answer??'').trim();if(!answer)continue;
  if(/clausula|reconheco.*saude|contrato/.test(q)){if(/clausula segunda/.test(q)&&!/^(concordo|sim|aceito)$/i.test(answer))groups['Dados Gerais'].push({label:'Plano',value:answer});continue}
  if(/nome completo/.test(q))continue;
  let section='Dados Gerais';
  if(/peso atual|peso ideal|altura|circunferencia|polichinelos|5 quilometros|postura|horas.*sentad|nessa posicao|maos nos pes|bracos para cima|alongamento|entediad|3 fotos/.test(q))section='Avaliação Física';
  else if(/fuma|bebida alcoolica|pressao arterial|cardiovascular|problema cardiaco|morte subita|diabete|colesterol|sobrepeso|lesoes ortopedicas|medicamento|nutri|rotina alimentar|emocoes|sono|condicao medica|atividade fisica regularmente|qual sua atividade|litros de agua/.test(q))section='Anamnese';
  const label=formLabel(row.question),value=/3 fotos/.test(q)?'Anexos informados no formulário':answer.replace(/\s*\n\s*/g,'; ');
  groups[section].push({label,value});
 }
 return groups;
}
export function formPanorama(s,e){const entries=s.training_profile?.form_entries||[];if(!entries.length)return '';return `<details class="header-observations"><summary>Panorama dos formulários (${entries.length})</summary>${[...entries].sort((a,b)=>b.submitted_at.localeCompare(a.submitted_at)).map(entry=>{const sections=panoramaSections(entry);if(s.training_profile?.email&&!sections['Dados Gerais'].some(r=>/e-mail/i.test(r.label)))sections['Dados Gerais'].unshift({label:'E-mail',value:s.training_profile.email});if(s.phone&&!sections['Dados Gerais'].some(r=>/WhatsApp/i.test(r.label)))sections['Dados Gerais'].push({label:'WhatsApp',value:s.phone});return `<article class="form-panorama"><h3>${e(s.name)} — ${e(new Date(entry.submitted_at).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}))}</h3><small>Data de preenchimento · informações declaradas pelo aluno</small>${Object.entries(sections).map(([title,rows])=>`<p class="form-summary"><strong>${e(title)}:</strong> ${rows.length?rows.map(r=>`<b>${e(r.label)}:</b> ${e(r.value)}`).join(' | '):'Não informado no formulário.'}</p>`).join('')}</article>`}).join('')}</details>`}
