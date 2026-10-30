(function(root){
 'use strict';
 const conditions=[
  {id:'classic',name:'Classic',gravity:950,friction:.82,radius:13,mass:1,legs:53,points:1,wind:0},
  {id:'low-gravity',name:'Low gravity',gravity:440,friction:.82,radius:13,mass:1,legs:53,points:1,wind:0},
  {id:'ice',name:'Icy court',gravity:950,friction:.99,radius:13,mass:1,legs:53,points:1,wind:0},
  {id:'beach',name:'Beach ball',gravity:540,friction:.82,radius:23,mass:.45,legs:53,points:1,wind:0},
  {id:'heavy',name:'Heavy ball',gravity:1150,friction:.82,radius:17,mass:2.2,legs:53,points:1,wind:0},
  {id:'tiny',name:'Tiny ball',gravity:950,friction:.82,radius:7,mass:.6,legs:53,points:1,wind:0},
  {id:'long-legs',name:'Long legs',gravity:950,friction:.82,radius:13,mass:1,legs:85,points:1,wind:0},
  {id:'short',name:'Short players',gravity:950,friction:.82,radius:13,mass:1,legs:30,points:1,wind:0},
  {id:'double',name:'Double points',gravity:950,friction:.82,radius:13,mass:1,legs:53,points:2,wind:0},
  {id:'wind',name:'Crosswind',gravity:950,friction:.82,radius:13,mass:1,legs:53,points:1,wind:135}
 ];
 const floor=510,hoops=[100,900],rimY=245,halfRim=39;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function point(x,y){return{x,y,vx:0,vy:0};}
 function player(x,team,index,c){const hipY=floor-c.legs;return{team,index,nodes:[point(x,hipY-49),point(x,hipY),point(x-26,hipY-19),point(x+26,hipY-19),point(x-19,floor),point(x+19,floor)],angle:0,cooldown:0};}
 function round(s,condition){
  let next=condition||conditions[Math.floor(s.rng()*conditions.length)];
  if(!condition&&s.condition?.id===next.id)next=conditions[(conditions.indexOf(next)+1)%conditions.length];
  s.condition={...next};if(next.id==='wind'&&s.rng()<.5)s.condition.wind*=-1;
  s.players=[player(310,0,0,s.condition),player(425,0,1,s.condition),player(575,1,2,s.condition),player(690,1,3,s.condition)];
  s.ball={x:500,y:160,vx:(s.rng()-.5)*100,vy:0,r:s.condition.radius,holder:null,catchDelay:.5};
  s.phase='playing';s.timer=0;s.roundTime=0;s.lastScore=null;
 }
 function create(mode=2,rng=Math.random){const s={mode:mode===4?4:2,rng,scores:[0,0],round:1,phase:'playing',winner:null,timer:0,condition:null};round(s,conditions[0]);return s;}
 function shoot(s,p){
  const b=s.ball,c=s.condition,target=hoops[p.team===0?1:0];
  const apex=Math.max(b.r+20,Math.min(70,b.y-75)),vy=-Math.sqrt(2*c.gravity*Math.max(1,b.y-apex));
  const t=(-vy+Math.sqrt(vy*vy+2*c.gravity*(rimY-b.y)))/c.gravity;
  b.holder=null;b.catchDelay=.3;
  b.vx=(target-b.x-.5*c.wind*t*t)/t+(s.rng()-.5)*30;
  b.vy=vy;
  for(const n of p.nodes)n.vx-=(p.team===0?1:-1)*30/c.mass;
 }
 function press(s,index){
  if(s.phase!=='playing')return;
  const ids=s.mode===2?s.players.filter(p=>p.team===index):s.players.filter(p=>p.index===index);
  for(const p of ids){
   if(p.cooldown>0)continue;p.cooldown=.23;
   const b=s.ball,holding=b.holder===p.index,hip=p.nodes[1],direction=holding?(p.team===0?1:-1):Math.sign(b.x-hip.x);
   const grounded=p.nodes.slice(4).some(n=>n.y>floor-14);
   if(grounded)for(const n of p.nodes){n.vy-=s.condition.gravity<600?290:415;n.vx+=direction*(s.condition.id==='ice'?125:105);}
   // Arms swing even in the air. Contact can knock a loose ball or block an opponent.
   p.nodes[2].vy-=95;p.nodes[3].vy-=95;
   if(holding)shoot(s,p);
   else if(b.holder===null&&Math.hypot(b.x-hip.x,b.y-(hip.y-32))<110&&b.catchDelay<=0){b.holder=p.index;shoot(s,p);}
  }
 }
 function constrain(a,b,length){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,k=(d-length)/d*.5;a.x+=dx*k;a.y+=dy*k;b.x-=dx*k;b.y-=dy*k;}
 function score(s,team){if(s.phase!=='playing')return;s.scores[team]+=s.condition.points;s.lastScore=team;s.timer=1.8;s.phase='round';if(s.scores[team]>=5){s.winner=team;s.phase='finished';}}
 function circle(b,x,y,r,bounce=.72){const dx=b.x-x,dy=b.y-y,d=Math.hypot(dx,dy),min=b.r+r;if(d>=min)return;const nx=d?dx/d:0,ny=d?dy/d:-1;b.x=x+nx*min;b.y=y+ny*min;const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=(1+bounce)*v*nx;b.vy-=(1+bounce)*v*ny;}}
 function step(s,dt){
  if(!Number.isFinite(dt)||dt<=0)return;dt=clamp(dt,0,1/60);
  if(s.phase==='round'){s.timer-=dt;if(s.timer<=0){s.round++;round(s);}return;}
  if(s.phase!=='playing')return;
  s.roundTime+=dt;const c=s.condition,b=s.ball,oldY=b.y;
  for(const p of s.players){
   p.cooldown=Math.max(0,p.cooldown-dt);const prev=p.nodes.map(n=>({x:n.x,y:n.y}));
   // Gravity plus a soft upright spring leaves limbs free to tumble on landing.
   p.nodes[0].vx+=(p.nodes[1].x-p.nodes[0].x)*17*dt;
   p.nodes[0].vy-=280*dt;p.nodes[1].vy+=90*dt;
   for(const n of p.nodes){n.vy+=c.gravity*dt;n.vx*=Math.pow(.996,dt*120);n.x+=n.vx*dt;n.y+=n.vy*dt;}
   for(let i=0;i<7;i++){
    const n=p.nodes;constrain(n[0],n[1],49);constrain(n[0],n[2],40);constrain(n[0],n[3],40);constrain(n[2],n[3],49);constrain(n[1],n[4],c.legs);constrain(n[1],n[5],c.legs);constrain(n[4],n[5],35);
    for(let j=0;j<n.length;j++){const q=n[j];q.x=clamp(q.x,30,970);q.y=clamp(q.y,35,floor-(j===0?12:0));}
   }
   for(let i=0;i<p.nodes.length;i++){const n=p.nodes[i];n.vx=clamp((n.x-prev[i].x)/dt,-650,650);n.vy=clamp((n.y-prev[i].y)/dt,-950,950);if(n.y>=floor-.1)n.vx*=Math.pow(c.friction,dt*60);}
  }
  b.catchDelay=Math.max(0,b.catchDelay-dt);
  if(b.holder!==null){const p=s.players[b.holder],hand=p.nodes[p.team===0?3:2];b.x=hand.x;b.y=hand.y-18;b.vx=hand.vx;b.vy=hand.vy;return;}
  b.vx+=c.wind*dt;b.vy+=c.gravity*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx)*.8;}if(b.x>1000-b.r){b.x=1000-b.r;b.vx=-Math.abs(b.vx)*.8;}
  if(b.y<b.r){b.y=b.r;b.vy=Math.abs(b.vy)*.6;}
  if(b.y>floor-b.r){b.y=floor-b.r;b.vy=-Math.abs(b.vy)*.72;b.vx*=.98;if(Math.abs(b.vy)<35)b.vy=0;}
  for(let i=0;i<hoops.length;i++){
   const x=hoops[i],board=i===0?x-halfRim-10:x+halfRim+10;
   if(b.vy>0&&oldY<rimY&&b.y>=rimY&&Math.abs(b.x-x)<halfRim-b.r*.55){score(s,i===0?1:0);return;}
   circle(b,x-halfRim,rimY,5);circle(b,x+halfRim,rimY,5);
   if(b.y>rimY-85&&b.y<rimY+12&&Math.abs(b.x-board)<b.r+5){b.x=board+Math.sign(b.x-board||1)*(b.r+5);b.vx*=-.8;}
  }
  for(const p of s.players){
   const hip=p.nodes[1],hand=p.nodes[p.team===0?3:2];
   if(b.catchDelay<=0&&Math.hypot(b.x-hand.x,b.y-hand.y)<b.r+29&&Math.abs(b.vy)<650){b.holder=p.index;return;}
   circle(b,p.nodes[0].x,p.nodes[0].y,14,.7);circle(b,hip.x,hip.y-20,15,.65);
  }
  // A new neutral drop prevents a motionless ball from stalling a local match.
  if(s.roundTime>35){b.x=500;b.y=100;b.vx=(s.rng()-.5)*150;b.vy=0;b.catchDelay=.5;s.roundTime=0;}
 }
 const api={conditions,create,round,press,step,score,floor,hoops,rimY,halfRim};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RumblePhysics=api;
})(typeof window!=='undefined'?window:globalThis);
