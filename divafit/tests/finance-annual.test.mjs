import test from 'node:test';import assert from 'node:assert/strict';
import {annualRevenueToDate,annualSeries} from '../finance-painel-data.js';
test('financeiro: acumulado dos três exclui futuro e outros anos; meses permanecem separados',()=>{
 const aula=(bucket,day,cents)=>({bucket,day,cents,kind:'aula',quantity:1,status:'confirmado'});
 const data={entries:[aula('leandro','2026-01-05',10000),aula('leandro','2026-11-25',20000),aula('leandro','2026-11-26',90000),aula('leandro','2025-01-05',90000),{bucket:'leonardo',day:'2026-01-01',cents:30000,status:'confirmado',kind:'recebimento',source:{type:'personal_monthly_revenue',month:'2026-01'}}]};
 const payments=[{id:'one',paid_on:'2026-01-10',amount:400,status:'Pago'},{id:'future',paid_on:'2026-12-01',amount:900,status:'Pago'}];
 const annual=annualRevenueToDate(data,payments,2026,'2026-11-25');assert.deepEqual(annual.sums,{divafit:40000,leandro:30000,leonardo:30000});assert.equal(annual.total,100000);
 const series=annualSeries(data,payments,2026);assert.equal(series[0].total,80000);assert.equal(series[10].total,110000);assert.equal(series[11].total,90000);
});
