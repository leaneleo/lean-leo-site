const warning = 'Estimativa visual. Não substitui DEXA, bioimpedância ou dobras.';
const angleLabels = {frente:'Frente',lado:'Lado',costas:'Costas'};
const phaseLabels = {rascunho:'Rascunho',aprovado:'Aprovado',descartado:'Descartado'};
const observations = {distribuicao_gordura:'Distribuição de gordura',definicao_muscular:'Definição muscular',
  postura:'Postura',assimetrias:'Assimetrias'};
const date = stamp => new Date(stamp).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'});
const percent = n => new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n)+'%';

function element(tag,text,className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text,action,className='secondary') {
  const node = element('button',text,className);
  node.type = 'button';
  node.addEventListener('click',action);
  return node;
}
function field(form,name,label,options) {
  const wrapper = element('label',undefined,'field');
  wrapper.append(element('span',label));
  const input = element('input');
  input.name=name;
  Object.assign(input,options);
  wrapper.append(input);
  form.append(wrapper);
  return input;
}

async function makePhoto(file) {
  if (!file || file.size > 15000000) throw Error('Use fotos de até 15 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1,1200/Math.max(bitmap.width,bitmap.height));
    const canvas = element('canvas');
    canvas.width = Math.max(1,Math.round(bitmap.width*scale));
    canvas.height = Math.max(1,Math.round(bitmap.height*scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.86));
    if (!blob || blob.size>2097152) throw Error('Não consegui preparar uma das fotos.');
    return blob;
  } finally { bitmap.close(); }
}

function appendTrend(container,rows) {
  const approved = rows.filter(row=>row.status==='aprovado' && row.reviewed_values).reverse();
  if (!approved.length) return;
  const section = element('section',undefined,'body-trend');
  section.append(element('h3','Evolução das estimativas aprovadas'));
  const list = element('ol');
  for (const row of approved) {
    const value = row.reviewed_values.estimado;
    const item = element('li');
    const bar = element('progress');
    const label = date(row.created_at)+' · '+percent(value);
    bar.max = 100;
    bar.value = value;
    bar.setAttribute('aria-label',label);
    item.append(element('span',label),bar);
    list.append(item);
  }
  section.append(list);
  container.append(section);
}

function printApproved(student,row) {
  if (row.status!=='aprovado' || !row.reviewed_values) return;
  const report = window.open('about:blank','_blank');
  if (!report) throw Error('Permita a abertura da janela para salvar o PDF.');
  report.opener = null;
  const doc = report.document, v = row.reviewed_values;
  doc.title = 'Avaliação corporal · Le&LeoFit';
  const add = (tag,text) => { const node=doc.createElement(tag); node.textContent=text; doc.body.append(node); };
  add('h1',doc.title);
  add('p',student.name+' · '+date(row.approved_at));
  add('p','Gordura corporal estimada: '+percent(v.estimado)+' · faixa '+percent(v.min)+' a '+percent(v.max));
  add('p','Massa gorda: '+v.massa_gorda_kg+' kg · massa magra estimada: '+v.massa_magra_kg+' kg');
  add('p',warning);
  report.focus();
  report.print();
}

