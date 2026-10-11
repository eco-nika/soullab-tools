'use strict';
const form=document.getElementById('inquiry');
const output=document.getElementById('output');
let currentDraft=null;
let toastTimer;
let silentReset=false;
function notify(message){const toast=document.getElementById('toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),3500);}
function setBadge(text,ready){const badge=document.getElementById('result-badge');badge.textContent=text;badge.classList.toggle('ready',ready);}
function clearOutput(){currentDraft=null;output.hidden=true;document.getElementById('empty-state').hidden=false;document.getElementById('email-output').textContent='';document.getElementById('curriculum-body').replaceChildren();document.getElementById('checklist-output').replaceChildren();document.getElementById('summary').textContent='';document.getElementById('curriculum-note').textContent='';document.getElementById('stale').hidden=true;setBadge('작성 대기',false);}
form.addEventListener('submit',event=>{
  event.preventDefault();
  const institution=document.getElementById('institution');
  if(!institution.value.trim()){institution.setCustomValidity('기관명을 입력해 주세요.');institution.reportValidity();return;}
  institution.setCustomValidity('');
  if(!form.reportValidity()) return;
  const data=Object.fromEntries(new FormData(form));
  currentDraft=buildDraft(data);
  document.getElementById('email-output').textContent=currentDraft.email;
  document.getElementById('summary').textContent=currentDraft.summary;
  document.getElementById('curriculum-note').textContent=currentDraft.timing;
  const tbody=document.getElementById('curriculum-body');tbody.replaceChildren();
  for(const row of currentDraft.rows){
    const tr=document.createElement('tr');
    const period=document.createElement('td');period.textContent=`${row.period}교시`;
    const range=document.createElement('small');range.textContent=row.range;period.append(range);
    const content=document.createElement('td');const title=document.createElement('strong');title.textContent=row.title;content.append(title,document.createTextNode(row.description));
    const time=document.createElement('small');time.textContent=row.breakLabel;content.append(time);
    const outcome=document.createElement('td');outcome.textContent=row.outcome;tr.append(period,content,outcome);tbody.append(tr);
  }
  const list=document.getElementById('checklist-output');list.replaceChildren();
  for(const item of currentDraft.checklist){const label=document.createElement('label');const checkbox=document.createElement('input');checkbox.type='checkbox';const span=document.createElement('span');span.textContent=item;label.append(checkbox,span);list.append(label);}
  output.hidden=false;document.getElementById('empty-state').hidden=true;document.getElementById('stale').hidden=true;setBadge('작성 완료',true);
  document.querySelectorAll('.copy').forEach(button=>button.disabled=false);
  notify('회신 메일, 커리큘럼, 준비물 초안이 준비되었습니다.');
  if(window.matchMedia('(max-width: 760px)').matches) document.getElementById('results-title').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  document.getElementById('results-title').focus({preventScroll:true});
});
form.addEventListener('input',()=>{document.getElementById('institution').setCustomValidity('');if(currentDraft){document.getElementById('stale').hidden=false;setBadge('수정 사항 있음',false);document.querySelectorAll('.copy').forEach(button=>button.disabled=true);}});
form.addEventListener('reset',()=>{clearOutput();if(!silentReset)notify('입력과 결과를 모두 지웠습니다.');});
async function copyText(text){
  try{if(navigator.clipboard && window.isSecureContext){await navigator.clipboard.writeText(text);return;}}catch(error){/* Use local clipboard fallback when permission is unavailable. */}
  const area=document.createElement('textarea');area.value=text;area.className='sr-only';area.setAttribute('readonly','');document.body.append(area);area.select();area.setSelectionRange(0,area.value.length);
  let copied=false;try{copied=document.execCommand('copy');}finally{area.remove();}
  if(!copied)throw new Error('Clipboard unavailable');
}
document.querySelectorAll('.copy').forEach(button=>button.addEventListener('click',async()=>{
  if(!currentDraft)return;
  const kind=button.dataset.copy;
  let text=kind==='email'?currentDraft.email:currentDraft.curriculumText;
  if(kind==='checklist'){const checks=[...document.querySelectorAll('#checklist-output input')];text='강의 전 준비물 체크리스트\n\n'+currentDraft.checklist.map((item,i)=>`${checks[i].checked?'☑':'☐'} ${item}`).join('\n');}
  try{await copyText(text);notify('복사했습니다. 메일이나 문서에 붙여넣으세요.');button.focus({preventScroll:true});}catch(error){notify('복사 권한을 사용할 수 없습니다. 결과 내용을 직접 선택해 복사해 주세요.');}
}));
// Prevent history navigation / the back-forward cache from restoring inquiry data.
function resetForNavigation(){silentReset=true;form.reset();clearOutput();silentReset=false;clearTimeout(toastTimer);document.getElementById('toast').classList.remove('show');}
window.addEventListener('pagehide',resetForNavigation);
window.addEventListener('pageshow',resetForNavigation);
