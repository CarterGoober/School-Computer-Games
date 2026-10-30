(() => {
 'use strict';
 const URL='https://gvurobdhsvcvdywdsgne.supabase.co/rest/v1/rpc/';
 const KEY='sb_publishable_ybsqZOeS8tIvyA6iHN8rgw_ThhIZhiF';
 const form=document.querySelector('#feedback-form'),status=document.querySelector('#feedback-status'),list=document.querySelector('#feedback-list');
 const fields=['username','game','kind','rating','title','message'];
 const storageKey='afterclass-feedback-draft';let pending=null,clientId,loadSequence=0;
 const uuid=()=>crypto.randomUUID();
 const read=k=>{try{return localStorage.getItem(k);}catch{return null;}};
 const write=(k,v)=>{try{localStorage.setItem(k,v);return true;}catch{return false;}};
 clientId=read('afterclass-feedback-client')||uuid();write('afterclass-feedback-client',clientId);
 try{const draft=JSON.parse(read(storageKey));if(draft){for(const key of fields)if(draft[key]!=null)form.elements[key].value=draft[key];pending=draft.pending||null;}}catch{}
 const values=()=>Object.fromEntries(fields.map(k=>[k,form.elements[k].value]));
 function saveDraft(){return write(storageKey,JSON.stringify({...values(),pending}));}
 function ratingState(){form.elements.rating.disabled=form.elements.kind.value!=='review';form.elements.rating.required=!form.elements.rating.disabled;}
 form.addEventListener('input',()=>{pending=null;saveDraft();ratingState();});ratingState();
 async function rpc(name,body){
  const response=await fetch(URL+name,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  let data;try{data=await response.json();}catch{throw Error('The server did not confirm the request. Your draft is kept.');}
  if(!response.ok)throw Error(data.message||'Feedback is unavailable. Your draft is kept.');return data;
 }
 const node=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;return el;};
 async function load(){
  const seq=++loadSequence;list.setAttribute('aria-busy','true');
  try{
   const data=await rpc('list_garage_feedback_v2',{p_game:document.querySelector('#feedback-game-filter').value,p_kind:document.querySelector('#feedback-kind-filter').value,p_limit:20});
   if(seq!==loadSequence)return;
   document.querySelector('#feedback-average').textContent=data.rating_count?`${data.average} / 5 · ${data.rating_count} reviews (latest per browser and game)`:'No ratings yet. Be the first to review.';
   list.replaceChildren();
   for(const entry of data.entries){const card=node('article','');card.className='feedback-entry';
    card.append(node('small',`${entry.username} · ${entry.game} · ${entry.kind} · ${new Date(entry.created_at).toLocaleDateString()}`),node('h3',entry.title));
    if(entry.kind==='review')card.append(node('p',`${'★'.repeat(entry.rating)}${'☆'.repeat(5-entry.rating)} · ${entry.rating}/5`));
    card.append(node('p',entry.message));list.append(card);
   }
   if(!data.entries.length)list.append(node('p','No feedback matches these filters.'));
  }catch{if(seq===loadSequence)list.replaceChildren(node('p','Public feedback needs an internet connection. Try Refresh when online.'));}
  finally{if(seq===loadSequence)list.setAttribute('aria-busy','false');}
 }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const data=values();if(!pending)pending=uuid();saveDraft();
  const button=form.querySelector('[type=submit]');button.disabled=true;for(const key of fields)form.elements[key].disabled=true;
  status.textContent='Sending…';
  try{
   const result=await rpc('submit_garage_feedback',{p_id:pending,p_client_id:clientId,p_username:data.username.trim(),p_game:data.game,p_kind:data.kind,p_rating:data.kind==='review'?Number(data.rating):null,p_title:data.title.trim(),p_message:data.message.trim(),p_website:form.elements.website.value});
   if(result?.id!==pending||!result.created_at)throw Error('The server did not confirm your submission. Your draft is kept.');
   status.textContent='Posted. Thank you for your feedback!';pending=null;form.elements.title.value='';form.elements.message.value='';saveDraft();await load();
  }catch(error){status.textContent=`${error.message} Your draft is still here; retry when ready.`;saveDraft();}
  finally{button.disabled=false;for(const key of fields)form.elements[key].disabled=false;ratingState();}
 });
 for(const id of ['feedback-game-filter','feedback-kind-filter'])document.getElementById(id).addEventListener('change',load);
 document.querySelector('#feedback-refresh').addEventListener('click',load);load();
})();
