import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildIcons} from '../scripts/icons.mjs';
const source=await readFile(new URL('../sw.js',import.meta.url),'utf8');
function worker(fetchResult){
  const handlers={},stored=[],matches=[];
  vm.runInNewContext(source,{
    URL,
    self:{location:{origin:'https://divafit.test'},addEventListener:(event,fn)=>handlers[event]=fn},
    fetch:fetchResult,
    caches:{open:async()=>({addAll:async files=>stored.push(...files)}),keys:async()=>[],delete:async()=>true,match:async url=>{matches.push(url);return 'offline-page';}}
  });
  return {handlers,stored,matches};
}
test('o cache contém somente a página de reconexão, seu estilo e a logo pública',async()=>{
  const w=worker(async()=>{});let promise;
  w.handlers.install({waitUntil:p=>promise=p});await promise;
  assert.deepEqual(w.stored,['/offline.html','/offline.css','/assets/brand/bannerdivafit.png']);
});
test('API, config, scripts e requisições de escrita não são interceptados',()=>{
  const w=worker(()=>{throw Error('não deve buscar');});
  for(const request of [
    {url:'https://project.supabase.co/rest/v1/students',method:'GET',mode:'cors'},
    {url:'https://divafit.test/config.js',method:'GET',mode:'same-origin'},
    {url:'https://divafit.test/app.js',method:'GET',mode:'same-origin'},
    {url:'https://divafit.test/save',method:'POST',mode:'same-origin'}
  ])w.handlers.fetch({request,respondWith:()=>assert.fail('dados não devem entrar no worker')});
});
test('ao abrir sem rede mostra a página de reconexão, sem dados de alunos',async()=>{
  const w=worker(async()=>{throw Error('offline');});let result;
  w.handlers.fetch({request:{url:'https://divafit.test/',method:'GET',mode:'navigate'},respondWith:p=>result=p});
  assert.equal(await result,'offline-page');assert.deepEqual(w.matches,['/offline.html']);
});
test('a navegação conectada usa a resposta atual da rede',async()=>{
  const w=worker(async()=>'current-page');let result;
  w.handlers.fetch({request:{url:'https://divafit.test/',method:'GET',mode:'navigate'},respondWith:p=>result=p});
  assert.equal(await result,'current-page');assert.equal(w.matches.length,0);
});
test('manifesto e ícones PNG têm as dimensões necessárias para instalação',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'/');
  const dir=await mkdtemp(path.join(tmpdir(),'divafit-icons-'));
  try{
    await buildIcons(dir);
    for(const icon of manifest.icons){
      const bytes=await readFile(path.join(dir,path.basename(icon.src)));
      assert.equal(bytes.subarray(1,4).toString(),'PNG');
      const [width,height]=icon.sizes.split('x').map(Number);
      assert.equal(bytes.readUInt32BE(16),width);assert.equal(bytes.readUInt32BE(20),height);
    }
    for(const [legacy,current]of [['icon-192.png','divafit-silhueta-20261029-192.png'],['leanleo-192.png','divafit-silhueta-20261029-192.png'],['divafit-512.png','divafit-silhueta-20261029-512.png']])
      assert.deepEqual(await readFile(path.join(dir,legacy)),await readFile(path.join(dir,current)));
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('instalação permanece disponível no navegador após instalar e oculta no modo aplicativo',async()=>{
  const source=await readFile(new URL('../mobile.js',import.meta.url),'utf8');
  function mount(standalone=false){
    const handlers={},elements={};
    for(const id of ['app-install','install-app','install-help','install-guide','connection-state','close-install-guide'])elements[id]={hidden:false,disabled:false,open:false,events:{},addEventListener(name,fn){this.events[name]=fn;},close(){this.open=false;},showModal(){this.open=true;}};
    vm.runInNewContext(source,{
      document:{querySelector:selector=>elements[selector.slice(1)]},
      window:{matchMedia:()=>({matches:standalone,addEventListener(){}}),addEventListener:(name,fn)=>handlers[name]=fn,isSecureContext:false},
      navigator:{onLine:true}
    });
    return {handlers,elements};
  }
  const browser=mount();
  browser.handlers.appinstalled();
  assert.equal(browser.elements['app-install'].hidden,false);
  browser.handlers.beforeinstallprompt({preventDefault(){},prompt:async()=>{},userChoice:Promise.resolve({outcome:'accepted'})});
  await browser.elements['install-app'].events.click();
  assert.equal(browser.elements['app-install'].hidden,false);
  await browser.elements['install-app'].events.click();
  assert.equal(browser.elements['install-guide'].open,true);
  assert.equal(mount(true).elements['app-install'].hidden,true);
});
test('o acesso à instalação fica depois do conteúdo, no rodapé',async()=>{
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(html.indexOf('id="app-install"')>html.indexOf('id="app"'));
  assert.match(html,/Instalar DivaFit no celular/);
  assert.match(html,/Revisar atualização do app/);
});
