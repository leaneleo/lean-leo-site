import {desafioBlack} from '../desafio-config.js';

for (const field of ['name','theme','dates','status']) {
  document.querySelector('[data-challenge="'+field+'"]').textContent=desafioBlack[field];
}

const list=document.querySelector('[data-challenge-benefits]');
for(const benefit of desafioBlack.benefits){
  const item=document.createElement('li');
  item.textContent=benefit;
  list.append(item);
}

import {blackCheckoutAt,blackStarts,blackEnds} from '../avaliacao/black-campaign.mjs';
const pay=document.querySelector('[data-payment]');
function update(){
 const target=window.DIVAFIT_BLACK_PREVIEW?blackCheckoutAt(window.DIVAFIT_BLACK_PREVIEW.checkout):null;
 if(target)pay.href=target;
 else pay.removeAttribute('href');
 pay.hidden=!target;
 document.querySelector('[data-closed]').hidden=Boolean(target);
 document.querySelector('[data-challenge="status"]').hidden=Boolean(target);
}
update();
for(const date of [blackStarts,blackEnds]){
 const delay=date-Date.now();
 if(delay>0&&delay<2147483647)setTimeout(update,delay);
}
window.addEventListener('pageshow',update);
