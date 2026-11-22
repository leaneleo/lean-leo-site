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
