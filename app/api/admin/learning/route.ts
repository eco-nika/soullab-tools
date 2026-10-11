import {env} from 'cloudflare:workers';
import {learningOverview} from '../../../../server/knowledge-store.mjs';
export const dynamic='force-dynamic';
export async function GET(){
  try{return Response.json(await learningOverview(env),{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({message:'학습 예제 DB를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
