import {mkdir,copyFile} from 'node:fs/promises';
export async function buildIcons(destination){
  await mkdir(destination,{recursive:true});
  const source=new URL('../assets/brand/',import.meta.url);
  for(const [from,to] of [['divafit-192.png','divafit-192.png'],['divafit-512.png','divafit-512.png'],['divafit-maskable.png','divafit-maskable.png'],['divafit-apple.png','divafit-apple.png']])
    await copyFile(new URL(from,source),destination+'/'+to);
}
