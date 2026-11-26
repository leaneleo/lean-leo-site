"""Teste isolado com Chromium e dados fictícios; não acessa a produção."""
from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import threading,json,datetime

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass

server=ThreadingHTTPServer(('127.0.0.1',0),Quiet);threading.Thread(target=server.serve_forever,daemon=True).start()
today=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=-3))).date().isoformat()
data={'clients':[{'id':'a','name':'Aluno Teste','code':'teste','bucket':'leandro'}],'rates':[{'client_id':'a','starts_on':'2020-01-01','cents':11000}],'entries':[],'sources':[]}
calls=[];profile={'user_id':'admin','role':'admin','display_name':'Administração'}
def route(r):
    url=r.request.url;calls.append(url)
    if url.endswith('/config.js'):
        return r.fulfill(content_type='text/javascript',body='window.DIVAFIT_CONFIG={supabaseUrl:"https://fixture.supabase.co",supabaseKey:"public-fixture"};')
    path=url.split('/rest/v1/')[-1].split('?')[0]
    if path=='team_members':body=[profile]
    elif path=='rpc/finance_workspace':body=data
    elif path=='rpc/finance_entry_create':
        p=r.request.post_data_json;assert p['p_client_id']=='a';assert p['p_cents'] is None
        body={'id':'e','client_id':'a','bucket':'leandro','kind':'aula','day':today,'quantity':1,'unit_cents':11000,'cents':11000,'status':'confirmado','version':1};data['entries'].append(body)
    elif path=='rpc/google_form_status':body=None
    else:body=[]
    r.fulfill(content_type='application/json',body=json.dumps(body))

try:
 with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1100});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/config.js',route);page.route('https://fixture.supabase.co/**',route)
    page.add_init_script("sessionStorage.setItem('divafit.session',JSON.stringify({access_token:'fixture-only',expires_at:9999999999}))")
    page.goto('http://127.0.0.1:'+str(server.server_port));page.get_by_role('button',name='Financeiro',exact=False).click()
    for title in ['Consultoria Online DivaFit','Personal Leandro Romachelli','Personal Leonardo Landim']:
        page.locator('#family-finance').get_by_role('heading',name=title,exact=True).wait_for()
    page.get_by_text('Registrar aula, recebimento ou despesa',exact=True).click()
    page.get_by_label('Registro rápido: Hoje nome do aluno treinou').fill('Hoje Aluno Teste treinou com Leandro')
    page.get_by_role('button',name='Preencher aula pelo texto',exact=True).click()
    assert page.get_by_label('Aluno / modalidade',exact=True).input_value()=='a'
    page.on('dialog',lambda dialog:dialog.accept())
    page.get_by_role('button',name='Conferir e registrar',exact=True).click()
    page.get_by_text('1 aulas · realizadas: R$ 110,00',exact=True).wait_for()
    assert sum('/rpc/finance_entry_create' in u for u in calls)==1
    page.screenshot(path='/tmp/divafit-financeiro-teste.png',full_page=True)
    profile['role']='trainer';calls.clear();page.reload();page.get_by_text('Prescritora',exact=True).wait_for()
    assert page.get_by_role('button',name='Financeiro',exact=False).count()==0
    assert not any('/rpc/finance_' in u for u in calls)
    assert not errors,errors
    browser.close();print('Chromium: três cards, preenchimento pelo texto, confirmação, soma da aula e financeiro oculto/sem consulta para treinadora aprovados; sem erro de página.')
finally:server.shutdown()
