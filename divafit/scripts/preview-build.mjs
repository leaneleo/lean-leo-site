import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('public'),port=Number(process.env.PORT||5173);
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4'};
http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))throw Error();
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
  }catch{res.writeHead(404);res.end('Não encontrado');}
}).listen(port,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:'+port));
