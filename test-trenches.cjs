'use strict';
const assert=require('node:assert/strict');
let P;try{P=require('./trenches-core.js');}catch{}
assert(P,'The football simulation must exist');
const tick=(s,t)=>{for(let n=0;n<t*120;n++)P.step(s,1/120);return s;};
const ready=(call='22',seed=9,mode='quick')=>{const s=P.create({seed,call,mode});return s;};
function perfect(s){while(Math.abs(s.meter-s.target)>.018)P.step(s,1/120);P.snap(s);}
function play(s,good=true){perfect(s);P.assign(s,good?s.call.key:'ArrowUp');let guard=0;while(s.phase==='live'&&guard++<1500){if(good&&s.prompt&&!s.prompt.done)P.reinforce(s,s.prompt.key);P.step(s,1/120);}return s;}
for(const [value,target,want]of [[.5,.5,'PERFECT'],[.55,.5,'GOOD'],[.35,.5,'EARLY'],[.65,.5,'LATE'],[.05,.5,'BOTCHED']])assert.equal(P.snapGrade(value,target),want);
for(const [call,key,dir]of [['22','ArrowRight',1],['23','ArrowLeft',-1],['55','ArrowDown',0]]){
 const s=ready(call);assert.equal(P.assign(s,key),false);assert.equal(s.assignment,null);perfect(s);assert.equal(s.snapGrade,'PERFECT');assert(P.assign(s,key));assert.equal(s.assignment.correct,true);tick(s,1.2);assert(s.line.every(p=>p.engaged||p.pancake),'all five physically engage');assert(s.line.every(p=>dir===0?p.y>0:p.x*p.home>=0||Math.abs(p.x-p.home)>0));
 if(dir)assert(s.line[2].x*dir>0,'run movement follows call');else assert(s.line[0].y>s.line[2].y,'pass set makes a pocket');
}
const win=play(ready('22'));assert(win.result.yards>0);assert(win.stats.pancakes>0);assert(win.result.grade>=70);
const loss=play(ready('55'),false);assert.equal(loss.result.kind,'SACK');assert(loss.result.yards<0);assert(loss.result.grade<win.result.grade);
const slow=ready('55');perfect(slow);tick(slow,6);assert.equal(slow.phase,'result');assert(slow.result.yards<0);
const threaten=ready('55',3);const before=threaten.defenders[5].y;tick(threaten,.5);assert.notEqual(threaten.defenders[5].y,before,'linebacker shows pressure before snap');assert.equal(threaten.phase,'presnap');
const early=ready('22');P.snap(early);assert.equal(early.snapGrade,'BOTCHED');
const blitz=ready('55',3);blitz.blitz={type:'interior',side:0,fake:false};play(blitz);assert(blitz.stats.pickups>0,'correct active blitz pickup');
const wrong=ready('55',3);wrong.blitz={type:'edge',side:1,fake:false};perfect(wrong);P.assign(wrong,'ArrowDown');tick(wrong,1.1);assert(wrong.prompt);assert.equal(P.reinforce(wrong,'ArrowLeft'),false);assert(!wrong.prompt.done);assert(P.reinforce(wrong,wrong.prompt.key));assert.equal(P.reinforce(wrong,wrong.prompt.key),false,'no duplicate reaction rewards');
const first=ready();first.ball=40;first.toGo=3;play(first);assert.equal(first.down,1);assert.equal(first.toGo,10);
const td=ready();td.ball=99;td.toGo=1;play(td);assert.equal(td.score,7);assert.equal(td.ball,25);assert.equal(td.stats.yards,1,'only yards to the goal line count');
const fourth=ready('55');fourth.down=4;play(fourth,false);assert.equal(fourth.down,1);assert.equal(fourth.ball,25);assert(fourth.result.opponentDrive,'opponent possession simulated');
const fg=ready();fg.ball=75;fg.down=4;assert(P.kick(fg));assert.equal(fg.score,3);assert.equal(fg.log[0].score,3,'score and play log agree after a kick');
const lastSnap=ready('22',1);Object.assign(lastSnap,{quarter:4,clock:1,ball:99,toGo:1,score:0,opponentScore:6});play(lastSnap);assert.equal(lastSnap.score,7);assert.equal(lastSnap.opponentScore,6,'no new drive after regulation expires');assert.equal(lastSnap.phase,'final');
const match=ready();for(let n=0;n<100&&match.phase!=='final';n++){if(match.phase==='result')P.nextPlay(match);play(match);}assert.equal(match.phase,'final');assert.equal(match.quarter,4);assert(match.stats.plays>8);assert(Number.isFinite(match.opponentScore));
for(const drill of ['snap','run','pass','blitz','reaction']){const s=P.create({mode:'practice',drill,seed:7});for(let i=0;i<5;i++){play(s);if(i<4)P.nextPlay(s);}assert.equal(s.phase,'final');assert.equal(s.stats.plays,5);assert(s.stats.gradeTotal/5>=65);}
for(let seed=1;seed<=30;seed++){const s=play(ready(null,seed));assert(['result','final'].includes(s.phase));assert(s.line.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));}
console.log('PASS Trenches core: timing, post-snap ordering, 22/23/55, five engagements, pocket/lane, pancakes, sacks, blitz challenges, downs, TD, fourth down, kicks, full game, five drills, 30 seeds');
