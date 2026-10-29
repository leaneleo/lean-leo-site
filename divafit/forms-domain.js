// Respostas declaradas pelo aluno; nenhuma classificação clínica é inferida.
export const FORM_ID='1sh8auc4F7zdrqVv-pl3ERwey6nKfE7dzWPx1U_7fgg4';
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export function birthDate(value){const m=String(value||'').match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);if(!m)return null;const [,d,mo,y]=m,dt=new Date(`${y}-${mo}-${d}T12:00:00Z`);return !Number.isNaN(+dt)&&dt.getUTCMonth()+1===+mo&&dt.getUTCDate()===+d&&+y>=1900&&dt<=new Date()?`${y}-${mo}-${d}`:null}
export function measurement(value,kind){const raw=String(value??'').trim().replace(',','.');if(!/^\d+(\.\d+)?\s*(kg|m|cm)?$/i.test(raw))return null;let v=parseFloat(raw);if(kind==='height'&&v>3)v/=100;return kind==='height'?(v>=.5&&v<=2.5?v:null):(v>0&&v<=500?v:null)}
export function phoneNumber(value){let s=String(value??'').replace(/\D/g,'');if(s.length===10||s.length===11)s='55'+s;return /^\d{12,15}$/.test(s)?s:null}
export function parseForm(payload){
 if(payload.form_id!==FORM_ID||!payload.response_id||!Array.isArray(payload.answers)||payload.answers.length>200)throw Error('Resposta de formulário inválida');
 if(!/^\d{4}-\d{2}-\d{2}T/.test(payload.submitted_at||'')||Number.isNaN(Date.parse(payload.submitted_at)))throw Error('Data de envio inválida');
 const answers=payload.answers.map(a=>({question:String(a.question||'').trim(),answer:Array.isArray(a.answer)?a.answer.map(String).join(', '):String(a.answer??'').trim(),section:String(a.section||'')}));
 const find=pattern=>answers.find(a=>pattern.test(norm(a.question)))?.answer||'';
 const name=find(/nome completo/).trim();if(!name)throw Error('Nome completo não encontrado');
 const email=(payload.respondent_email||find(/endereco de e.mail|^e.mail$|seu e.mail/)).trim().toLowerCase();
 const profile={email:email||null,goal:find(/objetivo com o nosso treinamento|qual.*objetivo/)||null,weight_kg:measurement(find(/peso atual/),'weight'),height_m:measurement(find(/qual sua altura/),'height'),gym:find(/onde voce costuma treinar|equipamentos.*disposicao/)||null,availability:find(/dias e horarios disponiveis/)||null,other_activity:find(/pratica outra atividade fisica regularmente/)||null,other_activity_detail:find(/qual sua atividade e ha quanto tempo/)||null,limitations:find(/lesoes ortopedicas/)||null,likes:find(/exercicios.*prazer|exercicios.*preferidos/)||null,dislikes:find(/exercicios.*nao gosta/)||null};
 const birth=birthDate(find(/data de nascimento/));
 const groups={'Dados Gerais':[],'Avaliação Física':[],'Anamnese':[],'Contrato e outras respostas':[]};
 for(const a of answers){if(!a.answer)continue;const q=norm(a.question),section=norm(a.section);let group='Dados Gerais';if(/clausula|reconheco.*saude|contrato/.test(q))group='Contrato e outras respostas';else if(/anamnese/.test(section)||/fuma|bebida alcoolica|pressao arterial|cardiovascular|problema cardiaco|morte subita|diabete|colesterol|sobrepeso|lesoes ortopedicas|medicamento|nutri|rotina alimentar|emocoes|sono|condicao medica|atividade fisica regularmente|qual sua atividade|litros de agua|objetivo com o nosso/.test(q))group='Anamnese';else if(/avaliacao fisica/.test(section)||/peso atual|peso ideal|altura|circunferencia|polichinelos|5 quilometros|postura|horas.*sentada|nessa posicao|maos nos pes|bracos para cima|alongamento|entediada|3 fotos/.test(q))group='Avaliação Física';groups[group].push({label:a.question,value:a.answer})}
 const entry={form_id:payload.form_id,response_id:String(payload.response_id),submitted_at:payload.submitted_at,groups,answers};
 return {name,email:email||null,phone:phoneNumber(find(/numero de whatsapp/)),birth_date:birth,training_profile:profile,entry};
}
