export const PLANS=Object.freeze({monthly:{name:'Mensal',months:1,bonus:0,original:19700,card:15760,pix:15760},quarterly:{name:'Trimestral',months:3,bonus:1,original:59100,card:38415,pix:36000}});
export function quote(planKey,coupon=null,now=new Date()){
 const plan=PLANS[planKey];if(!plan)throw Error('Escolha um plano válido.');
 let discount=0;
 if(coupon){if(!coupon.active||(coupon.starts_at&&Date.parse(coupon.starts_at)>+now)||(coupon.ends_at&&Date.parse(coupon.ends_at)<=+now)||(coupon.plan&&coupon.plan!==planKey))throw Error('Cupom indisponível para este plano.');if(coupon.max_uses!=null&&coupon.uses>=coupon.max_uses)throw Error('Cupom esgotado.');discount=Number(coupon.percent_bps||0);if(!Number.isInteger(discount)||discount<1||discount>9000)throw Error('Cupom inválido.');}
 const card=plan.card-Math.floor(plan.card*discount/10000),pix=plan.pix-Math.floor(plan.pix*discount/10000);
 return {plan:planKey,name:plan.name,months:plan.months+plan.bonus,bonus:plan.bonus,original:plan.original,card,pix,coupon:coupon?.code||null,discount_bps:discount};
}
export function customer(input){const name=String(input.name||'').trim(),email=String(input.email||'').trim().toLowerCase();let phone=String(input.phone||'').replace(/\D/g,'');if(phone.length===10||phone.length===11)phone='55'+phone;if(name.length<3||name.length>150||!/^\S+@\S+\.\S+$/.test(email)||email.length>254||!/^55\d{10,11}$/.test(phone)||input.accepted!==true)throw Error('Confira nome, e-mail, WhatsApp e aceite das condições.');return {name,email,phone,whatsapp_consent:input.whatsapp_consent===true};}
export function verifiedPayment(check,order){
 if(check.success!==true||check.paid!==true)return false;
 if(!['pix','credit_card'].includes(check.capture_method))return false;
 if(!Number.isSafeInteger(check.amount)||!Number.isSafeInteger(check.paid_amount))return false;
 // A API pode informar o principal antes ou depois do desconto Pix; valor pago nunca é usado como taxa líquida.
 if(check.capture_method==='pix')return [order.card_cents,order.pix_cents].includes(check.amount)&&check.paid_amount===order.pix_cents;
 return check.amount===order.card_cents&&check.paid_amount>=order.card_cents;
}
export function providerPayload(order,env){return {handle:env.INFINITEPAY_HANDLE,order_nsu:order.id,items:[{quantity:1,price:order.card_cents,description:`Consultoria DIVAFIT · ${PLANS[order.plan].name} · ${order.months} meses`}],customer:{name:order.customer.name,email:order.customer.email,phone_number:'+'+order.customer.phone},redirect_url:'https://app.leeleo.com.br/checkout/divafit/retorno/',webhook:{url:env.SUPABASE_URL+'/functions/v1/divafit-checkout?route=webhook',events:['paid','refunded','canceled']},options:{single_payment:true,require_delivery_address:false,valid_until:order.expires_at,...(order.pix_cents<order.card_cents?{discounts:{pix:Number(((1-order.pix_cents/order.card_cents)*100).toFixed(10))}}:{})}};}
