import {blackBadge,blackConsultoriaAt,blackEnds} from './black-campaign.mjs';
const badge=document.querySelector('[data-black-badge]');
const offer=document.querySelector('[data-black-offer]');
function update(){
  const visible=Boolean(window.DIVAFIT_BLACK_PREVIEW)&&blackConsultoriaAt();
  badge.textContent=blackBadge;
  badge.hidden=!visible;
  if(offer)offer.hidden=!visible;
}
update();
const until=blackEnds-Date.now();
if(until>0&&until<2147483647)setTimeout(update,until);
window.addEventListener('pageshow',update);
