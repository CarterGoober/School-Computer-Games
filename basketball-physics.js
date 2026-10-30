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
 const floor=510,hoops=[100,900],rimY=245,halfRim=35;
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 function pose(p,c){
  const hipY=p.y-c.legs,lean=clamp(p.vx/950,-.12,.12),headX=p.x+lean*48;
  const shoulder={x:p.x+lean*33,y:hipY-34};
  const angle=-.25+p.arm*1.65,hand={x:shoulder.x+p.facing*Math.cos(angle)*42,y:shoulder.y-Math.sin(angle)*42};
  const stride=Math.sin(p.stride)*Math.min(13,Math.abs(p.vx)/13);
  p.nodes=[{x:headX,y:hipY-58},{x:p.x,y:hipY},
   {x:shoulder.x-p.facing*24,y:shoulder.y+22-p.arm*18},hand,
   {x:p.x-14-stride,y:p.y-Math.max(0,stride*.35)},{x:p.x+14+stride,y:p.y-Math.max(0,-stride*.35)}];
 }
 function player(x,team,index,c){const p={x,y:floor,vx:0,vy:0,team,index,facing:team===0?1:-1,held:false,charge:0,arm:0,cooldown:0,blockCooldown:0,stride:0};pose(p,c);return p;}
 function round(s,condition){
  let next=condition||conditions[Math.floor(s.rng()*conditions.length)];
  if(!condition&&s.condition?.id===next.id)next=conditions[(conditions.indexOf(next)+1)%conditions.length];
  s.condition={...next};if(next.id==='wind'&&s.rng()<.5)s.condition.wind*=-1;
  s.players=[player(280,0,0,s.condition),player(405,0,1,s.condition),player(595,1,2,s.condition),player(720,1,3,s.condition)];
  s.ball={x:500,y:160,vx:(s.rng()-.5)*80,vy:0,r:s.condition.radius,holder:null,catchDelay:.5,possessed:0};
  s.phase='playing';s.timer=0;s.roundTime=0;s.lastScore=null;
 }
 function create(mode=2,rng=Math.random){const s={mode:mode===4?4:2,rng,scores:[0,0],round:1,phase:'playing',winner:null,timer:0,condition:null};round(s,conditions[0]);return s;}
 const controlled=(s,index)=>s.players.filter(p=>s.mode===2?p.team===index:p.index===index);
 function press(s,index){
  if(s.phase!=='playing')return;
  for(const p of controlled(s,index)){
   if(p.held)continue;p.held=true;p.charge=0;
   if(p.y>=floor-.1&&p.cooldown<=0){p.vy=-Math.sqrt(2*s.condition.gravity*90);p.cooldown=.25;}
  }
 }
 function release(s,index,cancel=false){
  for(const p of controlled(s,index)){
   if(!p.held)continue;p.held=false;
   if(!cancel&&s.phase==='playing'&&s.ball.holder===p.index)shoot(s,p);
   p.charge=0;
  }
 }
 function cancelInput(s){for(let i=0;i<s.mode;i++)release(s,i,true);}
 function shoot(s,p){
  const b=s.ball,c=s.condition,q=clamp(p.charge/1.15,0,1);
  // A real launch: power and arm angle come from the hold, never from the hoop position.
  // Long holds reach a plateau; distance, release timing, momentum and wind decide the result.
  const speed=(260+q*600)/Math.pow(c.mass,.1),angle=.48+q*.87;
  b.holder=null;b.catchDelay=.28;b.possessed=0;
  b.vx=p.facing*Math.cos(angle)*speed+p.vx*.35;
  b.vy=-Math.sin(angle)*speed+p.vy*.3;
 }
 function score(s,team){if(s.phase!=='playing')return;cancelInput(s);s.scores[team]+=s.condition.points;s.lastScore=team;s.timer=1.5;s.phase='round';if(s.scores[team]>=5){s.winner=team;s.phase='finished';}}
 function circle(b,x,y,r,bounce=.7){const dx=b.x-x,dy=b.y-y,d=Math.hypot(dx,dy),min=b.r+r;if(d>=min)return;const nx=d?dx/d:0,ny=d?dy/d:-1;b.x=x+nx*min;b.y=y+ny*min;const v=b.vx*nx+b.vy*ny;if(v<0){b.vx-=(1+bounce)*v*nx;b.vy-=(1+bounce)*v*ny;}}
 function step(s,dt){
  if(!Number.isFinite(dt)||dt<=0)return;dt=clamp(dt,0,1/60);
  if(s.phase==='round'){s.timer-=dt;if(s.timer<=0){s.round++;round(s);}return;}
  if(s.phase!=='playing')return;
  s.roundTime+=dt;const c=s.condition,b=s.ball,oldY=b.y,oldX=b.x;
  for(const p of s.players){
   p.cooldown=Math.max(0,p.cooldown-dt);p.blockCooldown=Math.max(0,p.blockCooldown-dt);
   if(p.held)p.charge=Math.min(1.4,p.charge+dt);
   const targetArm=p.held?clamp(p.charge/1.15,0,1):b.holder===p.index?.22:0;
   p.arm+=(targetArm-p.arm)*Math.min(1,dt*12);
   const possession=b.holder===p.index,goal=possession?(p.team===0?590:410):b.x;
   const direction=Math.abs(goal-p.x)>24?Math.sign(goal-p.x):0;
   if(p.held){p.vx+=direction*600*dt;p.vx=clamp(p.vx,-170,170);}
   else p.vx*=Math.pow(c.id==='ice'?.993:.91,dt*60);
   p.vy+=c.gravity*dt;p.x=clamp(p.x+p.vx*dt,35,965);p.y+=p.vy*dt;
   if(p.y>=floor){p.y=floor;p.vy=0;}
   p.stride+=Math.abs(p.vx)*dt*.05;
   // The torso stays upright, with only a small running lean; limbs never collapse.
   pose(p,c);
  }
  for(let i=0;i<s.players.length;i++)for(let j=i+1;j<s.players.length;j++){
   const a=s.players[i],p=s.players[j],dx=p.x-a.x;
   if(Math.abs(dx)<36&&Math.abs(p.y-a.y)<55){const push=(36-Math.abs(dx))*.5,dir=dx>=0?1:-1;a.x=clamp(a.x-dir*push,35,965);p.x=clamp(p.x+dir*push,35,965);pose(a,c);pose(p,c);}
  }
  b.catchDelay=Math.max(0,b.catchDelay-dt);
  if(b.holder!==null){
   const p=s.players[b.holder],hand=p.nodes[3];b.possessed+=dt;b.x=hand.x+p.facing*(b.r*.5);b.y=hand.y-b.r*.6;b.vx=p.vx;b.vy=p.vy;
   for(const defender of s.players)if(defender.team!==p.team&&defender.held&&defender.arm>.35&&defender.blockCooldown===0&&b.possessed>.4&&Math.hypot(defender.nodes[3].x-b.x,defender.nodes[3].y-b.y)<b.r+24){b.holder=null;b.vx=defender.facing*210;b.vy=-230;b.catchDelay=.25;defender.blockCooldown=.8;break;}
   return;
  }
  b.vx+=c.wind*dt;b.vy+=c.gravity*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.x<b.r){b.x=b.r;b.vx=Math.abs(b.vx)*.65;}if(b.x>1000-b.r){b.x=1000-b.r;b.vx=-Math.abs(b.vx)*.65;}
  if(b.y<b.r){b.y=b.r;b.vy=Math.abs(b.vy)*.6;}
  if(b.y>floor-b.r){b.y=floor-b.r;b.vy=-Math.abs(b.vy)*.67;b.vx*=.96;if(Math.abs(b.vy)<35)b.vy=0;}
  for(let i=0;i<hoops.length;i++){
   const x=hoops[i],board=i===0?x-halfRim-10:x+halfRim+10;
   const crossX=oldX+(b.x-oldX)*(rimY-oldY)/(b.y-oldY||1);
   if(b.vy>0&&oldY<rimY&&b.y>=rimY&&Math.abs(crossX-x)<halfRim-b.r*.6){score(s,i===0?1:0);return;}
   circle(b,x-halfRim,rimY,4);circle(b,x+halfRim,rimY,4);
   if(b.y>rimY-85&&b.y<rimY+12&&Math.abs(b.x-board)<b.r+5){b.x=board+Math.sign(b.x-board||1)*(b.r+5);b.vx*=-.75;}
  }
  // Closest eligible player gets possession, so array order doesn't favor a team.
  const candidates=s.players.filter(p=>b.catchDelay<=0&&Math.abs(b.vy)<680&&
   (Math.hypot(b.x-p.nodes[3].x,b.y-p.nodes[3].y)<b.r+24||Math.hypot(b.x-p.x,b.y-(p.y-37))<b.r+28));
  candidates.sort((a,p)=>Math.hypot(b.x-a.x,b.y-a.nodes[1].y)-Math.hypot(b.x-p.x,b.y-p.nodes[1].y));
  if(candidates.length){b.holder=candidates[0].index;b.possessed=0;return;}
  for(const p of s.players){circle(b,p.nodes[0].x,p.nodes[0].y,16);circle(b,p.x,p.nodes[1].y-24,17);if(p.held)circle(b,p.nodes[3].x,p.nodes[3].y,9,.85);}
  if(s.roundTime>40&&Math.abs(b.vx)<8&&Math.abs(b.vy)<8){b.x=500;b.y=160;b.vy=0;b.catchDelay=.5;s.roundTime=0;}
 }
 const api={conditions,create,round,press,release,cancelInput,step,score,floor,hoops,rimY,halfRim};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RumblePhysics=api;
})(typeof window!=='undefined'?window:globalThis);
