import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.PGLITE_MODULE_PATH||'@electric-sql/pglite');const db=new PGlite();
const admin='10000000-0000-4000-8000-000000000001',trainer='10000000-0000-4000-8000-000000000002';
await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;");
await db.query('insert into auth.users values($1),($2)',[admin,trainer]);
for(const path of ['supabase/migrations/001_divafit.sql','supabase/financeiro.sql','supabase/financeiro_painel.sql','supabase/financeiro_participantes.sql'])await db.exec(await readFile(new URL('../'+path,import.meta.url),'utf8'));
await db.query("insert into public.team_members values($1,'Administrador','admin'),($2,'Treinadora','trainer')",[admin,trainer]);
const one=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0],deny=f=>assert.rejects(f,e=>e.code==='42501');
await deny(()=>one('select finance_catalog()'));await db.exec("set request.jwt.claim.sub='"+trainer+"'");await deny(()=>one('select finance_catalog()'));await deny(()=>one("select finance_closings('2026-11-01')"));
await db.exec("set request.jwt.claim.sub='"+admin+"'");
const a=await one("select finance_client_create('leandro','Aluno A','a',11000,'2026-01-01')"),b=await one("select finance_client_create('leandro','Aluno B','b',9000,'2026-01-01')"),group=await one("select finance_client_create('leandro','Dupla','grupo',17000,'2026-01-01')");
const request='20000000-0000-4000-8000-000000000001';
const items=[{client_id:group,participants:[a,b],note:'Dupla conferida'}],sql="select finance_classes_register($1,'leandro','2026-11-18',$2)";
await one(sql,[request,JSON.stringify(items)]);await one(sql,[request,JSON.stringify(items)]);assert.equal(await one('select count(*)::int from private.finance_entries'),1);assert.equal(await one('select sum(cents)::int from private.finance_entries'),17000,'grupo cobrado uma vez');
await assert.rejects(()=>one("select finance_classes_register($1,'leandro','2026-11-18',$2)",['20000000-0000-4000-8000-000000000002',JSON.stringify([{client_id:a,participants:[a]},{client_id:b,participants:[a]}])]));
await one("select finance_rate_save($1,'2026-12-01',12000)",[a]);assert.equal(await one('select sum(cents)::int from private.finance_entries'),17000,'reajuste não altera passado');await assert.rejects(()=>one("select finance_rate_save($1,'2026-12-01',13000)",[a]));
await db.query("insert into private.finance_contacts(bucket,name,client_codes,address) values('leandro','Família fictícia',array['a','b','grupo'],'Doutor Aluno A')");

await db.exec(await readFile(new URL('../supabase/financeiro_fechamentos_nomes.sql',import.meta.url),'utf8'));
let closings=await one("select finance_closings('2026-11-01')");
assert.equal(closings[0].snapshot.format_version,2);assert.equal(closings[0].snapshot.total_cents,17000);assert.equal(closings[0].snapshot.rows[0].people.length,2);assert.equal(closings[0].snapshot.unknown,0);
await one('select finance_closing_approve($1,$2)',[closings[0].id,closings[0].version]);
// Um código antigo de grupo sem participantes não vira uma composição inventada.
await db.query("insert into private.finance_entries(request_id,client_id,bucket,kind,day,cents,status) values(gen_random_uuid(),$1,'leandro','aula','2026-11-02',17000,'confirmado')",[group]);
closings=await one("select finance_closings('2026-11-01')");assert.equal(closings[0].status,'rascunho');assert.equal(closings[0].snapshot.unknown,1);
await assert.rejects(()=>one('select finance_closing_approve($1,$2)',[closings[0].id,closings[0].version]));
// Mapeamento confirmado resolve o código antigo e junta a mesma composição.
await db.exec(`update private.finance_contacts set source='{"closing":{"legacy_codes":{"grupo":["a","b"]},"people":{"a":{"name":"Nome de uso","gender":"m"}},"recipient":"a"},"calculator":{"people":["a","b"]}}'::jsonb`);
closings=await one("select finance_closings('2026-11-01')");assert.equal(closings[0].snapshot.unknown,0);assert.equal(closings[0].snapshot.rows.length,1);assert.equal(closings[0].snapshot.rows[0].quantity,2);assert.equal(closings[0].snapshot.rows[0].people[0].name,'Nome de uso');assert(closings[0].snapshot.rows[0].people[0].recipient);
// Cancelado e arquivado não entram; cancelar tudo invalida o fechamento anterior.
await db.exec("update private.finance_entries set status='cancelado'");
closings=await one("select finance_closings('2026-11-01')");assert.equal(closings[0].snapshot.rows.length,0);assert.equal(closings[0].snapshot.total_cents,0);assert.equal(closings[0].status,'rascunho');
assert.equal(await one('select count(*)::int from private.finance_entries'),2);
await db.exec("set request.jwt.claim.sub='"+trainer+"';set role authenticated");await deny(()=>one("select finance_closings('2026-11-01')"));
console.log('SQL: participantes, composição legada confirmada, pendências, aprovação invalidada, cancelamento, histórico e permissão verificados.');await db.close();
