'use strict';
const params=new URLSearchParams(location.search);
const title=document.getElementById('result-title');
const message=document.getElementById('result-message');
const detail=document.getElementById('result-detail');
const icon=document.getElementById('result-icon');
const retry=document.getElementById('retry-confirm');
const isSuccess=document.body.dataset.paymentResult==='success';
function field(label,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;detail.append(dt,dd);}
function failure(code,text){title.textContent=code==='PAY_PROCESS_CANCELED'?'테스트 결제를 취소했습니다':'테스트 결제를 완료하지 못했습니다';message.textContent=text||'스토어에서 다시 시작해 주세요.';icon.textContent='!';detail.replaceChildren();field('안내 코드',code||'PAYMENT_ERROR');}
async function confirm(){
  retry.hidden=true;title.textContent='테스트 결제 승인 확인 중';message.textContent='서버에서 주문과 금액을 확인하고 있습니다. 잠시만 기다려 주세요.';
  const paymentKey=params.get('paymentKey'),orderId=params.get('orderId'),amount=Number(params.get('amount'));
  if(!paymentKey||!orderId||!params.get('amount')||amount!==19000){failure('INVALID_CALLBACK','결제 인증 정보가 없거나 금액이 올바르지 않습니다. 결제 성공으로 처리하지 않았습니다.');return;}
  try{
    const response=await fetch('/api/payments/confirm',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({paymentKey,orderId,amount}),cache:'no-store'});
    const data=await response.json();
    if(!response.ok||!data.ok||data.status!=='DONE'||data.testMode!==true){failure(data.code||'PAYMENT_NOT_VERIFIED',data.message);retry.hidden=data.code!=='CONFIRM_UNAVAILABLE';return;}
    title.textContent='테스트 결제가 완료되었습니다';message.textContent='토스페이먼츠의 테스트 결제 승인을 확인했습니다. 실제 금액은 청구되지 않았습니다.';icon.textContent='✓';detail.replaceChildren();field('상품',data.orderName);field('테스트 결제 금액','19,000원');field('주문번호',data.orderId);field('승인 상태','DONE · 테스트 승인 완료');
  }catch{failure('CONFIRM_UNAVAILABLE','승인 결과를 확인하지 못했습니다. 네트워크 연결을 확인한 후 승인 확인을 다시 시도해 주세요.');retry.hidden=false;}
}
if(isSuccess){retry.addEventListener('click',confirm);confirm();}
else{fetch('/api/payments/failure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:(params.get('code')||'PAYMENT_INTERRUPTED').slice(0,100)})}).catch(()=>{});failure((params.get('code')||'PAYMENT_INTERRUPTED').slice(0,100),(params.get('message')||'결제가 취소되었거나 정상적으로 완료되지 않았습니다.').slice(0,300));}
