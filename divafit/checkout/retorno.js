// Página de retorno: confere o pagamento na InfinitePay (pelo servidor) e só então libera o formulário de avaliação.
const c=window.DIVAFIT_CONFIG||{},p=new URLSearchParams(location.search);
const $=s=>document.querySelector(s),card=$('#card'),title=$('#title'),result=$('#result'),form=$('#form'),verify=$('#verify'),note=$('#note');
const dados={order_nsu:p.get('order_nsu'),transaction_nsu:p.get('transaction_nsu'),slug:p.get('slug')};
let tentativas=0,timer=null;

function estado(nome,t,msg){card.dataset.state=nome;title.textContent=t;result.textContent=msg}

function confirmado(){
 clearTimeout(timer);
 estado('ok','Pagamento confirmado! Bem-vinda à DIVAFIT 🧡','Agora falta só um passo para a gente montar seu treino: a sua avaliação inicial.');
 $('#s1').className='done';$('#s1t').textContent='confirmado';$('#s2').className='now';
 form.hidden=false;verify.hidden=true;note.hidden=false;
}

function aguardando(){
 estado('wait','Seu pagamento ainda está sendo processado','Às vezes a confirmação demora alguns minutos. Se você já pagou, fique tranquila: assim que confirmar, nossa equipe te chama no WhatsApp.');
 $('#s1t').textContent='aguardando';verify.hidden=false;
}

async function conferir(){
 verify.disabled=true;
 try{
  const r=await fetch(c.supabaseUrl+'/functions/v1/divafit-checkout?route=confirm',{method:'POST',headers:{'content-type':'application/json',apikey:c.supabaseKey},body:JSON.stringify(dados)});
  const d=await r.json().catch(()=>({}));
  if(r.ok&&d.confirmed)return confirmado();
 }catch{}
 finally{verify.disabled=false}
 // Confere sozinha a cada 4 s por cerca de 1 minuto antes de pedir para a cliente tentar de novo.
 if(++tentativas<15){timer=setTimeout(conferir,4000)}else aguardando();
}

verify.addEventListener('click',()=>{tentativas=0;estado('checking','Conferindo de novo…','Só um instante.');verify.hidden=true;conferir()});

if(dados.order_nsu&&dados.transaction_nsu&&dados.slug)conferir();
else estado('wait','Não encontramos os dados do pagamento','Se você concluiu o pagamento, fique tranquila: nossa equipe confere e te chama no WhatsApp.');
