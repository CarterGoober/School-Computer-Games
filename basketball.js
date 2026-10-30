(() => {
 'use strict';
 const P=RumblePhysics,canvas=document.querySelector('#court'),ctx=canvas.getContext('2d'),overlay=document.querySelector('#overlay');
 let state=P.create(),started=false,paused=false,last=0,accumulator=0,announced='',held=new Set();
 const colors=['#6ee0de','#ff99b0'];
 function line(x,y,a,b,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);ctx.stroke();}
 function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
 function draw(){
  const c=state.condition;
  ctx.fillStyle='#f5c9ac';ctx.fillRect(0,0,1000,580);
  const sky=ctx.createLinearGradient(0,0,0,510);sky.addColorStop(0,'#b9d9d6');sky.addColorStop(1,'#f8d9b4');ctx.fillStyle=sky;ctx.fillRect(0,0,1000,510);
  circle(760,97,50,'#fff1cb');
  for(let i=0;i<19;i++){const x=i*61-28,h=45+(i*71%140);ctx.fillStyle=i%2?'#83aaa9':'#93b8b2';ctx.fillRect(x,393-h,49,h+80);ctx.fillStyle='#b9d5c8';for(let y=415-h;y<390;y+=21)for(let w=8;w<40;w+=17)ctx.fillRect(x+w,y,7,10);}
  ctx.strokeStyle='#4d7c8066';ctx.lineWidth=1;
  for(let x=-300;x<1300;x+=32){line(x,350,x+200,490,'#507d7855',1);line(x,350,x-200,490,'#507d7855',1);}
  line(0,350,1000,350,'#577a77',5);for(let x=30;x<1000;x+=190)line(x,350,x,510,'#577a77',5);
  ctx.fillStyle=c.id==='ice'?'#b9e4e5':'#dc9271';ctx.fillRect(0,510,1000,70);ctx.fillStyle='#bd715a';ctx.fillRect(0,566,1000,14);
  ctx.strokeStyle='#fbe9d0';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(500,535,90,20,0,0,Math.PI*2);ctx.moveTo(500,510);ctx.lineTo(500,565);ctx.stroke();
  ctx.globalAlpha=.2;ctx.fillStyle='#254950';for(const p of state.players){ctx.beginPath();ctx.ellipse(p.nodes[1].x,516,35,7,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  for(let i=0;i<2;i++){
   const x=P.hoops[i],board=i===0?x-49:x+49;
   line(board,180,board,510,'#294f5a',8);line(board,158,board,257,'#fff4db',12);
   ctx.strokeStyle='#fffae5aa';ctx.lineWidth=2;for(let j=-3;j<=3;j++){ctx.beginPath();ctx.moveTo(x+j*12,250);ctx.lineTo(x+j*7,293);ctx.stroke();}
   line(x-22,293,x+22,293,'#fffae5aa',2);line(x-39,245,x+39,245,'#d65d44',7);
  }
  for(const p of state.players){
   const n=p.nodes,color=colors[p.team];
   line(n[1].x,n[1].y,n[4].x,n[4].y,'#263d4b',12);line(n[1].x,n[1].y,n[5].x,n[5].y,'#263d4b',12);
   line(n[4].x-7,n[4].y,n[4].x+8,n[4].y,'#fff1db',9);line(n[5].x-7,n[5].y,n[5].x+8,n[5].y,'#fff1db',9);
   line(n[0].x,n[0].y+16,n[2].x,n[2].y,'#edb586',10);line(n[0].x,n[0].y+16,n[3].x,n[3].y,'#edb586',10);
   line(n[0].x,n[0].y+20,n[1].x,n[1].y,color,27);
   ctx.fillStyle='#294f5a';ctx.font='bold 13px Arial';ctx.textAlign='center';ctx.fillText(String(p.index+1),n[1].x,n[1].y-8);
   circle(n[0].x,n[0].y,17,'#efbc8f');
   ctx.save();ctx.translate(n[0].x,n[0].y);ctx.rotate(Math.atan2(n[1].y-n[0].y,n[1].x-n[0].x)-Math.PI/2);
   ctx.fillStyle='#31424b';ctx.fillRect(-15,-17,30,9);circle(-5,-1,2,'#263b44');circle(6,-1,2,'#263b44');line(-3,7,5,7,'#ad675b',2);ctx.restore();
  }
  const b=state.ball;circle(b.x,b.y,b.r+2,'#633b3e');circle(b.x,b.y,b.r,c.id==='beach'?'#fff3c5':c.id==='heavy'?'#7d8790':'#f6a64d');
  ctx.save();ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.clip();line(b.x-b.r,b.y,b.x+b.r,b.y,'#784b43',1.5);line(b.x,b.y-b.r,b.x,b.y+b.r,'#784b43',1.5);ctx.restore();
  if(c.wind){ctx.fillStyle='#294f5a';ctx.font='bold 18px Arial';ctx.textAlign='center';ctx.fillText(c.wind>0?'WIND → → →':'← ← ← WIND',500,60);}
 }
 function sync(){
  document.querySelector('#blue-score').textContent=state.scores[0];document.querySelector('#pink-score').textContent=state.scores[1];
  document.querySelector('#round').textContent=`ROUND ${String(state.round).padStart(2,'0')}`;document.querySelector('#condition').textContent=state.condition.name;
  const win=state.winner===0?'SKY CLUB':'SUN SET';let title='',text='';
  if(!started){title='LET’S MAKE\nA MESS.';text='Choose 2 or 4 players, then start a match.\nTap to jump. Tap again with the ball to shoot.';}
  else if(paused){title='HALFTIME.\nTAKE A BREATH.';text='Press Esc or Resume to continue.';}
  else if(state.phase==='finished'){title=`${win}\nTAKES THE ROOF!`;text='First to 5. A glorious mess. Restart for a rematch.';}
  else if(state.phase==='round'){title=state.lastScore===0?'SKY CLUB SCORES!':'SUN SET SCORES!';text=`+${state.condition.points} · New conditions coming up…`;}
  overlay.hidden=!title;if(title){overlay.querySelector('h2').textContent=title;overlay.querySelector('p').textContent=text;}
  const status=state.phase==='finished'?`${win} wins ${state.scores.join(' – ')}.`:paused?'Match paused.':started?`${state.condition.name}. ${state.ball.holder===null?'Chase the ball!':'Ball caught — tap again to shoot!'}`:'Gather your team. First to 5 wins.';
  if(status!==announced){document.querySelector('#match-status').textContent=status;announced=status;}
  document.querySelector('#pause').disabled=!started||state.phase==='finished';document.querySelector('#pause').textContent=paused?'Resume · Esc':'Pause · Esc';
 }
 function buttons(){
  const four=Number(document.querySelector('#mode').value)===4;document.querySelector('#keys').textContent=four?'4 players: W = Sky 1, R = Sky 2, I = Sun 3, P = Sun 4.':'2 players: W controls Sky Club; ↑ controls Sun Set.';
  const box=document.querySelector('#touch-controls');box.className=`touch-controls ${four?'four':'two'}`;box.replaceChildren();
  const labels=four?['W · SKY 1','R · SKY 2','I · SUN 3','P · SUN 4']:['W · SKY CLUB','↑ · SUN SET'];
  labels.forEach((label,i)=>{const b=document.createElement('button');b.type='button';b.textContent=label+' ↟';b.setAttribute('aria-label',label+' jump or shoot');
   b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);b.classList.add('pressed');if(started&&!paused)P.press(state,i);});
   for(const evt of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(evt,()=>b.classList.remove('pressed'));
   b.addEventListener('click',e=>{if(e.detail===0&&started&&!paused)P.press(state,i);});box.append(b);});
 }
 function restart(){state=P.create(Number(document.querySelector('#mode').value));started=true;paused=false;accumulator=0;held.clear();sync();}
 document.querySelector('#start').onclick=restart;document.querySelector('#restart').onclick=restart;
 document.querySelector('#mode').onchange=()=>{buttons();if(started)restart();};
 function pause(){if(!started||state.phase==='finished')return;paused=!paused;held.clear();accumulator=0;sync();}
 document.querySelector('#pause').onclick=pause;
 addEventListener('keydown',e=>{
  if(['SELECT','INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;
  if(e.code==='Escape'){if(!e.repeat)pause();return;}
  const mapping=state.mode===4?{KeyW:0,KeyR:1,KeyI:2,KeyP:3}:{KeyW:0,ArrowUp:1};
  if(mapping[e.code]===undefined)return;e.preventDefault();if(held.has(e.code)||e.repeat)return;held.add(e.code);if(started&&!paused)P.press(state,mapping[e.code]);
 });
 addEventListener('keyup',e=>held.delete(e.code));
 addEventListener('blur',()=>{held.clear();if(started&&!paused&&state.phase!=='finished'){paused=true;sync();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&started&&!paused&&state.phase!=='finished'){paused=true;held.clear();sync();}});
 function frame(t){const dt=Math.min(.05,(t-last)/1000||0);last=t;if(started&&!paused){accumulator+=dt;while(accumulator>=1/120){P.step(state,1/120);accumulator-=1/120;}}draw();sync();requestAnimationFrame(frame);}
 buttons();sync();requestAnimationFrame(frame);
 if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
