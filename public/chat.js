'use strict';
const form=document.getElementById('chat-form'),input=document.getElementById('question'),answer=document.getElementById('answer'),sources=document.getElementById('sources'),statusEl=document.getElementById('chat-status'),send=document.getElementById('send');
let controller;
function clear(){controller?.abort();controller=null;input.value='';answer.hidden=true;sources.replaceChildren();statusEl.textContent='';send.disabled=false;}
function show(data){
  document.getElementById('answer-message').textContent=data.message;
  document.getElementById('answer-mode').textContent='근거 문단 검색 · LLM 답변 생성 없음';sources.replaceChildren();
  data.sources.forEach((row,i)=>{
    const article=document.createElement('article');article.className='source-card';
    const title=document.createElement('h3');title.textContent=`[${i+1}] ${row.title}`;
    const meta=document.createElement('p');meta.className='source-meta';meta.textContent=`출처: ${row.source} · 코사인 유사도 ${row.score.toFixed(4)} (정답 확률이 아닙니다)`;
    const text=document.createElement('p');text.className='source-text';text.textContent=row.chunk;
    article.append(title,meta,text);sources.append(article);
  });answer.hidden=false;
}
form.addEventListener('submit',async event=>{
  event.preventDefault();if(send.disabled)return;const question=input.value.trim();
  if(question.length<2){statusEl.textContent='질문을 두 글자 이상 적어 주세요.';return;}
  controller=new AbortController();const active=controller;send.disabled=true;statusEl.textContent='소울랩 자료에서 가까운 문단을 찾고 있어요.';answer.hidden=true;
  try{
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question}),cache:'no-store',signal:active.signal});
    const data=await response.json();if(!response.ok)throw new Error(data.message||'검색하지 못했습니다.');
    if(controller!==active)return;show(data);statusEl.textContent='검색을 마쳤습니다.';
  }catch(error){if(error.name!=='AbortError')statusEl.textContent=error.message;}finally{if(controller===active){send.disabled=false;controller=null;}}
});
document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.question;input.focus();}));
document.getElementById('clear-chat').addEventListener('click',()=>{clear();input.focus();});
window.addEventListener('pagehide',clear);window.addEventListener('pageshow',event=>{if(event.persisted)clear();});
