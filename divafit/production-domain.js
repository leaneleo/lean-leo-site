import {MUSCLES,volumesTotal,daysUntil,today} from './domain.js';
export const STAGES=['Entrada e documentos','Planejar e montar','Revisar a rotina','Entrega e pagamento','Feedback em 7 dias','Concluído'];
export const CHECKLIST=[
 ['forms','Formulário, avaliação física e anamnese conferidos',0],['contract','Contrato e cadastro na Mfit conferidos',0],['summary','Resumo individual conferido com o formulário',0],
 ['history','Queixas, academia, aparelhos e preferências revistos',1],['volume','VSSAM, formato e distribuição planejados',1],['copy','Rotina de origem e adaptações registradas',1],['mfit','Treino ajustado na Mfit: nível, exercícios, séries e validade',1],
 ['intervals','Intervalos conferidos nos dois campos',2],['muscles','Séries, músculos e objetivos conferidos',2],['mobility','Mobilidade, ordem, dias e observações conferidos',2],['instructions','Instruções individualizadas e revisadas',2],
 ['payment','Pagamento conferido com Leandro',3],['access','Acesso, rotina e validade conferidos na Mfit',3],['delivery','Aluno avisado e entrega confirmada manualmente',3],
 ['feedback','Feedback após todos os treinos registrado',4],['fixes','Queixas e ajustes resolvidos',4],['library','Rotina final e decisão de contar como nova conferidas na biblioteca',4]
];
export function classifyVolume(value){if(value==null||value===''||!Number.isFinite(Number(value))||Number(value)<20)return null;const v=Number(value);return v<80?'IN'+Math.min(6,Math.floor((v-20)/10)+1):v<140?'IT'+Math.min(6,Math.floor((v-80)/10)+1):'AV'+(Math.floor((v-140)/10)+1)}
export function phaseName(phase){return phase?/^IN/.test(phase)?'Iniciante '+phase.slice(2):/^IT/.test(phase)?'Intermediário '+phase.slice(2):/^AV/.test(phase)?'Avançado '+phase.slice(2):phase:'Sem VSSAM suficiente'}
export const METHOD_REFERENCE=[['Circuito','Iniciante'],['Múltiplas séries','Iniciante'],['Bi-set','Intermediário'],['Supersérie agonista/antagonista','Intermediário'],['Pirâmide','Intermediário'],['Pré-exaustão','Intermediário'],['Repetições forçadas','Intermediário'],['Cluster / intraset rest','Intermediário'],['Tri-set','Avançado'],['Supersérie do mesmo grupo','Avançado'],['Exaustão / até a falha','Avançado'],['Excêntrico','Avançado'],['Blitz','Avançado'],['Drop set / strip set','Avançado'],['Roubada','Avançado'],['Superlento','Avançado'],['Ondulatório','Avançado'],['Superbomba','Avançado'],['GVT','Avançado'],['SST','Avançado'],['FST7','Avançado'],['Série gigante','Avançado'],['Rest-pause','Avançado']];
export function volumeSummary(grid=[]){const rows=volumesTotal(grid),days=Array.from({length:7},(_,j)=>MUSCLES.reduce((sum,_,i)=>sum+Number(grid[i]?.[j]||0),0));return {rows,days,total:rows.reduce((a,b)=>a+b,0),filled:grid.flat().some(v=>v!==null&&v!==''&&v!==undefined)}}
export function adherence(done,planned){if(done==null||done===''||planned==null||planned===''||!Number.isInteger(Number(done))||!Number.isInteger(Number(planned))||Number(planned)<=0||Number(done)<0||Number(done)>Number(planned))return null;return 100*Number(done)/Number(planned)}
export function proteinCalculation(weight,factor,meals){if([weight,factor,meals].some(v=>v==null||v===''||!Number.isFinite(Number(v))||Number(v)<=0)||!Number.isInteger(Number(meals)))return null;const total=Number(weight)*Number(factor);return {total,perMeal:total/Number(meals)}}
export function nextStep(c){return CHECKLIST.find(([key,,stage])=>stage===c.stage&&!c.payload?.checks?.[key])?.[1]|| (c.stage===5?'Atendimento concluído':'Etapa pronta para avançar')}
export function addDays(date,n){if(!date||!Number.isFinite(Date.parse(date+'T12:00:00Z')))return null;return new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10)}
export function casePriority(c,base=today()){const d=daysUntil(c.stage===4?c.payload?.followup_on:c.due_on,base);return d==null?999:d}
export function assignmentVolume(a){if(a.expected_vssam!=null)return Number(a.expected_vssam);if(a.original_vssam!=null)return Number(a.original_vssam);const grid=volumeSummary(a.volume_grid);return grid.filled?grid.total:null}
export function plannedVolumes(grid,repeats){if(repeats.length!==7||repeats.some(v=>!Number.isInteger(Number(v))||Number(v)<0||Number(v)>7))throw Error('Repetições semanais devem ser inteiras de 0 a 7.');const original=volumeSummary(grid);const activeDays=repeats.reduce((n,v,j)=>n+(grid.some(row=>row[j]!=null&&row[j]!=='')?Number(v):0),0);if(activeDays>7)throw Error('A programação ultrapassa 7 sessões semanais. Confira as repetições.');const expectedGrid=grid.map(row=>Array.from({length:7},(_,j)=>row[j]==null||row[j]===''?null:Number(row[j])*Number(repeats[j])));return {original,expected:volumeSummary(expectedGrid),expectedGrid}}
export function comparePhases(a,b){const rank=p=>{const m=/^(IN|IT|AV)(\d+)$/.exec(p||'');return m?[{IN:0,IT:1,AV:2}[m[1]],Number(m[2])]:[3,0]};const x=rank(a),y=rank(b);return x[0]-y[0]||x[1]-y[1]||(a||'').localeCompare(b||'')}
const libraryPhases = new Map([
 ['IN1', '40–59'], ['IN2', '60–79'],
 ...[[ 'IT', 6, 80 ], [ 'AV', 6, 140 ], [ 'AA', 8, 200 ]].flatMap(([prefix, count, start]) =>
   Array.from({length:count}, (_, i) => {
     const lower = start + i * 10;
     return [prefix + (i + 1), lower + '–' + (prefix === 'AA' && i === 7 ? 280 : lower + 9)];
   }))
]);

