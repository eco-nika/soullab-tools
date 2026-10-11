import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {embed,cosine,MODEL,DIMS,splitMarkdown} from '../server/embedding.mjs';
import {ensureKnowledge,knowledgeOverview,learningOverview,answerQuestion} from '../server/knowledge-store.mjs';
import {handleChat} from '../server/chat-handler.mjs';
import corpus from '../server/knowledge-data.json' with {type:'json'};
function setup(){
  const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
  for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
  const binding={prepare(sql){let params=[];return {bind(...p){params=p;return this;},async run(){return db.prepare(sql).run(...params);},async all(){return {results:db.prepare(sql).all(...params)};}};},async batch(statements){db.exec('BEGIN');try{for(const s of statements)await s.run();db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}};
  return {db,env:{DB:binding}};
}
test('local vectors are deterministic, finite, normalized and truthful',()=>{
  const a=embed('무료 30분 브랜드 진단 상담');assert.equal(a.length,DIMS);assert.deepEqual(a,embed('무료 30분 브랜드 진단 상담'));assert.ok(a.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...a)-1)<1e-6);assert.ok(cosine(a,embed('브랜드 상담'))>cosine(a,embed('우주 로켓 발사')));assert.equal(embed('').every(x=>x===0),true);assert.match(MODEL,/^local-hash/);
});
test('paragraphs preserve provenance, exclude change logs and cover all products',()=>{
  assert.deepEqual(new Set(corpus.chunks.map(x=>x.source)),new Set(['brand/identity.md','brand/voice.md','brand/audience.md','brand/content.md','server/products.json']));
  assert.equal(corpus.chunks.filter(x=>x.source==='server/products.json').length,4);
  assert.equal(splitMarkdown('# 제목\n\n문단 하나\n\n문단 둘\n\n## 변경 기록\n날짜','a.md').length,2);
  assert.equal(new Set(corpus.chunks.map(x=>x.id)).size,corpus.chunks.length);
});
test('D1-compatible schema persists 30 knowledge rows, goal and five feedback vectors idempotently',async()=>{
  const {db,env}=setup();await ensureKnowledge(env);await ensureKnowledge(env);await ensureKnowledge({DB:{...env.DB}});
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM knowledge_embeddings').get().n,corpus.chunks.length);
  assert.deepEqual(db.prepare('PRAGMA table_info(knowledge_embeddings)').all().map(x=>x.name),['id','source','title','chunk','model','dims','embedding','created_at']);
  const learning=await learningOverview(env);assert.equal(learning.goals.length,1);assert.equal(learning.feedback.length,5);assert.equal(learning.feedbackEmbeddings.length,5);assert.ok(learning.feedback.every(x=>x.is_sample===1));
  const k=await knowledgeOverview(env);assert.equal(k.items[0].vectorFirst5.length,5);assert.equal(k.model,MODEL);assert.equal(k.dims,512);assert.ok(!('embedding' in k.items[0]));
  for(const table of ['knowledge_embeddings','agent_learning_goals','agent_learning_feedback_embeddings'])for(const row of db.prepare(`SELECT embedding FROM ${table}`).all())assert.equal(JSON.parse(row.embedding).length,DIMS);
});
test('retrieval returns actual DB evidence, product answers and out-of-scope uncertainty',async()=>{
  const {env}=setup();
  for(const [q,expected] of [['프롬프트 PDF 가격은 얼마인가요?','19,000원'],['브랜드 진단 상담은 몇 분이고 무료인가요?','30분'],['니카쌤 경력','15년']]){
    const answer=await answerQuestion(q,env);assert.equal(answer.sources.length,3);assert.ok(answer.sources.some(x=>x.chunk.includes(expected)),q);assert.equal(answer.generated,false);assert.ok(answer.relevant);assert.ok(answer.sources.every(x=>x.source&&x.id));
  }
  const answer=await answerQuestion('목성 우주선 연료 계산',env);assert.equal(answer.relevant,false);assert.equal(answer.sources.length,3);
});
test('chat POST validates inputs and leaves no question/history rows or query text behind',async()=>{
  const {db,env}=setup();await ensureKnowledge(env);
  const snapshot=()=>JSON.stringify(db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({name})=>({name,rows:db.prepare(`SELECT * FROM ${name}`).all()})));
  const before=snapshot();
  const origin='https://soullab-tools.nikaya33.chatgpt.site';
  const req=(body,from=origin)=>new Request(origin+'/api/chat',{method:'POST',headers:{Origin:from,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const r=await handleChat(req({question:'고유한-저장금지-질문 PDF 가격'}),env);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(snapshot(),before);
  assert.equal((await handleChat(req({question:'x'}),env)).status,400);
  assert.equal((await handleChat(req({question:'가'.repeat(600)}),env)).status,400);
  assert.equal((await handleChat(req({question:'x'.repeat(5000)}),env)).status,413);
  assert.equal((await handleChat(req({question:'PDF 가격'},'https://other.example'),env)).status,403);
  assert.equal((await handleChat(req({question:'PDF 가격'}),{})).status,503);
});
