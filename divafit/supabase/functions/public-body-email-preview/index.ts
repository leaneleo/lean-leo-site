import {trelloAprovado} from '../../../avaliacao/email-textos.mjs';
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {Buffer} from 'node:buffer';
import {ANGLES,MODEL,SYSTEM} from '../body-analysis/handler.mjs';
import {resize} from '../body-analysis/resize.ts';
import {sendAssessmentEmail} from './email.ts';
import {createPublicHandler} from '../public-body-analysis/handler.mjs';

const env=(name:string)=>Deno.env.get(name)??'';
const keys=JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}');
const client=createClient(env('SUPABASE_URL'),keys.default||env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false}});
const anthropic=env('ANTHROPIC_API_KEY');
const dummyTurnstile='1x0000000000000000000000000000000AA'; // Official public fixture credential.
const turnstile=env('PUBLIC_BODY_TURNSTILE_SECRET')||dummyTurnstile;
const testMode=turnstile===dummyTurnstile;
const salt=env('PUBLIC_BODY_CONTACT_SECRET')||(testMode?(keys.default||env('SUPABASE_SERVICE_ROLE_KEY')):'');
const resend=env('RESEND_API_KEY'), from=env('PUBLIC_BODY_EMAIL_FROM')||'avaliacao@envios.leeleo.com.br';
const challengeCheckout=env('PUBLIC_BODY_CHALLENGE_CHECKOUT_PREVIEW');
const ebook=env('PUBLIC_BODY_EBOOK_URL');

const preview='https://deploy-preview-7--consultoria-divafit.netlify.app';
const previewRecipient=env('PUBLIC_BODY_PDF_PREVIEW_RECIPIENT').trim().toLowerCase();
const origins=testMode?[preview]:env('PUBLIC_BODY_ORIGINS').split(',').map(s=>s.trim()).filter(origin=>origin===preview);
const canEmail=(to:string,origin:string)=>origins.includes(origin)&&origin===preview&&Boolean(previewRecipient)&&to===previewRecipient;
const encoder=new TextEncoder();
async function rpc(name:string,args:Record<string,unknown>){
  const {data,error}=await client.rpc(name,args);
  if(error)throw Error('Operação indisponível');
  return data;
}

const publicHandler=createPublicHandler({
  origins,testMode,
  canSendChallenge:()=>trelloAprovado.desafio,
  leadOrigin:(origin:string)=>origin===preview,
  approvalPending:()=>!trelloAprovado.avaliacao,
  lead:(id:string,name:string,email:string,phone:string,profile:unknown)=>
    rpc('crm_record_preview_assessment',{p_id:id,p_name:name,p_email:email,p_phone:phone,p_profile:profile}),
  canEmail,
  email:!testMode&&resend&&env('PUBLIC_BODY_EMAIL_ENABLED')==='true'
    ? (to:string,measures:Parameters<typeof sendAssessmentEmail>[3],fat:number|null,id:string,origin:string)=>
      canEmail(to,origin)&&(fat===null?trelloAprovado.desafio:trelloAprovado.avaliacao)?sendAssessmentEmail(resend,from,to,measures,fat,id,challengeCheckout,ebook,origin).then(result=>Boolean(result.emailId)):Promise.resolve(false)
    : undefined,
  async testPass(pass:string,origin:string){
    if(origin!==preview||!(/^[a-f0-9]{64}$/.test(pass)))return false;
    const digest=Buffer.from(await crypto.subtle.digest('SHA-256',encoder.encode(pass))).toString('hex');
    return await rpc('public_body_use_test_pass',{p_digest:digest})===true;
  },
  ready:()=>Boolean(anthropic&&turnstile&&salt.length>=32&&origins.length),resize,
  async hash(value:string){
    const key=await crypto.subtle.importKey('raw',encoder.encode(salt),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    return Buffer.from(await crypto.subtle.sign('HMAC',key,encoder.encode(value))).toString('hex');
  },
  reserve:(id:string,email:string,phone:string,isTest:boolean)=>rpc('public_body_reserve',{p_id:id,p_email:email,p_phone:phone,p_is_test:isTest}),
  release:(id:string)=>rpc('public_body_release',{p_id:id}),
  async challenge(token:string,hostname:string){
    const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',body:new URLSearchParams({secret:turnstile,response:token}),signal:AbortSignal.timeout(8000)
    });
    if(!response.ok)return false;
    const data=await response.json();
    return data.success===true&&(testMode||(data.hostname===hostname&&data.action==='body_analysis'));
  },
  async call(photos:Uint8Array[],measures:unknown,attempt:number,timeoutMs:number){
    const content=photos.flatMap((bytes,index):Array<Record<string,unknown>>=>[
      {type:'text',text:ANGLES[index]},
      {type:'image',source:{type:'base64',media_type:'image/jpeg',data:Buffer.from(bytes).toString('base64')}}
    ]);
    content.push({type:'text',text:JSON.stringify(measures)+(attempt?'\nRetorne o JSON corrigido.':'')});
    const response=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',signal:AbortSignal.timeout(timeoutMs),
      headers:{'content-type':'application/json','x-api-key':anthropic,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:MODEL,max_tokens:8000,system:SYSTEM,messages:[{role:'user',content}]})
    });
    if(!response.ok)throw Object.assign(Error('Serviço de estimativa indisponível'),{status:response.status});
    return response.json();
  }
});

Deno.serve(async request=>{
  const check=request.headers.get('x-preview-check');
  if(check!==null){
    const digest=Buffer.from(await crypto.subtle.digest('SHA-256',encoder.encode(check))).toString('hex');
    if(request.method!=='POST'||!check||check.length>128||
       digest!==env('PUBLIC_BODY_PDF_PREVIEW_CHECK_DIGEST')||!resend||!previewRecipient||env('PUBLIC_BODY_EMAIL_ENABLED')!=='true'){
      return Response.json({error:'Teste indisponível.'},{status:403});
    }
    const sample={weight:72,height:165,age:35,sex:'feminino',waist:92,objective:'Emagrecimento',
      nome:'Marina Teste',modalidade:'musculacao',treinos:3,tempoSentada:8,sono:6,alimentacao:['proteina','agua','doces']};
    try{
      const cases=[];
      for(const fat of [32,null]){
        const sent=await sendAssessmentEmail(resend,from,previewRecipient,sample,fat,
          'sample-'+digest.slice(0,24)+'-'+(fat===null?'parcial':'completa'),challengeCheckout,ebook,preview);
        cases.push(sent);
      }
      return Response.json({cases},{status:cases.every(item=>item.emailId)?200:502});
    }catch(error){
      console.error(JSON.stringify({event:'assessment_pdf_preview_test_failure',fontUnavailable:error?.message==='comfortaa_unavailable'}));
      return Response.json({error:'Falha ao gerar ou enviar os PDFs.'},{status:502});
    }
  }
  return publicHandler(request);
});
