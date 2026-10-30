(() => {
 'use strict';
 const P=RumblePhysics,canvas=document.querySelector('#court'),ctx=canvas.getContext('2d'),overlay=document.querySelector('#overlay');
 let state=P.create(),started=false,paused=false,last=0,accumulator=0,announced='',width=0,height=0,scale=1,offsetY=0;
 const inputs=new Map(),colors=['#7a9065','#bf7856'];
 function resize(){width=innerWidth;height=document.querySelector('#game').clientHeight;const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);scale=Math.min(width/1000,height/650);offsetY=(height-580*scale)*.5;}
 addEventListener('resize',resize);resize();
 function line(x,y,a,b,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);ctx.stroke();}
 function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
 function draw(){
  const dpr=Math.min(devicePixelRatio||1,2),c=state.condition;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#f1ebdc');sky.addColorStop(1,'#e3e3cc');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  ctx.translate((width-1000*scale)/2,offsetY);ctx.scale(scale,scale);
  circle(775,112,38,'#e9d5a9');
  // Muted hills and the neighborhood share the hub's paper-and-sage palette.
  ctx.fillStyle='#cbd0b4';ctx.beginPath();ctx.moveTo(-100,360);ctx.bezierCurveTo(120,180,210,360,390,270);ctx.bezierCurveTo(650,130,800,330,1100,220);ctx.lineTo(1100,510);ctx.lineTo(-100,510);ctx.fill();
  ctx.fillStyle='#b8c1a4';ctx.beginPath();ctx.moveTo(-100,370);ctx.bezierCurveTo(150,280,270,420,500,335);ctx.bezierCurveTo(700,250,910,345,1100,300);ctx.lineTo(1100,510);ctx.lineTo(-100,510);ctx.fill();
  for(let i=0;i<13;i++){const x=i*88-40,h=35+i*37%85;ctx.fillStyle=i%2?'#b2b9a0':'#bdbea6';ctx.fillRect(x,430-h,64,h+65);ctx.fillStyle='#dedfcb';for(let y=443-h;y<428;y+=20)for(let w=12;w<60;w+=20)ctx.fillRect(x+w,y,8,11);line(x-3,430-h,x+67,430-h,'#9fa98f',4);}
  for(const [x,y,r]of [[15,355,43],[225,389,27],[790,387,28],[980,360,42]]){line(x,y,x,500,'#939e80',6);circle(x,y,r,'#a5b18f');circle(x-13,y-8,r*.68,'#b0ba99');}
  line(-100,413,1100,413,'#8c9a8055',3);for(let x=-100;x<1100;x+=30)line(x,413,x,510,'#8c9a8033',1);
  const groundY=510;ctx.fillStyle=c.id==='ice'?'#bcd2cb':'#d4b28d';ctx.fillRect(-100,groundY,1200,height/scale+600);
  ctx.fillStyle=c.id==='ice'?'#a8c5bd':'#b48d69';ctx.fillRect(-100,565,1200,5);
  ctx.strokeStyle='#f2e8cd';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(500,537,76,20,0,0,Math.PI*2);ctx.moveTo(500,511);ctx.lineTo(500,565);ctx.stroke();
  ctx.beginPath();ctx.ellipse(100,537,105,23,0,-Math.PI/2,Math.PI/2);ctx.stroke();ctx.beginPath();ctx.ellipse(900,537,105,23,0,Math.PI/2,Math.PI*1.5);ctx.stroke();
  ctx.fillStyle='#79846430';for(const p of state.players){ctx.beginPath();ctx.ellipse(p.x,518,26,5,0,0,Math.PI*2);ctx.fill();}
  for(let i=0;i<2;i++){
   const x=P.hoops[i],board=i===0?x-P.halfRim-10:x+P.halfRim+10;
   line(board,180,board,510,'#6c7c61',7);line(board-4,165,board-4,257,'#f3efdf',12);line(board-4,170,board-4,253,'#c1c5af',2);
   for(let j=-3;j<=3;j++)line(x+j*10.5,249,x+j*6,287,'#f6f0db',1.6);
   line(x-18,287,x+18,287,'#f6f0db',2);line(x-35,245,x+35,245,'#ac6547',6);
  }
  for(const p of state.players){
   const n=p.nodes,color=colors[p.team],shoulder={x:n[0].x,y:n[1].y-34};
   // Knees flex while running, but the head always stays above the hips.
   for(const foot of [n[4],n[5]]){const knee={x:(n[1].x+foot.x)/2+p.facing*5,y:(n[1].y+foot.y)/2};line(n[1].x,n[1].y,knee.x,knee.y,'#59634c',11);line(knee.x,knee.y,foot.x,foot.y,'#c9956e',8);line(foot.x-5,foot.y,foot.x+10,foot.y,'#f2edda',8);}
   for(const hand of [n[2],n[3]]){const elbow={x:(shoulder.x+hand.x)/2+p.facing*10,y:(shoulder.y+hand.y)/2+8};line(shoulder.x,shoulder.y,elbow.x,elbow.y,'#ce9e78',9);line(elbow.x,elbow.y,hand.x,hand.y,'#ce9e78',8);circle(hand.x,hand.y,4.5,'#ce9e78');}
   line(shoulder.x,shoulder.y,n[1].x,n[1].y-5,color,28);line(n[1].x-11,n[1].y-3,n[1].x+11,n[1].y-3,'#59634c',9);
   ctx.fillStyle='#f3ecd5';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.fillText(String(p.index+1),n[1].x,n[1].y-13);
   circle(n[0].x,n[0].y,16,'#d6aa80');ctx.fillStyle=p.index%2?'#6c5845':'#4e5140';ctx.beginPath();ctx.arc(n[0].x,n[0].y-3,16,Math.PI,Math.PI*2);ctx.fill();
   circle(n[0].x+p.facing*6,n[0].y,1.7,'#3b4535');line(n[0].x+p.facing*4,n[0].y+7,n[0].x+p.facing*9,n[0].y+6,'#9d7252',1.5);
  }
  const b=state.ball;circle(b.x,b.y,b.r+1.5,'#8c603f');circle(b.x,b.y,b.r,c.id==='beach'?'#ebd09c':c.id==='heavy'?'#8e9988':'#cb8d4c');
  ctx.save();ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.clip();line(b.x-b.r,b.y,b.x+b.r,b.y,'#926a47',1.4);ctx.strokeStyle='#926a47';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(b.x,b.y,b.r*.5,b.r,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  if(c.wind){ctx.fillStyle='#869476';ctx.font='16px Georgia';ctx.textAlign='center';ctx.fillText(c.wind>0?'→   →   →':'←   ←   ←',500,118);}
 }
 function sync(){
  document.querySelector('#blue-score').textContent=state.scores[0];document.querySelector('#pink-score').textContent=state.scores[1];
  document.querySelector('#condition').textContent=state.condition.name;
  const finished=state.phase==='finished';overlay.hidden=started&&!paused&&!finished;
  document.querySelector('#restart').hidden=!started;
  document.querySelector('#start').textContent=finished?'Play again →':paused?'Resume →':'Play →';
  document.querySelector('#menu-title').innerHTML=finished?(state.winner===0?'Sage wins.':'Clay wins.'):paused?'Take a<br><em>breather.</em>':'Rooftop<br><em>Rumble.</em>';
  document.querySelector('#mode').disabled=false;
  const roundMessage=document.querySelector('#round-message');roundMessage.hidden=state.phase!=='round'||paused;roundMessage.textContent=state.phase==='round'?`${state.lastScore===0?'Sage':'Clay'} +${state.condition.points}`:'';
  document.querySelector('#touch-controls').hidden=!overlay.hidden;
  document.querySelector('#pause').hidden=!started||!overlay.hidden;
  const status=finished?`${state.winner===0?'Sage':'Clay'} wins ${state.scores.join(' to ')}.`:paused?'Paused.':`${state.scores.join(' to ')}. ${state.condition.name}.`;
  if(status!==announced){document.querySelector('#match-status').textContent=status;announced=status;}
 }
 function down(source,index){if(!started||paused||state.phase!=='playing'||inputs.has(source))return;const already=[...inputs.values()].includes(index);inputs.set(source,index);if(!already)P.press(state,index);paintButtons();}
 function up(source,cancel=false){const index=inputs.get(source);if(index===undefined)return;inputs.delete(source);if(![...inputs.values()].includes(index))P.release(state,index,cancel);paintButtons();}
 function clear(){inputs.clear();P.cancelInput(state);paintButtons();}
 function paintButtons(){document.querySelectorAll('#touch-controls button').forEach((b,i)=>b.classList.toggle('pressed',[...inputs.values()].includes(i)));}
 function buttons(){
  const four=Number(document.querySelector('#mode').value)===4,box=document.querySelector('#touch-controls');box.className=four?'four':'two';box.replaceChildren();
  const labels=four?['W · 1','R · 2','I · 3','P · 4']:['W · HOLD','↑ · HOLD'];
  labels.forEach((label,i)=>{const b=document.createElement('button');b.textContent=label;b.className=i>=(four?2:1)?'sun':'';b.setAttribute('aria-label',`Player ${i+1}: hold to raise, release to shoot`);
   b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);down('pointer'+e.pointerId,i);};
   b.onpointerup=e=>up('pointer'+e.pointerId);b.onpointercancel=e=>up('pointer'+e.pointerId,true);b.onlostpointercapture=e=>up('pointer'+e.pointerId,true);
   b.onkeydown=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();down('button'+i,i);}};b.onkeyup=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();up('button'+i);}};box.append(b);});
 }
 canvas.onpointerdown=e=>{e.preventDefault();canvas.setPointerCapture(e.pointerId);const rect=canvas.getBoundingClientRect();down('pointer'+e.pointerId,Math.min(state.mode-1,Math.floor((e.clientX-rect.left)/rect.width*state.mode)));};
 canvas.onpointerup=e=>up('pointer'+e.pointerId);canvas.onpointercancel=e=>up('pointer'+e.pointerId,true);canvas.onlostpointercapture=e=>up('pointer'+e.pointerId,true);
 function restart(){clear();state=P.create(Number(document.querySelector('#mode').value));started=true;paused=false;accumulator=0;buttons();sync();canvas.focus();}
 canvas.tabIndex=0;
 function pause(){if(!started||state.phase==='finished')return;clear();paused=!paused;accumulator=0;sync();}
 document.querySelector('#start').onclick=()=>{if(paused)pause();else restart();};document.querySelector('#restart').onclick=restart;document.querySelector('#pause').onclick=pause;
 document.querySelector('#mode').onchange=()=>{if(started)restart();else buttons();};
 document.querySelector('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{document.querySelector('#fullscreen').textContent='Full screen unavailable';}};
 document.addEventListener('fullscreenchange',()=>{document.querySelector('#fullscreen').textContent=document.fullscreenElement?'Exit full screen':'Enter full screen';resize();});
 addEventListener('keydown',e=>{if(e.code==='Escape'){if(!e.repeat)pause();return;}if(document.activeElement.tagName==='SELECT')return;const keys=state.mode===4?{KeyW:0,KeyR:1,KeyI:2,KeyP:3}:{KeyW:0,ArrowUp:1};if(keys[e.code]!==undefined){e.preventDefault();if(!e.repeat)down(e.code,keys[e.code]);}});
 addEventListener('keyup',e=>up(e.code));
 function suspend(){clear();if(started&&!paused&&state.phase!=='finished'){paused=true;sync();}}
 addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
 function frame(t){const dt=Math.min(.05,(t-last)/1000||0);last=t;if(started&&!paused){accumulator+=dt;while(accumulator>=1/120){const previous=state.phase;P.step(state,1/120);if(previous!==state.phase)clear();accumulator-=1/120;}}draw();sync();requestAnimationFrame(frame);}
 buttons();sync();requestAnimationFrame(frame);
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
