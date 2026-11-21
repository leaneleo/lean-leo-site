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
      'Access-Control-Allow-Headers':'content-type'});
    if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(req.method!=='POST')return json({message:'Método não permitido.'},405);
    if(!deps.ready())return json({message:'Análise por fotos indisponível.'},503);
    let id;
    let keep=false;
    try {
      let form;
      try {form=await readForm(req);}catch{return json({message:'Envie três fotos JPEG de até 2 MB cada.'},400);}
      const identity=contacts(form), measures=readMeasures(form), token=form.get('challenge');
      if(!identity||!measures||!['feminino','masculino'].includes(measures.sex)||form.get('purpose')!=='body-photo-v1')
        return json({message:'Confira os dados e o aviso de uso das fotos.'},400);
      const files=ANGLES.map(angle=>form.get(angle));
      if(files.some((file,i)=>!(file instanceof Blob)||file.type!=='image/jpeg'||!file.size||
         file.size>2097152||form.getAll(ANGLES[i]).length!==1))
        return json({message:'Envie uma foto JPEG para cada ângulo.'},400);
      if(typeof token!=='string'||!token||token.length>2048||!await deps.challenge(token,new URL(origin).hostname))
        return json({message:'Refaça a verificação de segurança.'},403);
      const hashes=await Promise.all(identity.map((value,i)=>deps.hash(i+':'+value)));
      const candidate=crypto.randomUUID();
      const reserved=await deps.reserve(candidate,...hashes);
      if(reserved!=='ok')return json({message:reserved==='limit'?'Limite diário atingido. Tente amanhã.':'Este contato já foi usado ou tem uma análise em andamento.'},429);
      id=candidate;
      let photos;
      try {
        photos=[];
        for(const file of files)photos.push(await deps.resize(file));
      }catch{return json({message:'Uma foto não pôde ser lida. Escolha as três imagens novamente.'},400);}
      const {result}=await generateEstimate(deps.call,photos,measures);
      const percentage=result.gordura_percentual;
      keep=result.fotos_ok&&percentage?.estimado>0&&percentage.estimado<100;
      return json(keep?{gordura:percentage,confianca:result.confianca}:
        {message:'As fotos precisam ser refeitas com boa luz, corpo inteiro e nos três ângulos.'},keep?200:422);
    }catch{
      return json({message:'A análise está indisponível. Você ainda pode ver os demais indicadores.'},502);
    }finally{
      if(id&&!keep)await deps.release(id).catch(()=>{});
    }
  };
}
