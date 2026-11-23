import jpeg from 'npm:jpeg-js@0.4.4';
export async function resize(file:Blob) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  // Bound the decoder to avoid large allocations from compressed images.
  const decoded = jpeg.decode(bytes,{useTArray:true,maxResolutionInMP:16,maxMemoryUsageInMB:128});
  const scale = Math.min(1,1200/Math.max(decoded.width,decoded.height));
  const width = Math.max(1,Math.round(decoded.width*scale));
  const height = Math.max(1,Math.round(decoded.height*scale));
  const rgba = new Uint8Array(width*height*4);
  for (let y=0;y<height;y++) for (let x=0;x<width;x++) {
    const start = (Math.floor(y*decoded.height/height)*decoded.width+Math.floor(x*decoded.width/width))*4;
    rgba.set(decoded.data.subarray(start,start+4),(y*width+x)*4);
  }
  const image = jpeg.encode({data:rgba,width,height},82).data;
  if (image.length>2097152) throw Error('Imagem acima do limite');
  return image;
}
