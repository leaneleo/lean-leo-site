import {Buffer} from 'node:buffer';
import jpeg from 'npm:jpeg-js@0.4.4';
import {avaliar} from '../../../avaliacao/calculos.mjs';
import {assessmentPdf} from './report.mjs';
import {shortEmail,fetchEbook,ebookFilename} from './template.mjs';

type Measures={weight:number;height:number;age:number;sex:string;waist:number|null;objective:string;nome?:string;modalidade?:string|string[];treinos?:number;tempoSentada?:number|string;sono?:number;alimentacao?:string[]};

function gauge(imc:number,band:number){
  const width=280,height=150,data=new Uint8Array(width*height*4);
  const palette=[[57,118,157],[50,124,87],[229,116,70],[207,80,55],[171,51,62],[114,45,75]];
  const bounds=[12,18.5,25,30,35,40,50];
  const segment=Math.max(.05,Math.min(.95,(imc-bounds[band])/(bounds[band+1]-bounds[band])));
  const direction=(band+segment)*Math.PI/6;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const dx=140-x,dy=134-y,distance=Math.hypot(dx,dy),angle=Math.atan2(dy,dx);
    const index=Math.min(5,Math.floor(angle*6/Math.PI));
    const along=dx*Math.cos(direction)+dy*Math.sin(direction);
    const cross=dy*Math.cos(direction)-dx*Math.sin(direction);
    const color=distance<=6||(along>=0&&along<=90&&Math.abs(cross)<=2)?[37,32,30]:
      angle>=0&&distance>=105&&distance<=120?palette[index]:[255,255,255];
    data.set([...color,255],(y*width+x)*4);
  }
  return Buffer.from(jpeg.encode({data,width,height},90).data).toString('base64');
}

let font:Promise<Uint8Array>|undefined;
function getFont(){
  font??=fetch('https://app.leeleo.com.br/assets/brand/comfortaa.ttf',{signal:AbortSignal.timeout(5000)}).then(async res=>{
    if(!res.ok)throw Error('comfortaa_unavailable');
    return new Uint8Array(await res.arrayBuffer());
  }).catch(error=>{font=undefined;throw error;});
  return font;
}
export async function sendAssessmentEmail(key:string,from:string,to:string,measures:Measures,gordura:number|null,id:string,checkout:string,ebookUrl:string,origin:string){
  const nome=measures.nome?.trim()||'Pessoa de Teste';
  const dados={idade:measures.age,altura:measures.height/100,peso:measures.weight,
    sexo:measures.sex==='feminino'?'F':'M',cintura:measures.waist,objetivo:measures.objective,modalidade:measures.modalidade,treinos:measures.treinos,tempoSentada:measures.tempoSentada,sono:measures.sono,alimentacao:measures.alimentacao};
  const r=avaliar(dados);
  const [fontBytes,ebook]=await Promise.all([getFont(),fetchEbook(ebookUrl)]);
  const pdf=await assessmentPdf(dados,nome,gordura,fontBytes,Buffer.from(gauge(r.imc,r.faixa),'base64'));
  const {subject,html}=shortEmail({nome,full:gordura!==null,ebookUrl,attached:Boolean(ebook),origin,checkout});
  const safeName=nome.replace(/[^\p{L}\p{N} -]/gu,'').trim().slice(0,80)||'Avaliação';
  const attachments=[{filename:'Avaliação-'+safeName+'.pdf',content:Buffer.from(pdf).toString('base64')}];
  if(ebook)attachments.push({filename:ebookFilename,content:Buffer.from(ebook).toString('base64')});
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',signal:AbortSignal.timeout(9000),
    headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'assessment-pdf-preview/'+id},
    body:JSON.stringify({from,to:[to],subject,html,attachments})
  });
  const receipt=response.ok?await response.json():null;
  const emailId=typeof receipt?.id==='string'?receipt.id:null;
  console.info(JSON.stringify({event:'assessment_pdf_preview_email',full:gordura!==null,status:response.status,emailId,pdfBytes:pdf.length,ebookAttached:Boolean(ebook)}));
  return {emailId,status:response.status,ebookAttached:Boolean(ebook),pdfBytes:pdf.length};
}
