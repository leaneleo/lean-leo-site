import {Buffer} from 'node:buffer';
import jpeg from 'npm:jpeg-js@0.4.4';
import {avaliar} from '../../../avaliacao/calculos.mjs';
import {emailParcial} from '../../../avaliacao/email-parcial.mjs';
import {email2Copy} from '../../../avaliacao/email2-textos.mjs';
import {substituir} from '../../../avaliacao/email-textos.mjs';
import {emailAvaliacao,assuntoAvaliacao} from '../../../avaliacao/email.mjs';

type Measures={weight:number;height:number;age:number;sex:string;waist:number|null;objective:string;nome?:string;modalidade?:string|string[];treinos?:number;tempoSentada?:number;sono?:number;alimentacao?:string[]};

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

export async function sendAssessmentEmail(key:string,from:string,to:string,measures:Measures,gordura:number|null,id:string,checkout:string,ebookUrl:string,origin:string){
  const dados={idade:measures.age,altura:measures.height/100,peso:measures.weight,
    sexo:measures.sex==='feminino'?'F':'M',cintura:measures.waist,objetivo:measures.objective,modalidade:measures.modalidade,treinos:measures.treinos,tempoSentada:measures.tempoSentada,sono:measures.sono,alimentacao:measures.alimentacao};
  const r=avaliar(dados);
  const response=await fetch('https://api.resend.com/emails',{
    method:'POST',signal:AbortSignal.timeout(9000),
    headers:{Authorization:'Bearer '+key,'Content-Type':'application/json','Idempotency-Key':'body-assessment/'+id},
    body:JSON.stringify({from,to:[to],subject:gordura===null?substituir(email2Copy.subject,{nome:measures.nome??''}):assuntoAvaliacao(measures.nome??''),
      html:gordura===null?emailParcial(dados,{nome:measures.nome??'',checkout:checkout||origin+'/desafio-21-dias/',ebookUrl}):emailAvaliacao(dados,{gordura,nome:measures.nome??'',checkout:origin+'/checkout/divafit/',ebookUrl}),
      attachments:[{filename:'velocimetro-imc.jpg',content:gauge(r.imc,r.faixa),content_id:'imc-gauge'}]})
  });
  const receipt=response.ok?await response.json():null;
  console.info(JSON.stringify({event:'assessment_email_response',mode:gordura===null?'without_photos':'with_photos',status:response.status,
    emailId:typeof receipt?.id==='string'?receipt.id:undefined}));
  return response.ok&&typeof receipt?.id==='string';
}
