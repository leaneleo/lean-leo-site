const origin = 'https://app.leeleo.com.br';
const env = (key: string) => Deno.env.get(key) ?? '';

Deno.serve(async req => {
  if (req.headers.get('origin') !== origin) return new Response(null, {status: 403});
  const headers = {'access-control-allow-origin':origin, 'access-control-allow-methods':'POST, OPTIONS',
    'access-control-allow-headers':'content-type', 'content-type':'application/json', 'cache-control':'no-store', vary:'Origin'};
  const reply = (status: number) => new Response(JSON.stringify({ok:status===200}), {status,headers});
  if (req.method==='OPTIONS') return new Response(null,{status:204,headers});
  if (req.method!=='POST') return reply(405);
  try {
    const reader=req.body?.getReader();
    if(!reader)return reply(400);
    const decoder=new TextDecoder();
    let input='',size=0;
    for(;;){
      const {done,value}=await reader.read();
      if(done)break;
      size+=value.byteLength;
      if(size>4096){await reader.cancel();return reply(413);}
      input+=decoder.decode(value,{stream:true});
    }
    const data=JSON.parse(input+decoder.decode());
    const name=String(data.name??'').trim(), email=String(data.email??'').trim().toLowerCase();
    let phone=String(data.phone??'').replace(/\D/g,'');
    if(phone.length===10||phone.length===11)phone='55'+phone;
    if(name.length<2||name.length>120||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||!/^55\d{10,11}$/.test(phone)||
       typeof data.challenge!=='string'||data.challenge.length>2048)return reply(400);
    const secret=env('PUBLIC_BODY_TURNSTILE_SECRET'), key=env('SUPABASE_SERVICE_ROLE_KEY'), url=env('SUPABASE_URL');
    if(!secret||!key||!url)return reply(503);
    const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{
      method:'POST',body:new URLSearchParams({secret,response:data.challenge}),signal:AbortSignal.timeout(8000)});
    if(!verify.ok)return reply(503);
    const captcha=await verify.json();
    if(!captcha.success||captcha.hostname!=='app.leeleo.com.br'||captcha.action!=='desafio_waitlist')return reply(400);
    const result=await fetch(url+'/rest/v1/rpc/crm_record_desafio_janeiro',{
      method:'POST',headers:{apikey:key,authorization:'Bearer '+key,'content-type':'application/json'},
      body:JSON.stringify({p_name:name,p_email:email,p_phone:phone}),signal:AbortSignal.timeout(8000)});
    return reply(result.ok?200:503);
  } catch {return reply(503);}
});
