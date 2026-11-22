// Encapsula a imagem da avaliação em uma página PDF, sem enviar dados ao servidor.
export function pdfFromJpeg(jpeg,width,height){
  const pageWidth=595;
  const pageHeight=Math.round(pageWidth*height/width);
  const encoder=new TextEncoder();
  const parts=[], offsets=[0];
  let length=0;
  const append=value=>{
    const bytes=typeof value==='string'?encoder.encode(value):value;
    parts.push(bytes);
    length+=bytes.byteLength;
  };
  const object=(header,stream)=>{
    offsets.push(length);
    append(offsets.length-1+' 0 obj\n'+header);
    if(stream){append('\nstream\n');append(stream);append('\nendstream');}
    append('\nendobj\n');
  };
  append('%PDF-1.4\n');
  object('<< /Type /Catalog /Pages 2 0 R >>');
  object('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Report 4 0 R >> >> /Contents 5 0 R >>`);
  object(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.byteLength} >>`,jpeg);
  const commands=encoder.encode(`q ${pageWidth} 0 0 ${pageHeight} 0 0 cm /Report Do Q`);
  object(`<< /Length ${commands.byteLength} >>`,commands);
  const xref=length;
  append('xref\n0 '+offsets.length+'\n0000000000 65535 f \n');
  for(const offset of offsets.slice(1))append(String(offset).padStart(10,'0')+' 00000 n \n');
  append(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts,{type:'application/pdf'});
}

export async function svgToPdf(svg,width,height){
  const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  try{
    const image=new Image();
    image.src=url;
    await image.decode();
    const canvas=document.createElement('canvas');
    canvas.width=width*2;
    canvas.height=height*2;
    canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
    const jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));
    if(!jpeg)throw Error('PDF indisponível.');
    return pdfFromJpeg(new Uint8Array(await jpeg.arrayBuffer()),canvas.width,canvas.height);
  }finally{
    URL.revokeObjectURL(url);
  }
}
