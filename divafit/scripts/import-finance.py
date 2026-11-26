"""Extrai Excel sem executar fórmulas. Saída contém dados privados: nunca versionar/publicar.
Uso: python scripts/import-finance.py arquivo.xlsx /pasta/privada/importacao.json
"""
import sys, json, zipfile, hashlib, datetime, calendar, re
from decimal import Decimal
from pathlib import Path
import xml.etree.ElementTree as ET

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
MONTHS = {'Jan':1,'Fev':2,'Mar':3,'Abr':4,'Mai':5,'Jun':6,'Jul':7,'Ago':8,'Set':9,'Out':10,'Nov':11,'Dez':12}

def extract(path):
    blob=Path(path).read_bytes(); sha=hashlib.sha256(blob).hexdigest()
    z=zipfile.ZipFile(path)
    strings=[''.join(e.itertext()) for e in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',NS)] if 'xl/sharedStrings.xml' in z.namelist() else []
    rels={r.attrib['Id']:r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    sources=[];entries=[];rates=[];clients=set();today=datetime.date.today()
    for sh in ET.fromstring(z.read('xl/workbook.xml')).find('s:sheets',NS):
        name=sh.attrib['name'];target=rels[sh.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
        root=ET.fromstring(z.read(target.lstrip('/') if target.startswith('/') else 'xl/'+target));cells={};formulas={}
        for c in root.findall('s:sheetData/s:row/s:c',NS):
            v=c.find('s:v',NS);f=c.find('s:f',NS);address=c.attrib['r']
            if v is not None and v.text is not None:cells[address]=strings[int(v.text)] if c.attrib.get('t')=='s' else v.text
            elif c.attrib.get('t')=='inlineStr':cells[address]=''.join(c.find('s:is',NS).itertext())
            if f is not None:formulas[address]={'formula':f.text,'attributes':dict(f.attrib)}
        checks=[];source={'source_key':'organizacao-le:'+name,'sha256':sha,'sheet':name,'data':{'cells':cells,'formulas':formulas,'checks':checks}}
        sources.append(source)
        if not re.fullmatch(r'[A-Z][a-z]{2}\d{2}',name) or name[:3] not in MONTHS:continue
        year=2000+int(name[3:]);month=MONTHS[name[:3]];start=datetime.date(year,month,1)
        excel_start=None
        try:excel_start=datetime.date(1899,12,30)+datetime.timedelta(days=int(cells['A2']))
        except (KeyError,ValueError):pass
        if excel_start!=start:
            checks.append('Data-base diverge do nome da aba; aulas não importadas.');continue
        price_col=next((re.sub(r'\d','',a) for a,v in cells.items() if a.endswith('2') and re.sub(r'\D','',a)=='2' and v.strip().lower()=='valor da aula'),None)
        def col_number(s):
            n=0
            for c in s:n=n*26+ord(c)-64
            return n
        def col_name(n):
            s=''
            while n:n,r=divmod(n-1,26);s=chr(65+r)+s
            return s
        price_names=col_name(col_number(price_col)-1) if price_col else None
        prices={}
        if price_col:
            for row in range(3,101):
                code=cells.get(price_names+str(row),'').strip();v=cells.get(price_col+str(row))
                if code and v is not None:
                    try:
                        amount=Decimal(v)*100
                        if amount<0 or amount!=amount.to_integral_value():raise ValueError()
                        prices[code]=int(amount);clients.add(code)
                        rates.append({'code':code,'starts_on':str(start),'cents':int(amount),'source_key':name+':'+price_col+str(row)})
                    except (ValueError,ArithmeticError):checks.append('Valor não numérico em '+price_col+str(row))
        calculated=0;unknown=0;month_entries=[]
        for row in range(4,35):
            raw=cells.get('A'+str(row),'')
            if not raw.isdigit():continue
            day=int(raw)
            if not 1<=day<=calendar.monthrange(year,month)[1]:continue
            date=datetime.date(year,month,day)
            for col in 'BCDEFGHIJK':
                address=col+str(row);code=cells.get(address,'').strip()
                if not code:continue
                clients.add(code);price=prices.get(code)
                if price is None:unknown+=1
                else:calculated+=price
                month_entries.append({'code':code,'day':str(date),'quantity':1,'unit_cents':price,'cents':price,'status':'confirmado' if price is not None and date<=today else 'a_revisar','source_key':name+':'+address,'source':{'sheet':name,'cell':address,'sha256':sha}})
        entries.extend(month_entries)
        checks.append(str(len(month_entries))+' aulas extraídas; '+str(unknown)+' sem tarifa identificada.')
        source['data']['control']={'classes':len(month_entries),'calculated_cents':calculated,'unknown':unknown}
        for address,value in cells.items():
            if re.fullmatch(r'M\d+',address) and value.strip().upper()=='TOTAL':
                amount=cells.get('N'+address[1:])
                if amount:
                    try:
                        original=int((Decimal(amount)*100).quantize(Decimal('1')));source['data']['control']['original_cents']=original
                        if original!=calculated:checks.append('Total da planilha difere da soma das aulas por tarifa; conferir fechamento.')
                    except ArithmeticError:pass
    return {'sha256':sha,'sources':sources,'clients':[{'bucket':'leandro','code':c,'name':c} for c in sorted(clients)],'rates':rates,'entries':entries}

if __name__=='__main__':
    if len(sys.argv)!=3:raise SystemExit(__doc__)
    result=extract(sys.argv[1]);Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False))
    print(json.dumps({'abas':len(result['sources']),'cadastros':len(result['clients']),'tarifas':len(result['rates']),'aulas':len(result['entries']),'sem_valor':sum(e['cents'] is None for e in result['entries'])},ensure_ascii=False))