export function openBodyAnalysis(api,student,age) {
  const dialog = element('dialog',undefined,'body-analysis-dialog');
  const heading = element('div',undefined,'dialog-heading');
  heading.append(element('h2','Avaliação corporal por fotos'),button('Fechar',()=>dialog.close()));
  const status = element('p');
  status.setAttribute('role','status');
  const content = element('div');
  dialog.append(heading,element('p',warning,'body-analysis-warning'),status,content);
  document.body.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.showModal();

  async function perform(action,control) {
    control.disabled = true;
    status.textContent = 'Processando…';
    try { await action(); status.textContent = ''; }
    catch (error) { status.textContent = error.message || 'Operação indisponível.'; }
    finally { if (control.isConnected) control.disabled = false; }
  }

  async function load() {
    const [consent,rows] = await Promise.all([api.bodyAnalysisConsent(student.id),api.bodyAnalysisHistory(student.id)]);
    if (!dialog.open) return;
    content.replaceChildren();
    const consentBox = element('section',undefined,'panel');
    consentBox.append(element('h3','Consentimento da aluna'),
      element('p',consent?'Registrado em '+date(consent):
        'Confirme somente após obter autorização para armazenar e enviar as fotos e medidas à Anthropic para esta avaliação.'));
    const confirm = field(consentBox,'consent','Tenho o consentimento documentado para esse uso.',{type:'checkbox'});
    const saveConsent = button(consent?'Revogar consentimento':'Registrar consentimento',()=>perform(async()=>{
      await api.setBodyAnalysisConsent(student.id,!consent);
      await load();
    },saveConsent));
    if (consent) confirm.closest('label').remove();
    saveConsent.disabled = !consent;
    confirm.addEventListener('change',()=>{saveConsent.disabled=!confirm.checked;});
    consentBox.append(saveConsent);
    content.append(consentBox);

    const form = element('form',undefined,'panel form-grid');
    form.append(element('p','Use o mesmo local, luz uniforme, roupa de treino justa, postura neutra e a mesma distância. Enquadre o corpo inteiro.','wide'));
    for (const [angle,label] of Object.entries(angleLabels)) field(form,angle,label,{type:'file',accept:'image/jpeg,image/png,image/webp',required:true});
    const p = student.training_profile ?? {};
    for (const [name,label,min,max,value,step] of [
      ['weight','Peso (kg)',25,350,p.weight_kg,'0.1'],
      ['height','Altura (cm)',100,250,p.height_m ? Math.round(p.height_m*100) : '','0.1'],
      ['age','Idade (adulto)',18,120,age,'1'],['waist','Cintura (cm)',40,250,'','0.1'],
      ['hip','Quadril (cm)',40,250,'','0.1']
    ]) field(form,name,label,{type:'number',value:value??'',min,max,step,required:['weight','height','age'].includes(name)});
    const sexLabel = element('label',undefined,'field'), sex = element('select');
    sex.name='sex'; sex.required=true;
    for (const value of ['','feminino','masculino','outro','não informado']) {
      const option = element('option',value||'Selecione'); option.value=value; sex.append(option);
    }
    sexLabel.append(element('span','Sexo informado'),sex);
    const submit = element('button','Estimar com IA','primary');
    submit.type='submit'; submit.disabled=!consent;
    form.append(sexLabel,submit);
    form.addEventListener('submit',ev=>{
      ev.preventDefault();
      if (!consent || submit.disabled) return;
      perform(async()=>{
        const payload = new FormData(form);
        payload.set('student_id',student.id);
        for (const angle of Object.keys(angleLabels)) payload.set(angle,await makePhoto(payload.get(angle)),angle+'.jpg');
        await api.runBodyAnalysis(payload);
        await load();
      },submit);
    });
    content.append(form);
    appendTrend(content,rows);
    content.append(element('h3','Histórico de análises'));
    if (!rows.length) content.append(element('p','Nenhuma análise registrada.'));
    for (const row of rows) {
      const card = element('article',undefined,'panel body-analysis-record');
      const estimate = row.result;
      card.append(element('h4',(phaseLabels[row.status]||row.status)+' · '+date(row.created_at)));
      const v = row.reviewed_values ?? estimate.gordura_percentual;
      if (v) card.append(element('p','Gordura: '+percent(v.estimado)+' · faixa '+percent(v.min)+' a '+percent(v.max)));
      card.append(element('p','Confiança informada pelo modelo: '+(estimate.confianca==='media'?'média':estimate.confianca)),
        element('p',estimate.motivo_confianca));
      for (const [key,label] of Object.entries(observations)) {
        if (estimate.observacoes[key]) card.append(element('p',label+' · '+estimate.observacoes[key]));
      }
      if (estimate.comparacao_anterior) card.append(element('p','Comparação anterior · '+estimate.comparacao_anterior));
      for (const issue of [...estimate.problemas_fotos,...estimate.sugestoes_para_o_personal]) card.append(element('p',issue));
      if (consent) {
        const photoArea=element('div',undefined,'body-analysis-photos');
        const view=button('Ver fotos',()=>perform(async()=>{
          const {links}=await api.bodyAnalysisPhotos(row.id);
          photoArea.replaceChildren();
          links.forEach((url,i)=>{
            const img=element('img');
            img.alt=Object.values(angleLabels)[i]; img.referrerPolicy='no-referrer'; img.src=url;
            photoArea.append(img);
          });
        },view));
        card.append(view,photoArea);
      }
      if (row.status==='aprovado') card.append(button('Imprimir / salvar PDF',()=>{
        try { printApproved(student,row); }
        catch (error) { status.textContent=error.message; }
      }));
      if (row.status==='rascunho') {
        const discard=button('Descartar',()=>perform(async()=>{await api.reviewBodyAnalysis(row.id,'descartado');await load();},discard));
        if (v && estimate.fotos_ok) {
          const edit=element('form',undefined,'form-grid');
          const keys={min:'Mínimo (%)',estimado:'Estimativa (%)',max:'Máximo (%)'};
          for (const [key,label] of Object.entries(keys)) field(edit,key,label,{type:'number',value:v[key],min:0,max:100,required:true,step:'0.01'});
          const modify=element('button','Editar e aprovar','primary'); modify.type='submit';
          const approve=button('Aprovar',()=>perform(async()=>{await api.reviewBodyAnalysis(row.id,'aprovado',v);await load();},approve));
          edit.append(modify);
          edit.addEventListener('submit',ev=>{
            ev.preventDefault();
            const edited=Object.fromEntries([...new FormData(edit)].map(([key,value])=>[key,Number(value)]));
            perform(async()=>{await api.reviewBodyAnalysis(row.id,'aprovado',edited);await load();},modify);
          });
          card.append(edit,approve);
        }
        card.append(discard);
      }
      content.append(card);
    }
  }
  load().catch(error=>{status.textContent=error.message;});
}
