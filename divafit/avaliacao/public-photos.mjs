export function publicPhotosEnabled(config){
  return Boolean(config?.sitekey&&/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/public-body-analysis$/.test(config.endpoint));
}

let scriptReady;
export async function photoChallenge(container,update){
  const config=window.DIVAFIT_PUBLIC_BODY;
  scriptReady??=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    const done=(error)=>{
      clearTimeout(timeout);
      delete window.divafitTurnstileLoaded;
      if(error){script.remove();reject(error);}else resolve();
    };
    const timeout=setTimeout(()=>done(Error('Tempo de verificação esgotado.')),15000);
    window.divafitTurnstileLoaded=()=>done();
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=divafitTurnstileLoaded';
    script.onerror=()=>done(Error('Não foi possível carregar a verificação.'));
    document.head.append(script);
  }).catch(error=>{scriptReady=undefined;throw error;});
  await scriptReady;
  if(!container.isConnected)return;
  window.turnstile.render(container,{
    sitekey:config.sitekey,action:'body_analysis',callback:update,
    'expired-callback':()=>update('','A verificação expirou. Aguarde uma nova verificação ou volte e tente novamente.'),
    'timeout-callback':()=>update('','A verificação demorou demais. Volte e tente novamente.'),
    'error-callback':()=>{update('','Não foi possível verificar. Volte e tente novamente ou veja o resumo.');return true;}
  });
}

async function jpeg(file){
  if(!file||file.size>15*1024*1024)throw Error('Escolha imagens de até 15 MB.');
  const image=await createImageBitmap(file);
  try {
    const scale=Math.min(1,1200/Math.max(image.width,image.height)), canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(image.width*scale));
    canvas.height=Math.max(1,Math.round(image.height*scale));
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.86));
    if(!blob||blob.size>2097152)throw Error('Escolha fotos menores e tente novamente.');
    return blob;
  }finally{ image.close(); }
}

export async function sendPublicPhotos(config,data,photos,contacts,challenge){
  const fields={without_photos:!photos.size,purpose:'body-photo-v1',challenge,name:contacts.nome,email:contacts.email,whatsapp:contacts.whatsapp,
    objective:data.objetivo,weight:data.peso,height:data.altura*100,age:data.idade,sex:data.sexo==='F'?'feminino':'masculino'};
  if(data.cintura!==null)fields.waist=data.cintura;
  const body=new FormData();
  for(const [key,value] of Object.entries(fields))body.set(key,String(value));
  for(const angle of photos.size?['Frente','Lado','Costas']:[]){
    const key=angle.toLowerCase();
    body.set(key,await jpeg(photos.get(angle)),key+'.jpg');
  }
  let response, result;
  try {
    response=await fetch(config.endpoint,{method:'POST',body,signal:AbortSignal.timeout(105000)});
    result=await response.json();
  }catch{
    throw Error('Não foi possível concluir a análise. Você ainda pode ver os demais indicadores.');
  }
  if(!response.ok&&typeof result?.message==='string')throw Error(result.message);
  if(response.ok&&!photos.size&&typeof result?.email_enviado==='boolean')return result;
  const {min,estimado,max}=result?.gordura??{};
  if(!response.ok||![min,estimado,max].every(Number.isFinite)||min<0||max>100||estimado<=0||
     estimado>=100||min>estimado||estimado>max)throw Error('A análise retornou uma faixa inválida.');
  return result;
}
