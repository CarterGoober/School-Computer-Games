/* Pure football simulation. Input and rendering are adapters, so future control modes
   can use the same fixed-step state without depending on the browser. */
(function(root){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const CALLS={22:{code:'22',key:'ArrowRight',dir:1,label:'RUN BLOCK RIGHT'},23:{code:'23',key:'ArrowLeft',dir:-1,label:'RUN BLOCK LEFT'},55:{code:'55',key:'ArrowDown',dir:0,label:'PASS PROTECTION'}};
const POSITIONS=['LT','LG','C','RG','RT'];
function random(s){s.seed=(Math.imul(1664525,s.seed)+1013904223)>>>0;return s.seed/4294967296;}
function create(options={}){
 const s={version:1,seed:(options.seed||Date.now())>>>0,team:options.team==='navy'?'navy':'gold',mode:options.mode||'quick',drill:options.drill||'reaction',forcedCall:options.call||null,ratings:options.ratings||[],phase:'result',quarter:1,clock:90,down:1,toGo:10,ball:25,score:0,opponentScore:0,time:0,playNumber:0,stats:{plays:0,yards:0,sacks:0,pancakes:0,pickups:0,perfect:0,gradeTotal:0},log:[]};
 nextPlay(s);return s;
}
function nextPlay(s){
 if(s.phase!=='result')return false;
 s.playNumber++;s.playTime=0;s.meter=0;s.meterDirection=1;s.target=.28+random(s)*.44;
 let codes=['22','23','55'];if(s.mode==='practice'){if(s.drill==='run')codes=['22','23'];if(['pass','blitz'].includes(s.drill))codes=['55'];}
 s.call=CALLS[s.forcedCall]||CALLS[codes[Math.floor(random(s)*codes.length)]];
 s.assignment=null;s.snapGrade=null;s.snapQuality=0;s.result=null;s.prompt=null;s.challenge=0;s.reactionBoost=0;s.snapAt=0;s.qb={x:0,y:5};s.runner={x:0,y:4};
 const roll=random(s),side=random(s)<.5?-1:1;
 s.blitz={type:roll<.35?'edge':roll<.65?'interior':'none',side:roll<.35?side:0,fake:roll>.55&&roll<.8};
 if(s.mode==='practice'&&s.drill==='blitz')s.blitz={type:s.playNumber%2?'edge':'interior',side:s.playNumber%2?side:0,fake:s.playNumber%3===0};
 s.line=POSITIONS.map((position,i)=>({position,home:(i-2)*1.8,x:(i-2)*1.8,y:.7,vx:0,vy:0,stamina:100,leverage:.6,engaged:false,missed:false,pancake:false,steps:0,rating:s.ratings[i]||{strength:70,footwork:70,awareness:70,run:70,pass:70,stamina:70}}));
 s.defenders=s.line.map((p,i)=>({x:p.home+(i%2?.18:-.18),y:-.9,down:false,engaged:false,pressure:0}));
 if(s.blitz.type!=='none')s.defenders.push({x:s.blitz.side?6*s.blitz.side:.9,y:s.blitz.fake?-4:-3.3,down:false,engaged:false,pressure:0,blitzer:true});
 s.phase='presnap';return true;
}
function snapGrade(value,target){const d=Math.abs(value-target);return d<=.024?'PERFECT':d<=.078?'GOOD':d>.3?'BOTCHED':value<target?'EARLY':'LATE';}
function snap(s){
 if(s.phase!=='presnap')return false;
 s.snapGrade=snapGrade(s.meter,s.target);s.snapQuality={PERFECT:1,GOOD:.82,EARLY:.48,LATE:.4,BOTCHED:.08}[s.snapGrade];s.snapAt=s.time;s.phase='live';
 if(s.mode==='practice'&&s.drill==='snap')finish(s,'DRILL',0,s.snapQuality*100);
 return true;
}
function assign(s,key){
 if(s.phase!=='live'||s.assignment||!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(key))return false;
 const delay=s.time-s.snapAt;s.assignment={key,correct:key===s.call.key,delay,quality:key===s.call.key?clamp(1-delay*.6,.1,1):0};return true;
}
function reinforce(s,key){
 const p=s.prompt;if(s.phase!=='live'||!p||p.done||s.playTime>p.expires)return false;
 if(key!==p.key){p.wrong=true;s.reactionBoost-=.07;return false;}
 p.done=true;p.success=true;s.reactionBoost+=.17;
 if(p.kind==='blitz'&&!s.blitz.fake)s.stats.pickups++;
 return true;
}
function challenge(s){
 const first=s.challenge===0,blitz=first&&s.blitz.type!=='none';
 const side=blitz?s.blitz.side:s.call.dir;
 s.prompt={kind:blitz?'blitz':'leverage',key:blitz&&s.blitz.fake?'ArrowDown':side<0?'ArrowLeft':side>0?'ArrowRight':'ArrowDown',label:blitz?(s.blitz.fake?'FAKE BLITZ · HOLD THE POCKET':side?'EDGE BLITZ · PICK IT UP':'INSIDE BLITZ · ANCHOR'):'STAY LOW · REINFORCE',opened:s.playTime,expires:s.playTime+1.15,done:false,success:false};s.challenge++;
}
function step(s,dt){
 if(!['presnap','live'].includes(s.phase)||!Number.isFinite(dt)||dt<=0)return;
 dt=Math.min(dt,.05);s.time+=dt;
 if(s.phase==='presnap'){
  const linebacker=s.defenders[5];if(linebacker){linebacker.y=-3.7+Math.sin(s.time*2.3)*.8;linebacker.x=(s.blitz.side?6*s.blitz.side:.9)+Math.sin(s.time*1.7)*.35;}
  s.meter+=dt*.62*s.meterDirection;if(s.meter>=1){s.meter=1;s.meterDirection=-1;}if(s.meter<=0){s.meter=0;s.meterDirection=1;}return;
 }
 s.playTime+=dt;
 if(!s.assignment&&s.playTime>.95)assign(s,'ArrowUp');
 if(s.mode==='practice'&&s.drill==='reaction'&&s.assignment){finish(s,'DRILL',0,s.assignment.quality*100*s.snapQuality);return;}
 if(s.playTime>.8&&s.challenge===0)challenge(s);
 if(s.playTime>2.55&&s.challenge===1)challenge(s);
 if(s.prompt&&!s.prompt.done&&s.playTime>s.prompt.expires){s.prompt.done=true;s.reactionBoost-=.14;}
 const a=s.assignment,correct=!!a?.correct,pass=s.call.dir===0,dir=correct?s.call.dir:a?.key==='ArrowLeft'?-1:a?.key==='ArrowRight'?1:0;
 for(let i=0;i<5;i++){
  const p=s.line[i],d=s.defenders[i],rating=p.rating;
  p.stamina=clamp(100-s.playTime*(9-(rating.stamina||70)/20),0,100);
  const skill=((pass?rating.pass:rating.run)+rating.strength+rating.footwork+rating.awareness)/400;
  p.leverage=clamp(.08+s.snapQuality*.22+(a?.quality||0)*.36+(skill-.5)*.5+s.reactionBoost-(100-p.stamina)*.001,0,1);
  const tx=p.home+dir*Math.min(2.8,s.playTime*.85),ty=pass?.9+Math.abs(p.home)*.2:-Math.min(2.4,s.playTime*.55);
  p.vx=(tx-p.x)*5;p.vy=(ty-p.y)*4;p.x+=p.vx*dt;p.y+=p.vy*dt;p.steps+=dt*(Math.abs(p.vx)+Math.abs(p.vy)+1)*6;
  if(d.down)continue;
  const gap=Math.hypot(d.x-p.x,d.y-p.y);
  if(gap<1.6&&!p.missed){p.engaged=true;d.engaged=true;}
  if(p.engaged){
   d.x+=(p.x-d.x)*dt*7;d.y+=(p.y-.75-d.y)*dt*7;
   d.pressure+=dt*(.51-p.leverage);
   if(d.pressure>.45){p.missed=true;p.engaged=false;d.engaged=false;}
   if(p.leverage>.84&&s.playTime>2.8+(i%3)*.25){p.pancake=true;p.engaged=false;d.down=true;s.stats.pancakes++;}
  }else if(!p.missed){d.x+=(p.x-d.x)*dt*2;d.y+=dt*1.6;}
  else{d.x+=(s.qb.x-d.x)*dt*.8;d.y+=dt*(2+(1-p.leverage)*1.3);}
 }
 const blitzer=s.defenders[5];
 if(blitzer){
  if(s.blitz.fake){blitzer.y-=dt*.5;}
  else{
   const picked=s.reactionBoost>.05;
   if(picked){const p=s.line[s.blitz.side<0?0:s.blitz.side>0?4:2];blitzer.engaged=true;blitzer.x+=(p.x-blitzer.x)*dt*4;blitzer.y+=(p.y-.6-blitzer.y)*dt*4;}
   else{blitzer.x+=(s.qb.x-blitzer.x)*dt*.7;blitzer.y+=dt*2.5;}
  }
 }
 if(!pass&&correct){s.runner.x+=dt*dir*1.1;s.runner.y-=dt*(s.playTime>2?3:0);}
 else if(pass){s.qb.y=5+Math.min(.6,s.playTime*.15);}
 if(s.defenders.some(d=>!d.down&&!d.engaged&&Math.hypot(d.x-s.qb.x,d.y-s.qb.y)<1.25)){
  finish(s,pass?'SACK':'TACKLE FOR LOSS',-4-Math.floor(random(s)*4));return;
 }
 if(s.playTime>4.4){
  const avg=s.line.reduce((n,p)=>n+p.leverage,0)/5;
  if(!correct||avg<.36)finish(s,pass?'SACK':'TACKLE FOR LOSS',-2-Math.floor(random(s)*5));
  else if(pass&&avg<.55)finish(s,'INCOMPLETE',0);
  else {const yards=Math.max(1,Math.floor((pass?7:3)+avg*(pass?17:12)+random(s)*4));finish(s,pass?'PASS COMPLETE':'RUNNING LANE',yards);}
 }
}
function opposingDrive(s){
 s.ball=25;s.down=1;s.toGo=10;
 if(s.quarter===4&&s.clock<=0){s.result.opponentDrive='Regulation ends. No further possession.';return;}
 const roll=random(s),points=roll<.28?7:roll<.49?3:0;s.opponentScore+=points;
 s.result.opponentDrive=points?'Opponent drive: '+points+' points.':'Defense holds. Opponent punts.';
 s.clock-=18+Math.floor(random(s)*13);s.ball=25;s.down=1;s.toGo=10;
}
function finish(s,kind,yards,grade){
 if(s.phase!=='live'&&s.phase!=='presnap')return;
 const avg=s.line.reduce((n,p)=>n+p.leverage,0)/5;
 yards=s.mode==='practice'?yards:clamp(yards,-s.ball,100-s.ball);
 grade=grade??Math.round(clamp(avg*90+s.snapQuality*10,0,100));
 s.stats.plays++;s.stats.yards+=yards;s.stats.gradeTotal+=grade;if(s.snapGrade==='PERFECT')s.stats.perfect++;if(kind==='SACK')s.stats.sacks++;
 s.result={kind,yards,grade:Math.round(grade),snap:s.snapGrade,opponentDrive:null};
 if(s.mode==='practice'){s.phase=s.stats.plays>=5?'final':'result';return;}
 s.clock-=22+Math.floor(random(s)*12);s.ball+=yards;s.toGo-=yards;
 if(s.ball>=100){s.score+=7;s.result.kind='TOUCHDOWN';s.result.yards=yards-(s.ball-100);opposingDrive(s);}
 else if(s.ball<=0){s.opponentScore+=2;s.result.kind='SAFETY';opposingDrive(s);}
 else if(s.toGo<=0){s.down=1;s.toGo=Math.min(10,100-s.ball);s.result.firstDown=true;}
 else if(++s.down>4){s.result.turnover=true;opposingDrive(s);}
 while(s.clock<=0&&s.quarter<4){s.clock+=90;s.quarter++;}
 s.log.unshift({...s.result,score:s.score,opponentScore:s.opponentScore});s.log=s.log.slice(0,12);
 if(s.clock<=0){s.clock=0;s.phase='final';}else s.phase='result';
}
function kick(s){
 if(s.mode==='practice'||s.phase!=='presnap'||s.down!==4)return false;
 const fieldGoal=s.ball>=60;s.phase='live';finish(s,fieldGoal?'FIELD GOAL':'PUNT',0,60);
 // A kick is a special-teams possession; finish() already handed off at fourth down.
 if(fieldGoal){s.score+=3;s.result.kind='FIELD GOAL';}else s.result.kind='PUNT';if(s.log[0])Object.assign(s.log[0],s.result,{score:s.score,opponentScore:s.opponentScore});return true;
}
const api={CALLS,POSITIONS,create,nextPlay,snapGrade,snap,assign,reinforce,step,kick};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TrenchesCore=api;
})(typeof window!=='undefined'?window:globalThis);
