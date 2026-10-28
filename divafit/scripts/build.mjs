import {mkdir,copyFile,writeFile} from 'node:fs/promises';
const url=process.env.DIVAFIT_SUPABASE_URL||'', key=process.env.DIVAFIT_SUPABASE_PUBLIC_KEY||'';
if (url && !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) throw Error('URL Supabase inválida');
if(key.startsWith('sb_secret_'))throw Error('Use somente a chave pública');
if(key.split('.').length===3){try{const payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url'));if(payload.role==='service_role')throw Error('Uma chave administrativa não pode ser publicada')}catch(e){throw e}}
await mkdir('public',{recursive:true});
for(const file of ['index.html','style.css','app.js','production-domain.js','production-ui.js','domain.js','api.js'])await copyFile(file,'public/'+file);
await writeFile('public/config.js','window.DIVAFIT_CONFIG = '+JSON.stringify({supabaseUrl:url,supabaseKey:key})+';');
console.log(url&&key?'Interface preparada. Valide o banco antes de usar dados reais.':'Interface preparada em modo de apresentação, sem conexão ou dados.');
