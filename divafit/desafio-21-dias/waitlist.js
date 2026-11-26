const config=window.DIVAFIT_WAITLIST;
const form=document.querySelector('#waitlist');
const button=form.querySelector('button');
const status=document.querySelector('#waitlist-status');
let token='', widget;
if(config?.preview){
  button.disabled=false;
  status.textContent='Prévia · use dados fictícios.';
}else if(config?.sitekey){
  const script=document.createElement('script');
  script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  const clear=()=>{token='';button.disabled=true;};
  script.onload=()=>{widget=window.turnstile.render('#challenge',{
    sitekey:config.sitekey,action:'desafio_waitlist',
    callback:value=>{token=value;button.disabled=false;},
    'expired-callback':clear,'error-callback':clear
  });};
  document.head.append(script);
}
form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(button.disabled)return;
  if(config?.preview){status.textContent='Simulação concluída · nenhum dado enviado.';form.reset();return;}
  if(!token||!config?.endpoint)return;
  button.disabled=true;
  try{
    const response=await fetch(config.endpoint,{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({...Object.fromEntries(new FormData(form)),challenge:token}),signal:AbortSignal.timeout(18000)});
    if(!response.ok)throw Error();
    form.reset();
    status.textContent='Inscrição recebida.';
  }catch{status.textContent='Não foi possível concluir a inscrição. Tente novamente.';}
  finally{token='';if(widget!==undefined)window.turnstile.reset(widget);}
});
