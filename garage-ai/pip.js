/* Progressive enhancement: the existing panel and session stay in this document. */
(() => {
 const panel=document.querySelector('#assistant'), tools=document.querySelector('.panel-head');
 const pop=document.createElement('button');pop.textContent='Float';pop.title='Keep chat visible across tabs';tools.append(pop);
 let floating=null,marker=null;
 for(const id of ['panel-settings','panel-account','add-text','minimize'])panel.querySelector('#'+id)?.addEventListener('click',()=>{if(floating){floating.close();window.focus()}},true);
 pop.onclick=async()=>{
  if(floating){floating.focus();return}
  if(!window.documentPictureInPicture){panel.querySelector('#status').textContent='Floating windows are unavailable in this browser. Use the expandable chat panel.';return}
  try{
   floating=await documentPictureInPicture.requestWindow({width:440,height:680});
   marker=document.createComment('chat panel');panel.before(marker);
   for(const sheet of document.querySelectorAll('link[rel=stylesheet]')){const copy=sheet.cloneNode();copy.href=sheet.href;floating.document.head.append(copy)}
   floating.document.body.dataset.theme=document.body.dataset.theme;
   const style=floating.document.createElement('style');style.textContent='#assistant{position:static!important;width:100%!important;height:100vh!important;max-height:none!important;margin:0!important;border-radius:0!important}';floating.document.head.append(style);
   // Move the actual panel; keep its event handlers and account state.
   floating.document.body.append(panel);
   floating.addEventListener('pagehide',()=>{marker.replaceWith(panel);floating=null;marker=null},{once:true});
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
