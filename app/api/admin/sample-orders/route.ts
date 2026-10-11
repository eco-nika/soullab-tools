import { env } from 'cloudflare:workers';
import { seedOrders } from '../../../../server/order-store.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){
  if(request.headers.get('Origin')!==new URL(request.url).origin)return Response.json({message:'사이트의 샘플 버튼으로 실행해 주세요.'},{status:403});
  try{await seedOrders(env);return Response.json({ok:true,message:'샘플 주문 3건이 준비되었습니다. 이미 있는 샘플은 중복으로 추가하지 않습니다.'},{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({message:'샘플 주문을 저장하지 못했습니다.'},{status:503});}
}
