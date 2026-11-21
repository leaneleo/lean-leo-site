import {desafioBlack} from '../desafio-config.js';

for (const field of ['name','theme','dates','delivery','status']) {
  document.querySelector('[data-challenge="'+field+'"]').textContent=desafioBlack[field];
}
