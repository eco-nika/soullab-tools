#!/usr/bin/env node
// Node >=22.13, no external dependencies. Credentials come from env only.
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const [command, requestPath]=process.argv.slice(2);
const allowed=new Set(['context','status','run','feedback','propose','confirm','experiment','decide','retire']);
async function revision(){
  try {
    const sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
    const dirty=execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim();
    return {sha,dirty:Boolean(dirty),freshness:'not-verified-by-client; fetch/compare GitHub before use'};
  } catch {return {sha:'unknown',dirty:true,freshness:'unknown'};}
}
async function remote(payload){
  const base=process.env.SOULLAB_LEARNING_URL;
  const token=process.env.SOULLAB_LEARNING_TOKEN;
  if(!base || !token)throw new Error('Learning URL/token not configured');
  const url=new URL(base);
  if(url.protocol!=='https:' || url.username || url.password || url.search || url.hash)throw new Error('Learning URL must be HTTPS without credentials/query/hash');
  const response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(payload)});
  if(!response.ok)throw new Error(`Learning API HTTP ${response.status}`);
  return response.json();
}
try {
  if(!allowed.has(command) || !requestPath)throw new Error('Usage: node automation/learning/client.mjs <action> <request.json>');
  const input=JSON.parse(await readFile(requestPath,'utf8'));
  if(command==='context') {
    if(typeof input.scope!=='string' || !/^[a-z0-9][a-z0-9_/-]*$/.test(input.scope) || input.scope.includes('..'))throw new Error('Invalid scope');
    const candidates=['AGENTS.md','docs/learning/PROTOCOL.md','docs/learning/HANDOFF.md'];
    const parts=input.scope.split('/');
    for(let i=1;i<=parts.length;i++)candidates.push(parts.slice(0,i).join('/')+'/AGENTS.md');
    if(input.scope.startsWith('channels/'))candidates.push('brand/AGENTS.md','brand/identity.md','brand/voice.md','brand/audience.md','brand/content.md');
    const instructions=[];
    for(const file of [...new Set(candidates)]){try{instructions.push({path:file,text:await readFile(path.join(root,file),'utf8')});}catch(e){if(e.code!=='ENOENT')throw e;}}
    let memory,warning;
    try{memory=await remote({...input,action:'context'});}catch(e){warning=e.message;memory={selected:[],stages:{storage:'unknown',retrieval:false,application:'not-demonstrated',improvement:'not-demonstrated'}};}
    const result={source:await revision(),instructions,memory,warning:warning||null,
      agent_step:'Read the instructions and scoped feedback; create output; submit selected result with exact applied quotes. This client does not generate content.'};
    await mkdir(path.join(root,'.learning'),{recursive:true,mode:0o700});
    await writeFile(path.join(root,'.learning/context.json'),JSON.stringify(result,null,2),{mode:0o600});
    console.log(JSON.stringify(result,null,2));
  }else{
    try{console.log(JSON.stringify(await remote({...input,action:command}),null,2));}
    catch(e){console.log(JSON.stringify({stored:false,error:e.message,task_may_continue:true,action:command}));process.exitCode=2;}
  }
}catch(error){console.error(error.message);process.exitCode=1;}
