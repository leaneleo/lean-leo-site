export function checkoutDesafioAte(url,agora=new Date()){
  if(!url||agora>=new Date('2026-12-01T03:00:00Z'))return null;
  try{
    const checkout=new URL(url);
    return checkout.protocol==='https:'&&!checkout.username&&!checkout.password?checkout.href:null;
  }catch{return null;}
}
