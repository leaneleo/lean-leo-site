import {perfilParcial} from '../../../avaliacao/perfil-parcial.mjs';
import {objetivos} from '../../../avaliacao/calculos.mjs';
import {ANGLES,generateEstimate,readForm,readMeasures} from '../body-analysis/handler.mjs';

export function contacts(form) {
  const email=String(form.get('email')??'').trim().toLowerCase();
  const phone=String(form.get('whatsapp')??'').trim();
  const digits=phone.replace(/\D/g,'');
  if(email.length>254||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))||
     !(/^\+?[0-9(). -]+$/.test(phone))||!(/^(?:55)?[1-9]\d9\d{8}$/.test(digits)))return null;
  return [email,digits.slice(-11)];
}

export function createPublicHandler(deps) {
  return async req => {
    const origin=req.headers.get('origin');
    const headers={'Vary':'Origin','Cache-Control':'no-store','Content-Type':'application/json'};
    const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
    if(!origin||!deps.origins.includes(origin))return json({message:'Origem indisponível.'},403);
    Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS',
      'Access-Control-Allow-Headers':'content-type, x-fixture-pass'});
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(req.method!=='POST')return json({message:'Método não permitido.'},405);
    if(!deps.ready())return json({message:'Análise por fotos indisponível.'},503);
    let id;
    let keep=false;
    let isTest=false;
    const usage={input_tokens:0,output_tokens:0};
    const diagnostics=()=>isTest?{teste:true,...usage}:{};
    try {
      let form;
      try {form=await readForm(req);}catch{return json({message:'Envie três fotos JPEG de até 2 MB cada.'},400);}
      const identity=contacts(form), measures=readMeasures(form), token=form.get('challenge');
      const objective=form.get('objective');
      const withoutPhotos=form.get('without_photos')==='true';
      if(!objetivos.includes(objective)||!identity||!measures||!['feminino','masculino'].includes(measures.sex)||form.get('purpose')!=='body-photo-v1')
        return json({message:'Confira os dados da avaliação.'},400);
      const nome=String(form.get('name')??'').trim();
      const files=ANGLES.map(angle=>form.get(angle));
      if(withoutPhotos?files.some(file=>file!==null):files.some((file,i)=>!(file instanceof Blob)||file.type!=='image/jpeg'||!file.size||
         file.size>2097152||form.getAll(ANGLES[i]).length!==1))
        return json({message:'Envie uma foto JPEG para cada ângulo.'},400);
      const pass=req.headers.get('x-fixture-pass');
      if(deps.testMode){
        if(!pass||!await deps.testPass?.(pass,origin))return json({message:'Homologação restrita a testes autorizados.'},403);
        isTest=true;
      }
      if(typeof token!=='string'||!token||token.length>2048||!await deps.challenge(token,new URL(origin).hostname))
        return json({message:'Refaça a verificação de segurança.'},403);
      let profile=null;
      if(form.has('profile')){
        try {
          const {modalidade,treinos,tempoSentada,sono,alimentacao}=JSON.parse(form.get('profile'));
          profile={modalidade,treinos,tempoSentada,sono,alimentacao};
          perfilParcial(profile);
        }catch{return json({message:'Confira as respostas da avaliação parcial.'},400);}
        if(!nome||nome.length>120)return json({message:'Informe seu nome completo.'},400);
      }
      if(withoutPhotos&&!profile&&(!deps.email||deps.canEmail?.(identity[0],origin)===false))return json({message:'O envio por e-mail ainda não está disponível.'},503);
      if(withoutPhotos&&!profile&&deps.canSendChallenge?.()!==true)return json({email_enviado:false,aguardando_aprovacao:true});
      if(withoutPhotos&&(!nome||nome.length>120))return json({message:'Informe seu nome completo.'},400);
      const hashes=await Promise.all(identity.map((value,i)=>deps.hash(i+':'+value)));
      const candidate=crypto.randomUUID();
      const reserved=await deps.reserve(candidate,...hashes,isTest);
      if(reserved!=='ok')return json({message:reserved==='limit'?'Limite diário atingido. Tente amanhã.':'Este contato já foi usado ou tem uma análise em andamento.'},429);
      id=candidate;
      if(profile&&!isTest&&deps.lead&&deps.leadOrigin?.(origin)===true)await deps.lead(id,nome,...identity,{...profile,...measures,objective,withPhotos:!withoutPhotos});
      if(withoutPhotos&&deps.canSendChallenge?.()!==true)return json({email_enviado:false,aguardando_aprovacao:true});
      if(withoutPhotos){
        keep=!isTest&&!!deps.email&&await deps.email(identity[0],{...measures,...profile,objective,nome},null,id,origin).catch(()=>false);
        return json({email_enviado:keep});
      }
      let photos;
      try {
        photos=[];
        for(const file of files)photos.push(await deps.resize(file));
      }catch{return json({message:'Uma foto não pôde ser lida. Escolha as três imagens novamente.'},400);}
      const {result}=await generateEstimate(async (...args)=>{
        const reply=await deps.call(...args);
        for(const key of ['input_tokens','output_tokens'])usage[key]+=Number(reply.usage?.[key])||0;
        return reply;
      },photos,measures);
      const percentage=result.gordura_percentual;
      keep=result.fotos_ok&&percentage?.estimado>0&&percentage.estimado<100;
      const emailSent=keep&&!isTest&&deps.email?await deps.email(identity[0],{...measures,...profile,objective,nome:nome.slice(0,120)},percentage.estimado,id,origin).catch(()=>false):false;
      return json(keep?{gordura:percentage,confianca:result.confianca,...(emailSent?{email_enviado:true}:{}),...(profile&&!emailSent&&deps.approvalPending?.()?{aguardando_aprovacao:true}:{}),...diagnostics()}:
        {message:'As fotos precisam ser refeitas com boa luz, corpo inteiro e nos três ângulos.',...diagnostics()},keep?200:422);
    }catch(error){
      return json({message:'A análise está indisponível. Você ainda pode ver os demais indicadores.',...diagnostics(),
        ...(isTest&&Number.isInteger(error?.status)?{upstream_status:error.status}:{})},502);
    }finally{
      if(id&&!keep)await deps.release(id).catch(()=>{});
    }
  };
}
