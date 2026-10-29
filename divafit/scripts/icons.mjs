import {mkdir,writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
function crc(bytes){let value=0xffffffff;for(const b of bytes){value^=b;for(let i=0;i<8;i++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;}
function chunk(type,data){const label=Buffer.from(type),length=Buffer.alloc(4),sum=Buffer.alloc(4);length.writeUInt32BE(data.length);sum.writeUInt32BE(crc(Buffer.concat([label,data])));return Buffer.concat([length,label,data,sum]);}
function pixel(x,y){
  const background=[81,49,79];
  const outer=x>=.30&&y>=.26&&y<=.74&&(x<=.48||((x-.48)**2+(y-.5)**2<=.24**2));
  const inner=x>=.39&&y>=.35&&y<=.65&&(x<=.48||((x-.48)**2+(y-.5)**2<=.15**2));
  const star=Math.abs(x-.70)+Math.abs(y-.26)<.065;
  return star?[198,228,208]:outer&&!inner?[255,255,255]:background;
}
function png(size){
  const raw=Buffer.alloc(size*(1+size*4));
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const rgb=[0,0,0];for(let sy=0;sy<3;sy++)for(let sx=0;sx<3;sx++){const c=pixel((x+(sx+.5)/3)/size,(y+(sy+.5)/3)/size);c.forEach((v,i)=>rgb[i]+=v/9);}
    const p=y*(1+size*4)+1+x*4;raw[p]=Math.round(rgb[0]);raw[p+1]=Math.round(rgb[1]);raw[p+2]=Math.round(rgb[2]);raw[p+3]=255;
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}
export async function buildIcons(destination){await mkdir(destination,{recursive:true});for(const [name,size]of [['icon-192.png',192],['icon-512.png',512],['maskable-512.png',512],['apple-touch-icon.png',180]])await writeFile(destination+'/'+name,png(size));}
