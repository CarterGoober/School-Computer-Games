/* Minimal chat and consent UI. All shared actions are checked by the server. */
'use strict';
let parkingBrake=true,winchReel=0,chatOpen=false,muted=new Set(),latestMultiplayer=null,lastChatId=0,chatFade=null,peopleSignature='',requestSignature='',multiplayerReceivedAt=0,towReplyPending=null,towExpiryTimer=null;
try{muted=new Set(JSON.parse(localStorage.getItem('hill-muted-v1')||'[]'));}catch{}
function parkingDisplay(){$('#parking-state').hidden=!parkingBrake;document.querySelector('[data-key=brake]').setAttribute('aria-pressed',String(parkingBrake));}
function toggleParking(){parkingBrake=!parkingBrake;parkingDisplay();sendInput();}
async function multiplayerAction(action){if(!connected){showLocation('Connect to use multiplayer');return false;}try{const response=await fetch('api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:userToken,...action}),signal:AbortSignal.timeout(5000)}),data=await response.json();if(!response.ok)throw Error(data.error||'Action unavailable');receiveSnapshot(data,netStats.rtt/2);return true;}catch(e){$('#chat-error').textContent=e.message;showLocation(e.message);return false;}}
function chatToggle(open){chatOpen=open;$('#chat').classList.toggle('open',open);$('#chat-form').hidden=!open;if(open){clear();$('#chat-input').focus();}else{$('#chat-input').blur();$('#chat-error').textContent='';}sendInput();}
function appendChat(message){if(muted.has(message.player))return;const row=document.createElement('div'),name=document.createElement('span');name.className='chat-name';name.textContent=message.name+': ';row.append(name,document.createTextNode(message.text));row.dataset.player=message.player;row.dataset.message=message.id;$('#chat-log').append(row);while($('#chat-log').children.length>20)$('#chat-log').firstElementChild.remove();$('#chat-log').scrollTop=$('#chat-log').scrollHeight;$('#chat').classList.add('recent');clearTimeout(chatFade);chatFade=setTimeout(()=>$('#chat').classList.remove('recent'),10000);}
function mute(id){if(muted.has(id))muted.delete(id);else muted.add(id);try{localStorage.setItem('hill-muted-v1',JSON.stringify([...muted]));}catch{}for(const row of $('#chat-log').children)if(muted.has(row.dataset.player))row.remove();if(latestMultiplayer)updateMultiplayer(latestMultiplayer);}
function button(text,handler){const b=document.createElement('button');b.textContent=text;b.type='button';b.onclick=handler;return b;}
function multiplayerTyping(target){return target?.isContentEditable||!!target?.closest('input,textarea,select,[role="textbox"]');}
function releaseTowControls(){clear();winchReel=0;sendInput();}
function facingTowEnd(from,to){return Math.sin(from.heading)*(to.x-from.x)+Math.cos(from.heading)*(to.z-from.z)>=0?'front':'rear';}
function nameplateState(element,playerId,data=latestMultiplayer){
 const target=data?.players.find(p=>p.id===playerId),local=data?.players.find(p=>p.id===session),distance=target&&local?Math.hypot(target.car.x-local.car.x,target.car.z-local.car.z):Infinity;
 element.disabled=!connected||!session||!target||!local||playerId===session||distance>20;
 const name=target?.name||'Explorer',label=target?name+' · '+Math.round(distance)+' m':name+' · unavailable';
 element.textContent=label;element.setAttribute('aria-label','Request tow from '+label+(distance>20&&target?' · Move within 20 m':''));element.title=element.getAttribute('aria-label');
 return{target,local,distance};
}
function wireNameplate(element,playerId){
 element.type='button';element.dataset.towPlayer=playerId;nameplateState(element,playerId);
 element.addEventListener('pointerdown',e=>{e.preventDefault();e.stopImmediatePropagation();releaseTowControls();});
 for(const type of ['pointerup','pointercancel','dblclick','contextmenu'])element.addEventListener(type,e=>e.stopImmediatePropagation());
 element.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')e.stopImmediatePropagation();});
 element.addEventListener('click',e=>{
  e.preventDefault();e.stopImmediatePropagation();if(!e.detail)releaseTowControls();
  const {target,local}=nameplateState(element,playerId);if(element.disabled)return;
  multiplayerAction({type:'towRequest',target:playerId,endA:facingTowEnd(local.car,target.car),endB:facingTowEnd(target.car,local.car)});
 });
}
function towServerNow(){return (latestMultiplayer?.serverTime||Date.now())+Math.max(0,performance.now()-multiplayerReceivedAt);}
function incomingTowRequests(){return connected&&session?(latestMultiplayer?.requests||[]).filter(r=>r.b===session&&r.expires>towServerNow()&&latestMultiplayer.players.some(p=>p.id===r.a)):[];}
function updateTowRequests(){
 const incoming=incomingTowRequests(),latest=incoming.at(-1),signature=incoming.map(r=>r.id+':'+r.endA+':'+r.endB+':'+latestMultiplayer.players.find(p=>p.id===r.a)?.name).join('|')+':'+towReplyPending;
 if(signature!==requestSignature){
  requestSignature=signature;const requests=$('#tow-requests');requests.replaceChildren();
  for(const r of incoming){const block=document.createElement('div'),name=latestMultiplayer.players.find(p=>p.id===r.a)?.name||'Explorer',accept=button('Accept',()=>replyToTow(r.id,true)),decline=button('Decline',()=>replyToTow(r.id,false));accept.disabled=decline.disabled=!!towReplyPending;block.append(document.createTextNode(name+' requests a tow connection ('+r.endA+' → '+r.endB+').'),accept,decline);requests.append(block);}
 }
 const prompt=$('#tow-prompt');prompt.hidden=!latest;
 if(latest){$('#tow-prompt-text').textContent=(latestMultiplayer.players.find(p=>p.id===latest.a)?.name||'Explorer')+' requests a tow.';$('#tow-accept').disabled=$('#tow-decline').disabled=!!towReplyPending;}
 clearTimeout(towExpiryTimer);towExpiryTimer=latest?setTimeout(updateTowRequests,Math.max(1,Math.min(...incoming.map(r=>r.expires-towServerNow())))):null;
}
async function replyToTow(request,accept){
 if(towReplyPending)return false;
 if(!incomingTowRequests().some(r=>r.id===request)){updateTowRequests();return false;}
 towReplyPending=request;releaseTowControls();updateTowRequests();
 try{return await multiplayerAction({type:'towReply',request,accept});}finally{towReplyPending=null;updateTowRequests();}
}
function acceptLatestTow(){const latest=incomingTowRequests().at(-1);if(!latest){updateTowRequests();return false;}return replyToTow(latest.id,true);}
function updateMultiplayer(data){
 if(data!==latestMultiplayer)multiplayerReceivedAt=performance.now();latestMultiplayer=data;
 for(const m of data.chat||[])if(m.id>lastChatId){appendChat(m);lastChatId=m.id;}
 for(const [id,r]of remote)nameplateState(r.label,id,data);
 const signature=data.players.map(p=>p.id+p.name+Math.round(Math.hypot(p.car.x-car.x,p.car.z-car.z)/2)+muted.has(p.id)).join('|');
 if(!$('#people-panel').hidden&&signature!==peopleSignature){
  peopleSignature=signature;const people=$('#people-list');people.replaceChildren();
  for(const p of data.players){if(p.id===session)continue;const row=document.createElement('div');row.className='person-row';const name=document.createElement('span'),distance=Math.hypot(p.car.x-car.x,p.car.z-car.z);name.textContent=p.name+' · '+Math.round(distance)+' m';row.append(name,button(muted.has(p.id)?'Unmute':'Mute',()=>mute(p.id)),button('Report',async()=>{if(await multiplayerAction({type:'report',target:p.id,reason:'Player reported from people list'})){muteIfNeeded(p.id);showLocation('Report saved for review','This explorer is muted on your device.');}}));const tow=button('Request tow',()=>multiplayerAction({type:'towRequest',target:p.id,endA:$('#winch-end').value,endB:$('#target-end').value}));tow.disabled=distance>20;row.append(tow);people.append(row);}
 }
 updateTowRequests();
 const cable=(data.cables||[]).find(c=>c.a===session||c.b===session);$('#winch-status').textContent=cable?'Cable '+cable.length.toFixed(1)+' m · '+Math.round((cable.tension||0)/1000)+' kN'+(cable.owner===session?' · E/Q reel':' · Other explorer controls reel'):'Click a nearby explorer’s name to request a tow.';for(const b of document.querySelectorAll('[data-reel]'))b.disabled=!cable||cable.owner!==session;$('#winch-detach').disabled=!cable;
}
function muteIfNeeded(id){if(!muted.has(id))mute(id);}
$('#people-toggle').onclick=()=>{$('#people-panel').hidden=!$('#people-panel').hidden;$('#winch-panel').hidden=true;if(latestMultiplayer)updateMultiplayer(latestMultiplayer);};$('#people-close').onclick=()=>$('#people-panel').hidden=true;$('#winch-toggle').onclick=()=>{$('#winch-panel').hidden=!$('#winch-panel').hidden;$('#people-panel').hidden=true;};$('#winch-close').onclick=()=>$('#winch-panel').hidden=true;$('#winch-detach').onclick=()=>multiplayerAction({type:'towDetach'});
$('#tow-accept').onclick=()=>acceptLatestTow();$('#tow-decline').onclick=()=>{const latest=incomingTowRequests().at(-1);if(latest)replyToTow(latest.id,false);};
$('#chat-form').onsubmit=async e=>{e.preventDefault();const text=$('#chat-input').value;if(await multiplayerAction({type:'chat',text})){$('#chat-input').value='';chatToggle(false);}};
for(const b of document.querySelectorAll('[data-reel]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);winchReel=Number(b.dataset.reel);sendInput();};for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>{winchReel=0;sendInput();});}
const stop=document.querySelector('[data-key=brake]');stop.addEventListener('pointerdown',e=>{e.preventDefault();e.stopImmediatePropagation();if(mode==='playing')toggleParking();},true);
addEventListener('keydown',e=>{
 if(e.key==='Escape'&&chatOpen){e.preventDefault();e.stopImmediatePropagation();chatToggle(false);return;}
 if(multiplayerTyping(e.target))return;
 if(e.target.closest('button,a')&&(e.key==='Enter'||e.key===' '))return;
 if(e.key==='Enter'&&mode==='playing'){e.preventDefault();e.stopImmediatePropagation();chatToggle(!chatOpen);return;}
 if(mode!=='playing'||chatOpen||e.repeat)return;
 if(e.code==='ControlRight'){e.preventDefault();e.stopImmediatePropagation();acceptLatestTow();return;}
 if(e.code==='Space'){e.preventDefault();e.stopImmediatePropagation();toggleParking();}
 if(e.key.toLowerCase()==='e'||e.key.toLowerCase()==='q'){winchReel=e.key.toLowerCase()==='e'?-1:1;sendInput();}
 if(e.key.toLowerCase()==='x')multiplayerAction({type:'towDetach'});
},true);
addEventListener('keyup',e=>{if(['e','q'].includes(e.key.toLowerCase())){winchReel=0;sendInput();}});addEventListener('blur',()=>winchReel=0);parkingDisplay();
