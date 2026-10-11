import { env } from 'cloudflare:workers';
import { listOrders,csvFromRows } from '../../../../server/order-store.mjs';
export const dynamic='force-dynamic';
export async function GET(request:Request){
  try{
    const orders=await listOrders(env);
    const format=new URL(request.url).searchParams.get('format');
    const name='soullab-test-orders-'+new Date().toISOString().slice(0,10);
    if(format==='csv')return new Response(csvFromRows(orders),{headers:{'Content-Type':'text/csv; charset=utf-8','Cache-Control':'no-store','Content-Disposition':`attachment; filename="${name}.csv"`}});
    return Response.json(orders,{headers:{'Cache-Control':'no-store','Content-Disposition':`attachment; filename="${name}.json"`}});
  }catch{return Response.json({message:'백업 데이터를 불러오지 못했습니다.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
