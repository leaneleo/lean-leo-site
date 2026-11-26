import {parseForm} from '../../../forms-domain.js';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method!=='POST')return json({error:'Método não permitido'},405);
 const secret=req.headers.get('x-divafit-token')||'';
 if(!/^[a-f0-9]{64}$/.test(secret))return json({error:'Não autorizado'},401);
 try{
  const text=await req.text();if(text.length>250000)return json({error:'Resposta muito grande'},413);
  const payload=JSON.parse(text),mapped=parseForm(payload);
  const hash=async (s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');
  const secretKeys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');const key=secretKeys.default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if(!key)return json({error:'Integração indisponível'},503);
  const headers:Record<string,string>={apikey:key,'Content-Type':'application/json'};if(!key.startsWith('sb_secret_'))headers.Authorization='Bearer '+key;
  const response=await fetch(Deno.env.get('SUPABASE_URL')+'/rest/v1/rpc/receive_google_form',{method:'POST',headers,body:JSON.stringify({p_hash:await hash(secret),p_key:payload.response_id+':'+await hash(JSON.stringify(payload)),p_data:mapped})});
  if(!response.ok){const err=await response.json().catch(()=>({}));return json({error:err.code==='28000'?'Não autorizado':'Não foi possível registrar a resposta'},err.code==='28000'?401:503)}
  return json({ok:true,result:await response.json()});
 }catch{return json({error:'Confira os campos da resposta'},400)}
});
