import {mkdir,copyFile} from 'node:fs/promises';
export async function buildIcons(destination){
  await mkdir(destination,{recursive:true});
  const source=new URL('../assets/brand/',import.meta.url);
  for(const [from,to] of [['divafit-192.png','divafit-silhueta-20261029-192.png'],['divafit-512.png','divafit-silhueta-20261029-512.png'],['divafit-maskable.png','divafit-silhueta-20261029-maskable.png'],['divafit-apple.png','divafit-silhueta-20261029-apple.png']])
    await copyFile(new URL(from,source),destination+'/'+to);
  // Instalações antigas podem consultar os caminhos anteriores: servir sempre
  // a silhueta atual, nunca o D roxo ou o avatar Lean&LeoFit.
  for(const prefix of ['', 'leanleo-', 'divafit-']){
    const names=prefix?['192.png','512.png','maskable.png','apple.png']:['icon-192.png','icon-512.png','maskable-512.png','apple-touch-icon.png'];
    for(const [index,from]of ['divafit-192.png','divafit-512.png','divafit-maskable.png','divafit-apple.png'].entries())
      await copyFile(new URL(from,source),destination+'/'+prefix+names[index]);
  }
}
