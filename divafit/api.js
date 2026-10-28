import {today} from './domain.js';
const config=window.DIVAFIT_CONFIG||{};export const configured=Boolean(config.supabaseUrl&&config.supabaseKey);
let session=null;try{session=JSON.parse(sessionStorage.getItem('divafit.session'))}catch{}
let recoveryPending=sessionStorage.getItem('divafit.recovery')==='true';
function setSession(s){session=s;if(s)sessionStorage.setItem('divafit.session',JSON.stringify({...s,expires_at:s.expires_at||Date.now()/1000+s.expires_in}));else sessionStorage.removeItem('divafit.session');if(s&&!s.expires_at)s.expires_at=Date.now()/1000+s.expires_in}
let refreshing=null;async function token(){if(!session)throw Error('Entre na sua conta.');if(session.expires_at<Date.now()/1000+60){if(!refreshing)refreshing=auth('token?grant_type=refresh_token',{refresh_token:session.refresh_token}).then(setSession).finally(()=>{refreshing=null});await refreshing}return session.access_token}
async function request(path,options={},authenticated=true){const headers={apikey:config.supabaseKey,'Content-Type':'application/json',...options.headers};if(authenticated)headers.Authorization='Bearer '+await token();let response;try{response=await fetch(config.supabaseUrl+path,{...options,headers})}catch{throw Error('Sem conexão. Suas alterações não foram salvas; tente novamente.')}const value=await response.json().catch(()=>null);if(!response.ok){if(response.status===401)throw Error('Sessão expirada. Entre novamente.');throw Error(value?.message||value?.error_description||'Não foi possível concluir a operação.')}return value}
async function auth(endpoint,body){return request('/auth/v1/'+endpoint,{method:'POST',body:JSON.stringify(body)},false)}
export async function login(email,password){const data=await auth('token?grant_type=password',{email,password});setSession(data)}
export async function activate(email,password){const data=await auth('signup?redirect_to='+encodeURIComponent(window.location.origin),{email,password});if(data.access_token)setSession(data);return Boolean(data.access_token)}
export async function recover(email){return auth('recover?redirect_to='+encodeURIComponent(window.location.origin),{email})}
export const isRecovery=()=>recoveryPending;
export async function setPassword(password){await request('/auth/v1/user',{method:'PUT',body:JSON.stringify({password})});recoveryPending=false;sessionStorage.removeItem('divafit.recovery')}
if(window.location.hash){const p=new URLSearchParams(window.location.hash.slice(1));if(p.get('access_token')&&p.get('refresh_token')){setSession({access_token:p.get('access_token'),refresh_token:p.get('refresh_token'),expires_in:Number(p.get('expires_in')||3600)});recoveryPending=p.get('type')==='recovery';if(recoveryPending)sessionStorage.setItem('divafit.recovery','true');window.history.replaceState(null,'',window.location.pathname)}}
export async function logout(){try{if(session)await request('/auth/v1/logout',{method:'POST'})}finally{setSession(null)}}
export const hasSession=()=>Boolean(session);
export async function profile(){return (await request('/rest/v1/team_members?select=user_id,display_name,role'))?.[0]}
export async function all(table){let rows=[],offset=0;for(;;){const page=await request(`/rest/v1/${table}?select=*&archived=eq.false&order=created_at.asc&limit=500&offset=${offset}`);rows.push(...page);if(page.length<500)return rows;offset+=500}}
export async function save(table,data,previous){const {id,version,created_at,updated_at,updated_by,...body}=data;const url='/rest/v1/'+table+(previous?`?id=eq.${encodeURIComponent(previous.id)}&version=eq.${previous.version}`:'');const rows=await request(url,{method:previous?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(body)});if(!rows?.length)throw Error('Outra pessoa alterou este registro. Feche o formulário, atualize a lista e revise antes de salvar.');return rows[0]}
export async function receipt(assignment,kind){return request('/rest/v1/message_receipts',{method:'POST',body:JSON.stringify({assignment_id:assignment.id,assignment_version:assignment.version,kind,event_date:today(),status:'Confirmado manualmente'}),headers:{Prefer:'return=representation'}})}

export async function prepareCopy(args){return request('/rest/v1/rpc/prepare_training_copy',{method:'POST',body:JSON.stringify(args)})}

export async function saveStudentRoutine(args){return request('/rest/v1/rpc/save_student_routine',{method:'POST',body:JSON.stringify(args)})}
