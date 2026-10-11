import {learningAction, LearningInputError} from './agent-learning.mjs';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=(body,status=200)=>Response.json(body,{status,headers});
async function equalSecret(a,b) {
  const enc=new TextEncoder();
  const [x,y]=await Promise.all([a,b].map(v=>crypto.subtle.digest('SHA-256',enc.encode(v))));
  const left=new Uint8Array(x),right=new Uint8Array(y);let diff=0;
  for(let i=0;i<left.length;i++)diff|=left[i]^right[i];return diff===0;
}
export async function handleLearning(request,env) {
  // Public Site: dispatch identity/bypass alone does not authorize learning access.
  if(typeof env.AGENT_LEARNING_TOKEN!=='string' || env.AGENT_LEARNING_TOKEN.length<32)return reply({error:'learning_not_configured'},503);
  const authorization=request.headers.get('authorization') || '';
  if(authorization.length>1024 || !await equalSecret(authorization,'Bearer '+env.AGENT_LEARNING_TOKEN))return reply({error:'unauthorized'},401);
  if(request.method!=='POST')return reply({error:'method_not_allowed'},405);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({error:'json_required'},415);
  if(!env.DB)return reply({error:'database_unavailable'},503);
  try {
    const reader=request.body?.getReader();if(!reader)return reply({error:'body_required'},400);
    const chunks=[];let size=0;
    for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();return reply({error:'body_too_large'},413);}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
    let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply({error:'invalid_json'},400);}
    return reply(await learningAction(env.DB,data));
  }catch(error){
    if(error instanceof LearningInputError)return reply({error:error.message},400);
    return reply({error:'learning_storage_unavailable',hint:'Check migration and DB binding. Continue the task and report memory unavailable.'},503);
  }
}
