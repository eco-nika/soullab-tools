import { env } from 'cloudflare:workers';
import { listOrders } from '../../../../server/order-store.mjs';
export const dynamic='force-dynamic';
export async function GET(){
  try{return Response.json({testOnly:true,orders:await listOrders(env)},{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({message:'주문 DB를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
