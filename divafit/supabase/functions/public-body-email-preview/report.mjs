import {PDFDocument,rgb} from 'npm:pdf-lib@1.17.1';
import fontkit from 'npm:@pdf-lib/fontkit@1.1.1';
import {avaliar,composicao,linhasMeta} from '../../../avaliacao/calculos.mjs';
import {perfilParcial,topicosParciais} from '../../../avaliacao/perfil-parcial.mjs';
import {parcialCopy} from '../../../avaliacao/parcial-textos.mjs';
import {email2Copy} from '../../../avaliacao/email2-textos.mjs';
import {trelloCopy,substituir} from '../../../avaliacao/email-textos.mjs';

const orange=rgb(.66,.22,.13), ink=rgb(.16,.13,.11), pale=rgb(1,.95,.92), white=rgb(1,1,1);
const n=(value,places=1)=>value.toLocaleString('pt-BR',{minimumFractionDigits:places,maximumFractionDigits:places});
export async function assessmentPdf(dados,nome,gordura,fontBytes,gaugeBytes){
  const report=await PDFDocument.create();
  report.registerFontkit(fontkit);
  const font=await report.embedFont(fontBytes);
  const gauge=await report.embedJpg(gaugeBytes);
  const result=avaliar(dados), profile=perfilParcial(dados), full=gordura!==null;
  const title=full?'Avaliação física completa':'Avaliação física parcial';
  report.setTitle(title);
  let page,y;
  function write(text,x,at,size,color=ink){
    page.drawText(String(text),{x,y:at,size,font,color});
  }
  function newPage(first=false){
    page=report.addPage([595,842]);
    page.drawRectangle({x:0,y:772,width:595,height:70,color:orange});
    write('Le&LeoFit',42,812,12,white);
    write(title,42,787,first?20:16,white);
    y=745;
  }
  function space(height){if(y-height<50)newPage();}
  function lines(text,size,max=510){
    const output=[];
    for(const paragraph of String(text).split('\n')){
      let row='';
      for(const word of paragraph.split(/\s+/).filter(Boolean)){
        const candidate=row?row+' '+word:word;
        if(row&&font.widthOfTextAtSize(candidate,size)>max){output.push(row);row=word;}else row=candidate;
      }
      if(row)output.push(row);
    }
    return output;
  }
  function paragraph(text,size=10){
    for(const line of lines(text,size)){space(size+5);write(line,42,y,size);y-=size+5;}
    y-=8;
  }
  function heading(text){space(44);write(text,42,y,15,orange);y-=25;}
  function cards(entries){
    for(let i=0;i<entries.length;i+=2){
      const row=entries.slice(i,i+2);
      const layout=row.map(([label,value])=>[lines(label,9,224),lines(value,11,224)]);
      const height=Math.max(...layout.map(([a,b])=>a.length*12+b.length*15))+19;
      space(height+9);
      layout.forEach(([labels,values],j)=>{
        const x=42+j*259;
        page.drawRectangle({x,y:y-height,width:252,height,color:pale});
        let at=y-14;
        for(const label of labels){write(label,x+10,at,9);at-=12;}
        for(const value of values){write(value,x+10,at,11,orange);at-=15;}
      });
      y-=height+9;
    }
  }
  newPage(true);
  paragraph(nome,13);
  page.drawImage(gauge,{x:197,y:y-108,width:201,height:108});
  y-=128;
  const imc='IMC '+n(result.imc)+' · '+result.categoria;
  write(imc,(595-font.widthOfTextAtSize(imc,15))/2,y,15,orange);
  y-=23;
  cards([
    ['Risco à saúde · IMC × cintura',result.risco],
    ['Nível de condicionamento',profile.minutos+' min/semana · '+profile.condicionamento],
    ['Sono',dados.sono+' h · '+profile.qualidadeSono],
    ['Alimentação',profile.nota+'/10 · '+profile.qualidadeAlimentacao]
  ]);
  const actions=email2Copy.body.match(/^O que fazer esta semana: .+$/gm);
  for(const [i,[label,advice]] of topicosParciais(dados,result,parcialCopy,Infinity).entries()){
    heading(label);
    for(const line of advice)paragraph(line.replace(/ 🧡$/u,''));
    if(!full)paragraph(actions[i]);
  }
  if(full){
    const c=composicao(dados,gordura);
    heading('Composição corporal e metas');
    cards([
      ['Idade',dados.idade+' anos'],['Altura',n(dados.altura,2)+' m'],['Peso',n(dados.peso)+' kg'],
      ['Cintura',dados.cintura===null?'Não informada':n(dados.cintura)+' cm'],
      ['Taxa metabólica de repouso',n(c.tmr,0)+' kcal/dia'],
      ['Gordura corporal',n(c.gordura)+'% · '+c.classeGordura],
      ['Massa magra',n(c.magra)+'% · '+n(c.magraKg,2)+' kg'],
      ['Massa gorda',n(100-c.magra)+'% · '+n(c.gorduraKg,2)+' kg'],
      ['IMLG',n(c.imlg)+' · '+c.classeImlg],
      ['Objetivo principal',c.objetivo],...linhasMeta(c)
    ]);
    paragraph(substituir(trelloCopy.avaliacao.messages[c.manter?3:c.gorduraMeta.kg?c.musculoMeta.kg?0:1:c.musculoMeta.kg?2:4],{
      nome,X:n(c.gorduraMeta.kg,2),D:n(c.gorduraMeta.dias),G:n(c.musculoMeta.gramas,0),D2:n(c.musculoMeta.dias)
    }));
    for(const footer of trelloCopy.avaliacao.footer)paragraph(footer.replace(/^🔒 /u,''),8);
  }else{
    paragraph(email2Copy.body.split('\n\n').at(-1));
    paragraph(email2Copy.footer.replace(/^🔒 /u,''),8);
  }
  return report.save();
}
