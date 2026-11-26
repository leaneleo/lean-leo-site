import {trelloCopy,escapar} from '../../../avaliacao/email-textos.mjs';
import {email2Copy} from '../../../avaliacao/email2-textos.mjs';

import {blackConsultoria} from '../../../avaliacao/black-consultoria.mjs';

export function shortEmail({nome,full,ebookUrl,origin,now=Date.now()}){
  const firstName=nome.trim().split(/\s+/)[0]||'';
  const p=s=>'<p>'+escapar(s).replaceAll('\n','<br>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')+'</p>';
  const button=(label,url,color='#a23822')=>'<p><a style="display:inline-block;background:'+color+';color:white;padding:11px 15px;border-radius:8px;text-decoration:none" href="'+escapar(url)+'">'+escapar(label)+'</a></p>';
  const opening=full?'Sua avaliação completa está aqui no anexo, em PDF. Abre com calma: tem seu percentual de gordura, sua massa magra e as metas calculadas para você.':
    'Sua avaliação parcial está aqui no anexo, em PDF. Lá tem seu IMC, seu risco à saúde, seu nível de condicionamento, sono e alimentação, com o que fazer em cada um.';
  const gift=ebookUrl?p('🎁 E o presente que a gente prometeu: o e-book **Os 7 segredos da definição muscular**'+'.')+
    button('Baixar meu e-book',ebookUrl):'';
  const consultation=p("Se quiser um plano feito só para você chegar lá, com:\n🔸 aplicativo\n🔸 treino personalizado, na academia ou em casa\n🔸 ajustes conforme a sua evolução\n🔸 suporte direto com a gente\n🔸 um brinde surpresa entregue na sua casa 🎁\n🔸 planilha de corrida (opcional, com valor adicional)")+button(trelloCopy.avaliacao.button,origin+'/checkout/divafit/');
  const offer=now>=Date.parse('2026-11-27T00:00:00-03:00')&&now<Date.parse('2026-12-01T00:00:00-03:00')
    ? '<section style="padding:18px;background:#191211;color:#fff7f2;border:1px solid #a23822;border-radius:12px">'+
      blackConsultoria.split('\n\n').map(p).join('')+button('Quero minha consultoria',origin+'/checkout/divafit/')+'</section>'
    : '';
  const waitlist='<section style="padding:18px;background:#191211;color:#fff7f2;border:1px solid #a23822;border-radius:12px">'+
    p('**Prefere começar em grupo?**')+
    p('O Desafio volta em janeiro, de 04 a 24/01/2027. As vagas abrem em pequenos lotes.')+
    button('Quero entrar na lista de espera',origin+'/desafio-21-dias/')+'</section>';
  const footer=full?trelloCopy.avaliacao.footer.slice(0,3).map(p).join(''):p(email2Copy.footer);
  return {
    subject:firstName+', sua avaliação '+(full?'física':'parcial')+' chegou 🧡',
    html:'<!doctype html><html lang="pt-BR"><meta charset="utf-8"><body style="font:16px Comfortaa,Arial,sans-serif;color:#29201d"><main style="max-width:560px;margin:auto;padding:20px">'+
      p('Oi, '+firstName+'!')+p(opening)+gift+(full?consultation:offer+waitlist)+p('Leandro e Leonardo · Le&LeoFit')+footer+'</main></body></html>'
  };
}

