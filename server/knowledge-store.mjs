import corpus from './knowledge-data.json' with {type:'json'};
import {MODEL,DIMS,embed,cosine,lexicalOverlap} from './embedding.mjs';
import {sampleGoal,sampleFeedback} from './learning-data.mjs';
const initialized=new WeakMap();
export const TABLES={knowledge:'knowledge_embeddings',goals:'agent_learning_goals',feedback:'agent_learning_feedback',feedbackEmbeddings:'agent_learning_feedback_embeddings'};
export async function ensureKnowledge(env) {
  const db=env.DB;if(!db)throw new Error('Database unavailable');
  if(initialized.has(db))return initialized.get(db);
  const pending=(async()=>{
    const now=new Date().toISOString();
    const statements=corpus.chunks.map(row=>db.prepare('INSERT OR IGNORE INTO knowledge_embeddings (id,source,title,chunk,model,dims,embedding,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(row.id,row.source,row.title,row.chunk,row.model,row.dims,JSON.stringify(row.embedding),now));
    statements.push(db.prepare('INSERT OR IGNORE INTO agent_learning_goals (id,goal,is_sample,model,dims,embedding,created_at) VALUES (?,?,1,?,?,?,?)').bind(sampleGoal.id,sampleGoal.goal,MODEL,DIMS,JSON.stringify(embed(sampleGoal.goal)),now));
    for(const row of sampleFeedback){
      statements.push(db.prepare('INSERT OR IGNORE INTO agent_learning_feedback (id,goal_id,draft,rating,reason,is_sample,created_at) VALUES (?,?,?,?,?,1,?)').bind(row.id,sampleGoal.id,row.draft,row.rating,row.reason,now));
      statements.push(db.prepare('INSERT OR IGNORE INTO agent_learning_feedback_embeddings (id,feedback_id,model,dims,embedding,created_at) VALUES (?,?,?,?,?,?)').bind('embedding-'+row.id,row.id,MODEL,DIMS,JSON.stringify(embed(row.draft+'\n'+row.rating+'\n'+row.reason)),now));
    }
    await db.batch(statements);
  })();
  initialized.set(db,pending);
  try{await pending;}catch(error){initialized.delete(db);throw error;}
}
function vector(row){const v=JSON.parse(row.embedding);if(row.model!==MODEL||row.dims!==DIMS||!Array.isArray(v)||v.length!==DIMS||v.some(x=>typeof x!=='number'||!Number.isFinite(x)))throw new Error('Invalid stored vector');return v;}
function summary(row){const v=vector(row);const {embedding,...rest}=row;return {...rest,preview:row.chunk?.slice(0,180),vectorFirst5:v.slice(0,5),nonzero:v.filter(x=>x!==0).length};}
export async function knowledgeRows(env){
  await ensureKnowledge(env);
  // Select this build's paragraph IDs, so an older deployed corpus cannot pollute retrieval.
  const ids=corpus.chunks.map(x=>x.id);
  const result=await env.DB.prepare(`SELECT id,source,title,chunk,model,dims,embedding,created_at FROM knowledge_embeddings WHERE id IN (${ids.map(()=>'?').join(',')}) ORDER BY source,title,id`).bind(...ids).all();
  return result.results||[];
}
export async function knowledgeOverview(env){const rows=await knowledgeRows(env);return {table:TABLES.knowledge,model:MODEL,dims:DIMS,count:rows.length,mode:'local',items:rows.map(summary)};}
export async function learningOverview(env){
  await ensureKnowledge(env);
  const [g,f,e]=await Promise.all([
    env.DB.prepare('SELECT id,goal,is_sample,model,dims,embedding,created_at FROM agent_learning_goals ORDER BY id').all(),
    env.DB.prepare('SELECT id,goal_id,draft,rating,reason,is_sample,created_at FROM agent_learning_feedback ORDER BY id').all(),
    env.DB.prepare('SELECT id,feedback_id,model,dims,embedding,created_at FROM agent_learning_feedback_embeddings ORDER BY id').all(),
  ]);
  return {schema:'agent_learning_ (D1 테이블 접두어)',tables:TABLES,model:MODEL,dims:DIMS,testOnly:true,goals:(g.results||[]).map(summary),feedback:f.results||[],feedbackEmbeddings:(e.results||[]).map(summary)};
}
export async function answerQuestion(question,env){
  const q=String(question).trim();if(q.length<2||q.length>500)throw new RangeError('Question length');
  const queryVector=embed(q);
  const rows=await knowledgeRows(env);
  const ranked=rows.map(row=>({...row,score:cosine(queryVector,vector(row))})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,3);
  const relevant=ranked.some(row=>row.score>=0.12&&lexicalOverlap(q,row.chunk));
  return {mode:'retrieval-only',model:MODEL,dims:DIMS,generated:false,relevant,message:relevant?'질문과 가까운 소울랩 문단 3개를 찾았습니다. 아래 원문과 출처를 확인해 주세요.':'등록된 자료에서 질문에 대한 근거를 충분히 찾지 못했습니다. 아래는 벡터가 가장 가까운 참고 문단이며, 질문의 답이라고 단정할 수 없습니다.',sources:ranked.map(({id,source,title,chunk,score})=>({id,source,title,chunk,score:Number(score.toFixed(4))}))};
}
