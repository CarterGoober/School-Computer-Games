/* Progressive enhancement: the existing panel and session stay in this document. */
(() => {
 const panel=document.querySelector('#assistant'), tools=document.querySelector('.panel-head');
 const pop=document.createElement('button');pop.textContent='Float';pop.title='Keep chat visible across tabs';tools.append(pop);
 let floating=null,marker=null,bar=null,collapsed=false,expandedSize=null,lastFocus=null,lastResize=0;
 const minimize=panel.querySelector('#minimize');
 function setCollapsed(value){
  if(!floating||collapsed===value)return;
  collapsed=value;
  if(value){
   if(!expandedSize||Date.now()-lastResize>300)expandedSize={width:floating.outerWidth,height:floating.outerHeight};
   lastFocus=floating.document.activeElement;
  }
  floating.document.body.classList.toggle('pip-collapsed',value);
  bar.hidden=!value;
  minimize.setAttribute('aria-expanded',String(!value));
  // Resize the same window. Chrome may clamp the requested outer dimensions.
  lastResize=Date.now();
  try{floating.resizeTo(value?280:expandedSize.width,value?88:expandedSize.height)}catch{}
  if(value)bar.focus();else if(lastFocus?.isConnected)lastFocus.focus();
 }
 minimize.addEventListener('click',event=>{
  if(!floating)return;
  event.preventDefault();event.stopImmediatePropagation();setCollapsed(true);
 },true);
 for(const id of ['panel-settings','panel-account','add-text'])panel.querySelector('#'+id)?.addEventListener('click',()=>{if(floating){floating.close();window.focus()}},true);
 pop.onclick=async()=>{
  if(floating){floating.focus();return}
  if(!window.documentPictureInPicture){panel.querySelector('#status').textContent='Floating windows are unavailable in this browser. Use the expandable chat panel.';return}
  try{
   floating=await documentPictureInPicture.requestWindow({width:440,height:680});
   marker=document.createComment('chat panel');panel.before(marker);
   for(const sheet of document.querySelectorAll('link[rel=stylesheet]')){const copy=sheet.cloneNode();copy.href=sheet.href;floating.document.head.append(copy)}
   floating.document.body.dataset.theme=document.body.dataset.theme;
   const style=floating.document.createElement('style');style.textContent=`body{margin:0;min-width:0;background:#09131f}#assistant{position:static!important;width:100%!important;height:100vh!important;max-height:none!important;margin:0!important;border-radius:0!important}.pip-collapsed #assistant{display:none!important}#pip-bar{box-sizing:border-box;width:calc(100% - 12px);max-width:360px;margin:6px;min-height:44px;display:flex;align-items:center;gap:10px;padding:10px 14px;background:linear-gradient(115deg,#142c3b,#0d1b2b);border:1px solid #397183;border-radius:14px;color:#e7fbff;font:600 14px system-ui;cursor:pointer;box-shadow:0 2px 14px #00d5ff12}#pip-bar[hidden]{display:none}#pip-bar:focus-visible{outline:2px solid #63def1;outline-offset:2px}#pip-bar .sparkle{color:#7ae5f5;font-size:20px}#pip-bar .restore{margin-left:auto;color:#7ae5f5;font-size:18px}`;floating.document.head.append(style);
   // Move the actual panel; keep its event handlers and account state.
   bar=floating.document.createElement('button');bar.id='pip-bar';bar.type='button';bar.hidden=true;bar.setAttribute('aria-label','Expand Garage AI chat');
   bar.innerHTML='<span class="sparkle" aria-hidden="true">✦</span><span>Garage AI</span><span class="restore" aria-hidden="true">↗</span>';
   bar.onclick=()=>setCollapsed(false);
   floating.document.body.append(panel,bar);
   minimize.setAttribute('aria-label','Minimize floating chat');minimize.title='Minimize to floating bar';minimize.setAttribute('aria-expanded','true');
   floating.addEventListener('pagehide',()=>{marker.replaceWith(panel);floating=null;marker=null;bar=null;collapsed=false;expandedSize=null;lastFocus=null;minimize.setAttribute('aria-label','Minimize chat');minimize.removeAttribute('aria-expanded')},{once:true});
  }catch{panel.querySelector('#status').textContent='The browser could not open a floating window.'}
 };
 const capture=document.createElement('button');capture.textContent='Capture screenshot';panel.querySelector('.tools').prepend(capture);
 capture.onclick=async()=>{
  let stream;
  try{
   if(!navigator.mediaDevices?.getDisplayMedia)throw Error('Screen capture is unavailable. Upload a screenshot instead.');
   stream=await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
   const video=document.createElement('video');video.srcObject=stream;video.muted=true;await video.play();
   const canvas=document.createElement('canvas');const scale=Math.min(1,1600/Math.max(video.videoWidth,video.videoHeight));canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   if(!blob)throw Error('Screenshot could not be prepared.');
   const transfer=new DataTransfer();transfer.items.add(new File([blob],'screenshot.png',{type:'image/png'}));const file=panel.querySelector('#file');file.files=transfer.files;file.dispatchEvent(new Event('change'));
  }catch(e){panel.querySelector('#status').textContent=e.name==='NotAllowedError'?'Capture canceled. Nothing was uploaded.':e.message}
  finally{stream?.getTracks().forEach(track=>track.stop())}
 };
})();
