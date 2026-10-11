'use strict';
const statusEl=document.querySelector('#data-status');
function cell(row,value){const td=document.createElement('td');td.textContent=String(value??'');row.append(td);}
function fillTable(id,rows,fields){const body=document.getElementById(id);body.replaceChildren();for(const data of rows){const tr=document.createElement('tr');for(const field of fields)cell(tr,typeof field==='function'?field(data):data[field]);body.append(tr);}}
function vector(row){return '['+row.vectorFirst5.map(n=>Number(n).toFixed(5)).join(', ')+']';}
async function load(){
  statusEl.textContent='사이트 DB에서 불러오는 중…';statusEl.classList.remove('error');
  const button=document.querySelector('#reload-button');button.disabled=true;
  try{
    const learning=document.body.dataset.view==='learning';
    const response=await fetch(learning?'/api/admin/learning':'/api/admin/embeddings',{cache:'no-store'});
    const data=await response.json();if(!response.ok)throw new Error(data.message||'불러오지 못했습니다.');
    document.querySelector('#model').textContent=data.model;document.querySelector('#dims').textContent=data.dims+'차원';
    if(learning){
      document.querySelector('#schema').textContent=data.schema;
      fillTable('goals-body',data.goals,['id','goal','model','dims',vector]);
      fillTable('feedback-body',data.feedback,['id','goal_id',r=>r.rating==='good'?'좋음':'나쁨','draft','reason']);
      fillTable('feedback-embeddings-body',data.feedbackEmbeddings,['id','feedback_id','model','dims',vector]);
      statusEl.textContent=`저장 확인: 목표 ${data.goals.length}개 · 피드백 ${data.feedback.length}개 · 피드백 벡터 ${data.feedbackEmbeddings.length}개`;
    }else{
      document.querySelector('#table-name').textContent=data.table;
      fillTable('embeddings-body',data.items,['title','source','preview','model','dims',vector]);
      statusEl.textContent=`사이트 DB에 저장된 문단 ${data.count}개를 확인했습니다.`;
    }
  }catch(error){statusEl.textContent=error.message;statusEl.classList.add('error');}finally{button.disabled=false;}
}
document.querySelector('#reload-button').addEventListener('click',load);load();
