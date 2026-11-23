export const blackEnds=new Date('2026-12-01T03:00:00Z').getTime();
export const blackStarts=new Date('2026-11-25T03:00:00Z').getTime();
export const blackBadge='🖤 BLACK LE&LEOFIT · Dieta e corrida inclusas';
export function blackConsultoriaAt(now=new Date()){return Number.isFinite(+now)&&+now<blackEnds;}
export function blackCheckoutAt(url,now=new Date()){
  if(!blackConsultoriaAt(now)||+now<blackStarts||!url)return null;
  try{
    const link=new URL(url);
    return link.protocol==='https:'&&['link.infinitepay.io','checkout.infinitepay.io','buy.infinitepay.io'].includes(link.hostname)&&
      !link.username&&!link.password&&!link.port&&link.pathname.length>1?link.href:null;
  }catch{return null;}
}
