import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import jpeg from 'npm:jpeg-js@0.4.4';
import {encodeBase64} from 'jsr:@std/encoding@1.0.10/base64';
import {ANGLES,MODEL,SYSTEM,createHandler} from './handler.mjs';

const url = Deno.env.get('SUPABASE_URL') ?? '';
const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
const serviceKey = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const client = createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const storage = client.storage.from('body-photos');
const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');

async function rpc(name:string,args:Record<string,unknown>) {
  const {data,error} = await client.rpc(name,args);
  if (error) throw Error('Operação indisponível');
  return data;
}

async function resize(file:Blob) {
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

Deno.serve(createHandler({
  async teamUser(authorization:string) {
    const {data,error} = await client.auth.getUser(authorization.slice(7));
    if (error || !data.user) return null;
    const member = await client.from('team_members').select('user_id').eq('user_id',data.user.id).maybeSingle();
    if (member.error) throw member.error;
    return member.data?.user_id ?? null;
  },
  async hasConsent(student:string) {
    const result = await client.from('body_analysis_consents').select('student_id').eq('student_id',student).maybeSingle();
    if (result.error) throw result.error;
    return Boolean(result.data);
  },
  async previousApproved(student:string) {
    const {data,error} = await client.from('body_analyses').select('reviewed_values')
      .eq('student_id',student).eq('status','aprovado').order('created_at',{ascending:false}).limit(1).maybeSingle();
    if (error) throw error;
    return data?.reviewed_values ?? undefined;
  },
  ready:()=>Boolean(anthropicKey),
  resize,
  begin:(id:string,student:string,actor:string)=>rpc('body_analysis_begin',{p_id:id,p_student:student,p_actor:actor}),
  async upload(path:string,bytes:Uint8Array) {
    const {error} = await storage.upload(path,bytes,{contentType:'image/jpeg',cacheControl:'0',upsert:false});
    if (error) throw error;
  },
  async signedPhotos(id:string) {
    const {data,error} = await client.from('body_analyses').select('photo_paths,student_id').eq('id',id).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const consent = await client.from('body_analysis_consents').select('student_id').eq('student_id',data.student_id).maybeSingle();
    if (consent.error) throw consent.error;
    if (!consent.data) return null;
    const signed = await storage.createSignedUrls(data.photo_paths,60);
    if (signed.error || signed.data.some(item=>!item.signedUrl)) throw Error('Fotos indisponíveis');
    return signed.data.map(item=>item.signedUrl);
  },
  async cleanUncommitted(id:string,paths:string[]) {
    // An interrupted response can hide a successful commit. Check before deleting.
    const {data,error} = await client.from('body_analyses').select('id').eq('id',id).maybeSingle();
    if (!error && !data) await storage.remove(paths);
  },
  finish:(id:string,actor:string,data:unknown)=>rpc('body_analysis_finish',{p_id:id,p_actor:actor,p_data:data}),
  async call(photos:Uint8Array[],measures:unknown,attempt:number) {
    const content = photos.flatMap((bytes,index)=>[
      {type:'text',text:ANGLES[index]},
      {type:'image',source:{type:'base64',media_type:'image/jpeg',data:encodeBase64(bytes)}}
    ]);
    content.push({type:'text',text:JSON.stringify(measures)+(attempt?'\nRetorne somente o JSON corrigido.':'')});
    const response = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',signal:AbortSignal.timeout(45000),
      headers:{'content-type':'application/json','x-api-key':anthropicKey!,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:MODEL,max_tokens:1800,system:SYSTEM,messages:[{role:'user',content}]})
    });
    if (!response.ok) throw Error('Serviço de estimativa indisponível');
    return response.json();
  }
}));
