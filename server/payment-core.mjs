// Test-only checkout. Inquiry content and sensitive payment data are never persisted.
import { saveOrder } from './order-store.mjs';
export const PRODUCT={name:'직무별 AI 프롬프트 모음집 PDF',amount:19000,currency:'KRW'};
const COOKIE='__Host-soullab-test-order';
const encoder=new TextEncoder();
function json(data,status=200,extra={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff',...extra}});}
function fail(code,message,status=400){return json({ok:false,code,message},status);}
function validOrigin(request){return request.headers.get('Origin')===new URL(request.url).origin;}
function configReady(env){return /^test_sk_[A-Za-z0-9]+$/.test(env.TOSS_SECRET_KEY||'') && /^test_ck_[A-Za-z0-9]+$/.test(env.TOSS_CLIENT_KEY||'') && (env.ORDER_SIGNING_SECRET||'').length>=32;}
function base64url(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function decode64(text){return Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
async function key(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
async function signOrder(payload,secret){const body=base64url(encoder.encode(JSON.stringify(payload)));const signature=await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(body));return body+'.'+base64url(new Uint8Array(signature));}
async function readOrder(request,secret){
  try{
    const token=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
    if(!token||token.length>2048)return null;
    const parts=token.split('.');if(parts.length!==2)return null;
    const valid=await crypto.subtle.verify('HMAC',await key(secret),decode64(parts[1]),encoder.encode(parts[0]));if(!valid)return null;
    const order=JSON.parse(new TextDecoder().decode(decode64(parts[0])));
    if(!Number.isFinite(order.expires)||order.expires<Date.now()||order.amount!==PRODUCT.amount||!/^sltest_[a-f0-9]{32}$/.test(order.orderId))return null;
    return order;
  }catch{return null;}
}
export async function createOrder(request,env){
  if(!validOrigin(request))return fail('INVALID_ORIGIN','이 사이트의 결제 화면에서 다시 시작해 주세요.',403);
  if(!configReady(env))return fail('TEST_CONFIG_UNAVAILABLE','테스트 결제 설정을 확인 중입니다. 잠시 후 다시 시도해 주세요.',503);
  const order={orderId:'sltest_'+crypto.randomUUID().replaceAll('-',''),amount:PRODUCT.amount,expires:Date.now()+30*60*1000};
  try{await saveOrder(env,order.orderId,'READY');}catch{return fail('ORDER_SAVE_FAILED','테스트 주문을 DB에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',503);}
  const token=await signOrder(order,env.ORDER_SIGNING_SECRET);
  return json({ok:true,orderId:order.orderId,orderName:PRODUCT.name,amount:PRODUCT.amount,currency:PRODUCT.currency,clientKey:env.TOSS_CLIENT_KEY,testMode:true},200,{'Set-Cookie':`${COOKIE}=${token}; Path=/; Max-Age=1800; HttpOnly; Secure; SameSite=Lax`});
}
export async function confirmPayment(request,env,providerFetch=fetch){
  if(!validOrigin(request))return fail('INVALID_ORIGIN','이 사이트의 결제 화면에서 다시 시작해 주세요.',403);
  if(!configReady(env))return fail('TEST_CONFIG_UNAVAILABLE','테스트 결제 설정을 확인 중입니다.',503);
  if(!request.headers.get('Content-Type')?.startsWith('application/json'))return fail('INVALID_REQUEST','올바르지 않은 결제 요청입니다.');
  const order=await readOrder(request,env.ORDER_SIGNING_SECRET);
  if(!order)return fail('ORDER_EXPIRED','주문 확인 정보가 없거나 만료되었습니다. 스토어에서 다시 시작해 주세요.');
  let input;
  try{const raw=await request.text();if(raw.length>4096)return fail('INVALID_REQUEST','결제 요청이 너무 큽니다.');input=JSON.parse(raw);}catch{return fail('INVALID_REQUEST','결제 정보를 읽을 수 없습니다.');}
  if(!input||input.orderId!==order.orderId||input.amount!==PRODUCT.amount)return fail('ORDER_MISMATCH','주문번호 또는 금액이 원래 주문과 일치하지 않습니다.');
  if(typeof input.paymentKey!=='string'||!/^[-A-Za-z0-9_]{10,200}$/.test(input.paymentKey))return fail('INVALID_PAYMENT_KEY','결제 인증 정보가 올바르지 않습니다.');
  const auth='Basic '+btoa(env.TOSS_SECRET_KEY+':');
  try{
    let response=await providerFetch('https://api.tosspayments.com/v1/payments/confirm',{method:'POST',headers:{Authorization:auth,'Content-Type':'application/json','Idempotency-Key':order.orderId},body:JSON.stringify({paymentKey:input.paymentKey,orderId:order.orderId,amount:PRODUCT.amount}),signal:AbortSignal.timeout(20000)});
    let data=await response.json();
    // A refresh/retry may refer to an already approved test payment; verify it with Toss.
    if(!response.ok&&data.code==='ALREADY_PROCESSED_PAYMENT'){
      response=await providerFetch('https://api.tosspayments.com/v1/payments/'+encodeURIComponent(input.paymentKey),{headers:{Authorization:auth},signal:AbortSignal.timeout(20000)});data=await response.json();
    }
    if(!response.ok){await saveOrder(env,order.orderId,'FAILED');return fail(String(data.code||'PAYMENT_CONFIRM_FAILED').slice(0,100),String(data.message||'테스트 결제 승인이 완료되지 않았습니다.').slice(0,300),400);}
    if(data.status!=='DONE'||data.orderId!==order.orderId||data.totalAmount!==PRODUCT.amount||data.currency!=='KRW'||data.paymentKey!==input.paymentKey)return fail('PAYMENT_NOT_VERIFIED','토스페이먼츠의 승인 결과를 확인하지 못했습니다.',502);
    try{await saveOrder(env,order.orderId,'DONE');}catch{return fail('CONFIRM_UNAVAILABLE','토스 테스트 승인은 완료됐으나 주문 기록 저장을 확인하지 못했습니다. 승인 확인을 다시 시도해 주세요.',503);}
    return json({ok:true,testMode:true,status:'DONE',orderId:order.orderId,orderName:PRODUCT.name,amount:PRODUCT.amount,currency:'KRW'});
  }catch{return fail('CONFIRM_UNAVAILABLE','승인 결과를 확인하지 못했습니다. 같은 화면에서 승인 확인을 다시 시도해 주세요.',502);}
}

export async function recordPaymentFailure(request,env){
  if(!validOrigin(request))return fail('INVALID_ORIGIN','올바른 사이트에서 요청해 주세요.',403);
  if(!configReady(env))return fail('TEST_CONFIG_UNAVAILABLE','테스트 설정을 확인해 주세요.',503);
  const order=await readOrder(request,env.ORDER_SIGNING_SECRET);
  if(!order)return fail('ORDER_EXPIRED','주문 정보가 없거나 만료되었습니다.');
  try{const raw=await request.text();if(raw.length>1024)return fail('INVALID_REQUEST','올바르지 않은 요청입니다.');const input=JSON.parse(raw);await saveOrder(env,order.orderId,input.code==='PAY_PROCESS_CANCELED'?'CANCELED':'FAILED');return json({ok:true});}
  catch{return fail('ORDER_SAVE_FAILED','테스트 실패 상태를 기록하지 못했습니다.',503);}
}
