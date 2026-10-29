import {mkdir,copyFile} from 'node:fs/promises';
export async function buildIcons(destination){
  await mkdir(destination,{recursive:true});
  const source=new URL('../assets/brand/',import.meta.url);
  for(const [from,to] of [['icon-192.png','leanleo-192.png'],['icon-512.png','leanleo-512.png'],['maskable-512.png','leanleo-maskable.png'],['apple-touch-icon.png','leanleo-apple.png']])
    await copyFile(new URL(from,source),destination+'/'+to);
}
