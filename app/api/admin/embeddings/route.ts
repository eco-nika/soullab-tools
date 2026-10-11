import {env} from 'cloudflare:workers';
import {knowledgeOverview} from '../../../../server/knowledge-store.mjs';
export const dynamic='force-dynamic';
export async function GET(){
  try{return Response.json(await knowledgeOverview(env),{headers:{'Cache-Control':'no-store'}});}
  catch{return Response.json({message:'지식 DB를 불러오지 못했습니다. 잠시 후 새로고침해 주세요.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
