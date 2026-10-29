import {mkdir,copyFile,writeFile,readdir,stat} from 'node:fs/promises';
import {buildIcons} from './icons.mjs';
const url=process.env.DIVAFIT_SUPABASE_URL||'', key=process.env.DIVAFIT_SUPABASE_PUBLIC_KEY||'';
if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) throw Error('URL Supabase inválida');
if(key.startsWith('sb_secret_'))throw Error('Use somente a chave pública');
if(key.split('.').length===3){try{const payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));if(payload.role==='service_role')throw Error('Uma chave administrativa não pode ser publicada')}catch(e){throw e}}
await mkdir('public',{recursive:true});
for(const file of ['index.html','style.css','student-style.css','app.js','production-domain.js','production-ui.js','student-domain.js','student-ui.js','domain.js','api.js','forms-domain.js','forms-ui.js'])await copyFile(file,'public/'+file);
for(const file of ['brand.css','manifest.webmanifest','mobile.js','mobile.css','sw.js','offline.html','offline.css'])await copyFile(file,'public/'+file);
await buildIcons('public/icons');
await writeFile('public/config.js','window.DIVAFIT_CONFIG = '+JSON.stringify({supabaseUrl:url,supabaseKey:key})+';');
// Apenas mídia pública; documentos e dados de alunos não fazem parte do site.
async function copyMedia(source, destination) {
  let entries; try { entries=await readdir(source,{withFileTypes:true}); }
  catch(error) { if(error.code==='ENOENT') return; throw error; }
  for(const entry of entries) {
    if(entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
    const from=source+'/'+entry.name, to=destination+'/'+entry.name;
    if(entry.isDirectory()) await copyMedia(from,to);
    else if(/\.(png|jpe?g|webp|avif|gif|svg|mp4|webm)$/i.test(entry.name)) {
      if((await stat(from)).size>50*1024*1024) throw Error('Mídia maior que 50 MB: '+from);
      await mkdir(destination,{recursive:true}); await copyFile(from,to);
    }
  }
}
await copyMedia('assets','public/assets');
await mkdir('public/assets/brand',{recursive:true});
for(const file of ['comfortaa.ttf','OFL.txt'])await copyFile('assets/brand/'+file,'public/assets/brand/'+file);
console.log(url&&key?'Interface preparada. Valide o banco antes de usar dados reais.':'Interface preparada em modo de apresentação, sem conexão ou dados.');
