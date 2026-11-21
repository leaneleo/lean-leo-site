"""Prepara SQL para revisão; não conecta ao banco.
Uso: python scripts/prepare-finance-import.py importacao.json operador_uuid /pasta/privada/importacao.sql
Os arquivos de entrada e saída contêm dados financeiros privados. Nunca versionar/publicar.
"""
import sys,json,uuid
from pathlib import Path

def literal(v):
    return "'"+json.dumps(v,ensure_ascii=False).replace("'","''")+"'::jsonb"

def prepare(data,actor):
    actor=str(uuid.UUID(actor))
    parts=["begin;","select set_config('request.jwt.claim.sub','"+actor+"',true);","select private.finance_require_admin();"]
    parts.append("insert into private.finance_clients(bucket,code,name) select x.bucket,x.code,x.name from jsonb_to_recordset("+literal(data['clients'])+") as x(bucket text,code text,name text) on conflict(bucket,code) do nothing;")
    parts.append("insert into private.finance_rates(client_id,starts_on,cents,source_key) select c.id,x.starts_on,x.cents,'organizacao-le:'||x.source_key from jsonb_to_recordset("+literal(data['rates'])+") as x(code text,starts_on date,cents bigint,source_key text) join private.finance_clients c on c.bucket='leandro' and c.code=x.code on conflict do nothing;")
    for start in range(0,len(data['entries']),200):
        rows=data['entries'][start:start+200]
        parts.append("insert into private.finance_entries(request_id,client_id,bucket,kind,day,quantity,unit_cents,cents,status,note,source_key,source) select gen_random_uuid(),c.id,'leandro','aula',x.day,x.quantity,x.unit_cents,x.cents,x.status,'Aula importada; recebimento não informado.','organizacao-le:'||x.source_key,x.source from jsonb_to_recordset("+literal(rows)+") as x(code text,day date,quantity int,unit_cents bigint,cents bigint,status text,source_key text,source jsonb) join private.finance_clients c on c.bucket='leandro' and c.code=x.code on conflict(source_key) do nothing;")
    for source in data['sources']:
        parts.append("insert into private.finance_sources(source_key,sha256,sheet,imported_by,data) select x.source_key,x.sha256,x.sheet,auth.uid(),x.data from jsonb_to_recordset("+literal([source])+") as x(source_key text,sha256 text,sheet text,data jsonb) on conflict(source_key) do nothing;")
    parts.append("commit;")
    return "\n".join(parts)

if __name__=='__main__':
    if len(sys.argv)!=4:raise SystemExit(__doc__)
    Path(sys.argv[3]).write_text(prepare(json.loads(Path(sys.argv[1]).read_text()),sys.argv[2]))
    print('SQL privado preparado; nenhuma conexão ou execução realizada.')
