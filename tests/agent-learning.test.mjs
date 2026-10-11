import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {learningAction as action} from '../server/agent-learning.mjs';
import {handleLearning} from '../server/agent-learning-handler.mjs';
import {ensureKnowledge,learningOverview} from '../server/knowledge-store.mjs';
function setup(){
  const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');
  for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
  const db={prepare(sql){let params=[];return {bind(...p){params=p;return this;},async run(){return sqlite.prepare(sql).run(...params);},async all(){return {results:sqlite.prepare(sql).all(...params)};}};},async batch(statements){sqlite.exec('BEGIN');try{for(const s of statements)await s.run();sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
  return {sqlite,db};
}
const loc={scope:'channels/threads/posts',audience:'small-business',task_key:'ai-tip'};
const runInput={...loc,action:'run',retain:true,output:'가게 행사 안내문은 날짜와 혜택을 먼저 적어보세요.',query:'가게 행사 안내문 날짜 혜택',status:'success',keep_reason:'사용자가 재사용 예시로 선택',source_revision:'test-fixture',tool:'ChatGPT',environment:'test-only',case_key:'case-1'};
async function feedback(db,extra={}){const r=await action(db,runInput);return action(db,{...loc,action:'feedback',run_id:r.id,rating:'good',reason:'가게 행사 안내문은 날짜와 혜택을 먼저 적어보세요.',reusable:true,confirmed_by_user:true,provenance:'Test fixture, not actual user feedback',...extra});}
async function candidate(db,extra={}){
  const r=await action(db,{...runInput,...extra});
  const c=await action(db,{...loc,action:'propose',rule:'가게 행사 안내문은 날짜와 혜택을 먼저 적어보세요.',hypothesis:'구체적인 입력 안내로 수정 횟수 감소',failure_analysis:'정보가 없으면 불필요한 수정 발생',evidence_ids:[r.id],rubric_draft:'수정 횟수'});
  const rubric=await action(db,{...loc,action:'confirm',candidate_id:c.id,metric:'revision-count',direction:'lower',min_pairs:3,min_gain:1,measurement:'동일 과제별 승인 전 수정 횟수',evaluator:'human reviewer',guardrails:'사실 오류 없음, 과장 없음'});
  return {c,rubric};
}
async function pair(db,c,rubric,index,extra={}){
  const baseline=await action(db,{...runInput,case_key:'pair-'+index,output:'Baseline fixture '+index});
  const improved=await action(db,{...runInput,case_key:'pair-'+index,candidate_id:c.id,output:'Candidate fixture '+index});
  return action(db,{...loc,action:'experiment',rubric_id:rubric.id,baseline_run_id:baseline.id,candidate_run_id:improved.id,baseline_score:3,candidate_score:1,evidence_type:'measured',evidence_ref:'test-only://pair/'+index,guardrails_pass:true,...extra});
}
test('legacy sample records preserved and never retrieved as actual learning',async()=>{
  const {db,sqlite}=setup();await ensureKnowledge({DB:db});
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM agent_learning_feedback').get().n,5);
  const result=await action(db,{...loc,action:'context',query:runInput.query});assert.deepEqual(result.selected,[]);
});
test('one-off feedback and unselected outputs are not retained',async()=>{
  const {db,sqlite}=setup();assert.equal((await action(db,{...runInput,retain:false})).stored,false);
  assert.equal((await action(db,{...loc,action:'feedback',reusable:false})).stored,false);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM agent_learning_records').get().n,0);
});
test('feedback and vectors persist atomically, retries and normalized duplicates collapse',async()=>{
  const {db,sqlite}=setup();const a=await feedback(db);const b=await feedback(db);assert.equal(a.id,b.id);
  const c=await feedback(db,{reason:'가게  행사 안내문은 날짜와 혜택을 먼저 적어보세요.'});assert.equal(a.id,c.id);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM agent_learning_feedback').get().n,1);
  assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM agent_learning_feedback_embeddings').get().n,1);
});
test('exact scope/audience filters and relevance prevent unrelated reuse',async()=>{
  const {db}=setup();await feedback(db);
  const q={...loc,action:'context',query:runInput.query};assert.equal((await action(db,q)).selected.length,1);
  assert.equal((await action(db,{...q,scope:'site/code'})).selected.length,0);
  assert.equal((await action(db,{...q,audience:'job-seekers'})).selected.length,0);
});
test('next-tool output records selected feedback and a real output quote',async()=>{
  const {db,sqlite}=setup();const f=await feedback(db);
  const result=await action(db,{...runInput,tool:'Claude Code',environment:'simulated-vps',applied:[{id:f.id,quote:'날짜와 혜택'}]});
  const data=JSON.parse(sqlite.prepare('SELECT payload FROM agent_learning_records WHERE id=?').get(result.id).payload);
  assert.equal(data.application,'quote-verified-agent-report');assert.deepEqual(data.retrieved_ids,[f.id]);
  await assert.rejects(action(db,{...runInput,applied:[{id:f.id,quote:'없는 문장'}]}),/absent/);
  await assert.rejects(action(db,{...runInput,applied:[{id:'unknown',quote:'날짜'}]}),/not in/);
});
test('public learning overview exposes samples only after real records exist',async()=>{
  const {db}=setup();await feedback(db);const overview=await learningOverview({DB:db});
  assert.equal(overview.feedback.length,5);assert.equal(overview.feedbackEmbeddings.length,5);assert.ok(overview.feedback.every(r=>r.is_sample===1));
});
test('candidate starts inactive; rubric freezes before paired trials',async()=>{
  const {db}=setup();const {c,rubric}=await candidate(db);
  assert.equal((await action(db,{...loc,action:'context',query:runInput.query})).selected.length,0);
  const again=await action(db,{...loc,action:'confirm',candidate_id:c.id,min_pairs:1});assert.equal(again.id,rubric.id);
  const d=await action(db,{...loc,action:'decide',rubric_id:rubric.id});assert.ok(d.id);
  assert.equal((await action(db,{...loc,action:'context',query:runInput.query})).selected.length,0);
});
test('three matched real-evidence pairs promote scoped rule; duplicate case cannot inflate sample count',async()=>{
  const {db,sqlite}=setup();const {c,rubric}=await candidate(db);
  for(let i=0;i<3;i++)await pair(db,c,rubric,i);
  await pair(db,c,rubric,0);assert.equal(sqlite.prepare("SELECT COUNT(*) n FROM agent_learning_records WHERE kind='experiment'").get().n,3);
  await action(db,{...loc,action:'decide',rubric_id:rubric.id});
  assert.deepEqual((await action(db,{...loc,action:'context',query:runInput.query})).selected.map(r=>r.id),[c.id]);
});
test('regression causes hold and removes previously promoted rule from subsequent context',async()=>{
  const {db}=setup();const {c,rubric}=await candidate(db);
  for(let i=0;i<3;i++)await pair(db,c,rubric,i);
  await action(db,{...loc,action:'decide',rubric_id:rubric.id});
  await pair(db,c,rubric,3,{candidate_score:6});
  await action(db,{...loc,action:'decide',rubric_id:rubric.id});
  assert.equal((await action(db,{...loc,action:'context',query:runInput.query})).selected.length,0);
});
test('sample evidence, failed guardrails and self-evaluation cannot promote',async()=>{
  for(const mode of ['sample','guardrail']){
    const {db}=setup();const {c,rubric}=await candidate(db,mode==='sample'?{is_sample:true}:{});
    for(let i=0;i<3;i++)await pair(db,c,rubric,i,{guardrails_pass:mode!=='guardrail'});
    await action(db,{...loc,action:'decide',rubric_id:rubric.id});
    assert.equal((await action(db,{...loc,action:'context',query:runInput.query})).selected.length,0);
  }
  const {db}=setup();const {c,rubric}=await candidate(db);await assert.rejects(pair(db,c,rubric,0,{evidence_type:'ai-self'}),/Self-evaluation/);
});
test('retirement preserves history and suppresses future retrieval',async()=>{
  const {db,sqlite}=setup();const f=await feedback(db);
  await action(db,{...loc,action:'retire',record_id:f.id,reason:'사용자 기준 변경'});
  assert.equal((await action(db,{...loc,action:'context',query:runInput.query})).selected.length,0);
  assert.ok(sqlite.prepare('SELECT id FROM agent_learning_records WHERE id=?').get(f.id));
});
test('cross-scope references, missing provenance and unknown actions rejected',async()=>{
  const {db}=setup();const r=await action(db,runInput);
  await assert.rejects(action(db,{...loc,scope:'site/code',action:'feedback',run_id:r.id,reusable:true,confirmed_by_user:true}),/Cross-scope/);
  await assert.rejects(feedback(db,{confirmed_by_user:false}),/confirmation/);
  await assert.rejects(action(db,{...loc,action:'unknown'}),/Unknown/);
});
test('protected API fails closed; validates auth, body size, and DB availability',async()=>{
  const {db}=setup();const token='t'.repeat(40),env={DB:db,AGENT_LEARNING_TOKEN:token};
  const req=(body,authorization='Bearer '+token)=>new Request('https://example.test/api/agent-learning',{method:'POST',headers:{Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await handleLearning(req({...loc,action:'status'}),{})).status,503);
  assert.equal((await handleLearning(req({},'wrong'),env)).status,401);
  assert.equal((await handleLearning(req({...loc,action:'status'}),env)).status,200);
  assert.equal((await handleLearning(req({payload:'x'.repeat(70000)}),env)).status,413);
  assert.equal((await handleLearning(req({}),env)).status,400);
  assert.equal((await handleLearning(req({}),{AGENT_LEARNING_TOKEN:token})).status,503);
});

test('Sites MCP discovery is stateless; actual records require configured owner identity',async()=>{
  const {handleLearningMcp}=await import('../server/agent-learning-mcp.mjs');
  const {db}=setup();const env={DB:db,AGENT_LEARNING_OWNER_ID:'site-owner-test'};
  const req=(method,params={},user='site-owner-test')=>new Request('https://example.test/mcp',{method:'POST',headers:{'Content-Type':'application/json','oai-authenticated-user-id':user},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
  assert.deepEqual((await (await handleLearningMcp(req('server/discover'),env)).json()).result.supportedVersions,['2026-07-28']);
  assert.equal((await (await handleLearningMcp(req('tools/list'),env)).json()).result.tools.length,3);
  const params={name:'soullab_learning_status',arguments:loc};
  assert.equal((await handleLearningMcp(req('tools/call',params,'viewer'),env)).status,403);
  assert.equal((await handleLearningMcp(req('tools/call',params),{DB:db})).status,503);
  const good=await (await handleLearningMcp(req('tools/call',params),env)).json();assert.equal(good.result.isError,false);
  const invalid=await (await handleLearningMcp(req('tools/call',{name:'soullab_learning_record',arguments:{request:{...loc,action:'status'}}}),env)).json();assert.equal(invalid.error.code,-32602);
});
