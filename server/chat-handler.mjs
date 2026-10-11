import {answerQuestion} from './knowledge-store.mjs';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const reply=(body,status=200)=>Response.json(body,{status,headers});
export async function handleChat(request,env){
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({message:'이 사이트의 채팅 화면에서 질문해 주세요.'},403);
  if(!request.headers.get('content-type')?.startsWith('application/json'))return reply({message:'올바른 질문 형식이 아닙니다.'},415);
  try{
    const reader=request.body?.getReader();if(!reader)return reply({message:'질문을 입력해 주세요.'},400);
    let size=0;const chunks=[];
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return reply({message:'질문은 500자 이내로 적어 주세요.'},413);}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}
    let data;try{data=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply({message:'질문 형식을 확인해 주세요.'},400);}
    if(typeof data?.question!=='string'||data.question.trim().length<2||data.question.trim().length>500)return reply({message:'질문은 2~500자로 적어 주세요.'},400);
    // Question and query vector are request-local only. No chat INSERT, cache or logging.
    return reply(await answerQuestion(data.question,env));
  }catch{return reply({message:'지식 DB를 불러오지 못했습니다. 잠시 후 다시 질문해 주세요.'},503);}
}