export function originalPhaseForVolume(value) {
 const v = Number(value);
 if (!Number.isFinite(v) || v < 40) return 'NC';
 if (v < 80) return v < 60 ? 'IN1' : 'IN2';
 if (v < 140) return 'IT' + (Math.floor((v - 80) / 10) + 1);
 if (v < 200) return 'AV' + (Math.floor((v - 140) / 10) + 1);
 return 'AA' + (v === 280 ? 8 : Math.floor((v - 200) / 10) + 1);
}

function libraryPhaseOf(assignment) {
 const phase = String(assignment.original_phase ?? '').trim().toUpperCase();
 const base = phase.replace(/[B-Z]$/, '');
 return libraryPhases.has(base) || /^AA(?:9|[1-9][0-9]+)$/.test(base) ? phase : 'NC';
}

export function libraryLevel(phase) {
 return {IN:'Iniciante', IT:'Intermediária', AV:'Avançada', AA:'Altamente avançada'}[phase?.slice(0, 2)] || 'Não classificado';
}

export function libraryRoutines(db,{phase='',query=''}={}) {
 const search = query.toLocaleLowerCase('pt-BR');
 return db.assignments.filter(a => !a.archived).map(a => ({
   a, w: db.workouts.find(w => w.id === a.workout_id && !w.archived),
   s: db.students?.find(s => s.id === a.student_id), phase: libraryPhaseOf(a)
 })).filter(x => (!phase || x.phase === phase) &&
   [x.a.routine_name, x.w?.name, x.s?.name, x.w?.format, x.a.predominant_methods || x.w?.methods]
     .join(' ').toLocaleLowerCase('pt-BR').includes(search))
   .sort((x, y) => (x.a.routine_name || x.w?.name || '').localeCompare(y.a.routine_name || y.w?.name || '', 'pt-BR', {numeric:true}));
}

