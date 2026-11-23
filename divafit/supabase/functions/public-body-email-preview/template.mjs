import {blackCheckoutAt,blackConsultoriaAt} from '../../../avaliacao/black-campaign.mjs';
import {trelloCopy,escapar} from '../../../avaliacao/email-textos.mjs';
import {email2Copy} from '../../../avaliacao/email2-textos.mjs';

export const ebookLimit=3_000_000;
export const ebookFilename='E-book · Os 7 segredos da definição muscular.pdf';
export function shortEmail({nome,full,ebookUrl,attached,origin,checkout,now=new Date()}){
  const firstName=nome.trim().split(/\s+/)[0]||'';
  const p=s=>'<p>'+escapar(s).replaceAll('\n','<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')+'</p>';
  const button=(label,url,color='#a23822')=>'<p><a style="display:inline-block;background:'+color+';color:white;padding:11px 15px;border-radius:8px;text-decoration:none" href="'+escapar(url)+'">'+escapar(label)+'</a></p>';
  const opening=full?'Sua avaliação completa está aqui no anexo, em PDF. Abre com calma: tem seu percentual de gordura, sua massa magra e as metas calculadas para você.':
    'Sua avaliação parcial está aqui no anexo, em PDF. Lá tem seu IMC, seu risco à saúde, seu nível de condicionamento, sono e alimentação, com o que fazer em cada um.';
  const gift=ebookUrl?p('🎁 E o presente que a gente prometeu: o e-book **Os 7 segredos da definição muscular**'+(attached?', também em anexo.':'.'))+
    (attached?'':button('Baixar meu e-book',ebookUrl)):'';
  const consultation=p(trelloCopy.avaliacao.offer)+p('🔸 '+(blackConsultoriaAt(now)?'dieta e planilha de corrida inclusas na Black (até 30/11)':'planilha de corrida (opcional, com valor adicional)'))+button(trelloCopy.avaliacao.button,origin+'/checkout/divafit/');
  const challenge='<section style="padding:18px;background:#191211;color:#fff7f2;border:1px solid #a23822;border-radius:12px">'+
    email2Copy.offer.split('\n\n').map(block=>block.startsWith('[Botão]')?button('Quero entrar no Desafio',blackCheckoutAt(checkout,now)||origin+'/desafio-21-dias/'):p(block)).join('')+'</section>';
  const footer=full?trelloCopy.avaliacao.footer.slice(0,3).map(p).join(''):p(email2Copy.footer);
  return {
    subject:firstName+', sua avaliação '+(full?'física':'parcial')+' chegou 🧡',
    html:'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><body style="font:16px Comfortaa,Arial,sans-serif;color:#29201d"><main style="max-width:560px;margin:auto;padding:20px">'+
      p('Oi, '+firstName+'!')+p(opening)+gift+(full?consultation:challenge)+p('Leandro e Leonardo · Le&LeoFit')+footer+'</main></body></html>'
  };
}

export async function fetchEbook(url,fetcher=fetch){
  if(!url)return null;
  let download;
  try{
    const parsed=new URL(url);
    if(parsed.protocol!=='https:'||parsed.username||parsed.password)return null;
    const id=parsed.hostname==='drive.google.com'&&parsed.pathname.match(/^\/file\/d\/([A-Za-z0-9_-]+)\/view\/?$/)?.[1];
    download=id?'https://drive.google.com/uc?export=download&id='+id:parsed.href;
  }catch{return null;}
  try{
    const response=await fetcher(download,{signal:AbortSignal.timeout(5000)});
    if(!response.ok||!response.body)return null;
    if(Number(response.headers.get('content-length'))>ebookLimit){await response.body.cancel();return null;}
    const reader=response.body.getReader();
    const chunks=[];
    let bytes=0;
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      bytes+=value.length;
      if(bytes>ebookLimit){await reader.cancel();return null;}
      chunks.push(value);
    }
    const result=new Uint8Array(bytes);
    let offset=0;
    for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}
    return new TextDecoder().decode(result.subarray(0,5))==='%PDF-'?result:null;
  }catch{return null;}
}
