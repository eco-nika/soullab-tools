'use strict';
const payButton=document.getElementById('pay-button');
const statusText=document.getElementById('payment-status');
let payment;
let order;
function goFail(code,message){const params=new URLSearchParams({code:String(code||'PAYMENT_ERROR').slice(0,100),message:String(message||'결제를 시작하지 못했습니다.').slice(0,300)});location.assign('/payment-fail.html?'+params);}
async function prepare(){
  try{
    const response=await fetch('/api/payments/order',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',cache:'no-store'});
    order=await response.json();
    if(!response.ok||!order.ok)throw Object.assign(new Error(order.message),{code:order.code});
    if(!order.clientKey.startsWith('test_ck_')||order.amount!==19000||!order.testMode)throw new Error('테스트 결제 설정이 올바르지 않습니다.');
    if(typeof TossPayments!=='function')throw new Error('토스 결제 모듈을 불러오지 못했습니다. 인터넷 연결이나 콘텐츠 차단 설정을 확인해 주세요.');
    payment=TossPayments(order.clientKey).payment({customerKey:TossPayments.ANONYMOUS});
    payButton.disabled=false;payButton.textContent='19,000원 테스트 결제하기';statusText.textContent='준비되었습니다. 버튼을 눌러 테스트 결제창을 여세요.';
  }catch(error){goFail(error.code||'PAYMENT_SETUP_FAILED',error.message);}
}
payButton.addEventListener('click',async()=>{
  if(!payment||!order)return;
  payButton.disabled=true;statusText.textContent='토스페이먼츠 테스트 결제창을 여는 중입니다.';
  try{
    await payment.requestPayment({method:'CARD',amount:{currency:'KRW',value:order.amount},orderId:order.orderId,orderName:order.orderName,successUrl:location.origin+'/payment-success.html',failUrl:location.origin+'/payment-fail.html',card:{useEscrow:false,flowMode:'DEFAULT',useCardPoint:false,useAppCardOnly:false}});
  }catch(error){goFail(error.code||'PAYMENT_REQUEST_FAILED',error.message||'테스트 결제가 중단되었습니다.');}
  finally{payButton.disabled=false;}
});
prepare();
