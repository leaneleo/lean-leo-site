const card=document.querySelector('#app-install');
const install=document.querySelector('#install-app');
const help=document.querySelector('#install-help');
const guide=document.querySelector('#install-guide');
const connection=document.querySelector('#connection-state');
const standalone=window.matchMedia('(display-mode: standalone)');
let pendingInstall=null;
function installed(){return standalone.matches || navigator.standalone===true;}
function updateCard(){card.hidden=installed();}
updateCard();
standalone.addEventListener?.('change',updateCard);
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();pendingInstall=event;updateCard();
});
window.addEventListener('appinstalled',()=>{
  pendingInstall=null;card.hidden=true;guide.close();
});
function showGuide(){if(!guide.open)guide.showModal();}
help.addEventListener('click',showGuide);
document.querySelector('#close-install-guide').addEventListener('click',()=>guide.close());
install.addEventListener('click',async()=>{
  if(!pendingInstall){showGuide();return;}
  const prompt=pendingInstall;pendingInstall=null;install.disabled=true;
  try{await prompt.prompt();const choice=await prompt.userChoice;if(choice.outcome==='accepted')card.hidden=true;}
  catch{showGuide();}
  finally{install.disabled=false;}
});
function updateConnection(){connection.hidden=navigator.onLine;}
window.addEventListener('online',updateConnection);
window.addEventListener('offline',updateConnection);
updateConnection();
// Somente a página pública de desconexão, seu estilo e a logo são guardados. Sem cache de alunos,
// respostas da API, credenciais ou páginas autenticadas.
if('serviceWorker' in navigator && window.isSecureContext){
  navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{});
}