export function libraryGroups(db) {
 const counts = new Map([['NC', 0]]);
 for (const a of db.assignments) {
   if (a.archived) continue;
   const phase = libraryPhaseOf(a);
   counts.set(phase, (counts.get(phase) || 0) + 1);
 }
 const groups = [];
 const extra = [...new Set([...counts.keys()].map(phase => phase.replace(/[B-Z]$/, '')))]
   .filter(phase => phase.startsWith('AA') && !libraryPhases.has(phase))
   .sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)))
   .map(phase => {
     const lower = 200 + (Number(phase.slice(2)) - 1) * 10;
     return [phase, (lower === 280 ? 281 : lower) + '–' + (lower + 9)];
   });
 for (const [phase, range] of [...libraryPhases, ...extra]) {
   groups.push({phase, range, count:counts.get(phase) || 0});
   for (const variant of [...counts.keys()].filter(key => key.slice(0, -1) === phase).sort()) {
     groups.push({phase:variant, range, count:counts.get(variant)});
   }
 }
 return [...groups, {phase:'NC', range:'', count:counts.get('NC')}];
}
// A source or its copy chain counts as previous use, even when the destination model was renamed.
export function historyFor(studentId,assignments){const owned=assignments.filter(a=>a.student_id===studentId),ids=new Set(),models=new Set();const visit=a=>{if(!a||ids.has(a.id))return;ids.add(a.id);models.add(a.workout_id);for(const id of [...(a.source_ids||[]),...(a.copy_control?.sources||[]).map(s=>s.assignment_id).filter(Boolean)])visit(assignments.find(x=>x.id===id))};owned.forEach(visit);return {ids,models}}
export function scheduleRepeats(format,frequency){if(!/^A[B-G]*$/.test(format)||!Number.isInteger(Number(frequency))||frequency<1||frequency>7)return null;const repeats=Array(7).fill(0);for(let day=0;day<Number(frequency);day++)repeats[day%format.length]++;return repeats}
export function suggestCopies(db,{studentId,format,target,weeklyFrequency=null,onlyUnused=true,phase=null}){const n=Number(target);if(!studentId||!format||target==null||target===''||!Number.isFinite(n)||n<20)return [];const history=historyFor(studentId,db.assignments),repeats=scheduleRepeats(format,weeklyFrequency);return db.assignments.filter(a=>!a.archived).map(a=>{const w=db.workouts.find(w=>w.id===a.workout_id&&!w.archived),original=a.original_vssam??(volumeSummary(a.volume_grid).filled?volumeSummary(a.volume_grid).total:null),projected=!!repeats&&volumeSummary(a.volume_grid).filled,v=projected?plannedVolumes(a.volume_grid,repeats).expected.total:assignmentVolume(a),used=history.ids.has(a.id)||history.models.has(a.workout_id);if(!w||w.format?.toUpperCase().trim()!==format.toUpperCase().trim()||v==null||v<20||a.student_id===studentId||(onlyUnused&&used)||(phase&&classifyVolume(v)!==phase))return null;return {a,w,volume:v,original,projected,repeats,phase:classifyVolume(v),used,gap:Math.abs(v-n),reviewed:a.reviewed===true}}).filter(Boolean).sort((a,b)=>Number(b.projected)-Number(a.projected)||a.gap-b.gap||Number(b.reviewed)-Number(a.reviewed)||a.w.name.localeCompare(b.w.name)).filter((x,i,all)=>all.findIndex(y=>y.w.id===x.w.id)===i).slice(0,12)}
