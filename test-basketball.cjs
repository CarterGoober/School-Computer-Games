'use strict';
const assert=require('node:assert/strict'),P=require('./basketball-physics');
function seeded(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function tick(s,n){for(let i=0;i<n;i++)P.step(s,1/120);}
for(const mode of [2,4]){
 const s=P.create(mode,seeded(mode));P.press(s,0);assert(s.players[0].held);assert(s.players[0].vy<0);assert.equal(s.players[1].held,mode===2);assert(!s.players[2].held);
 const vy=s.players[0].vy;P.press(s,0);assert.equal(s.players[0].vy,vy,'held/repeated key cannot keep jumping');
 tick(s,50);const p=s.players[0],first=p.nodes[3].y-p.nodes[0].y;tick(s,60);assert(p.nodes[3].y-p.nodes[0].y<first,'holding raises the arm relative to the head');
 P.release(s,0);assert(!p.held);tick(s,60);assert(p.arm<.3,'arm returns to rest');
}
assert.equal(P.conditions.length,10);
for(const c of P.conditions){const s=P.create(4,seeded(23));P.round(s,c);
 for(let i=0;i<120*20;i++){
  for(let id=0;id<4;id++){if(i%(140+id*10)===0)P.press(s,id);if(i%(140+id*10)===80+id*7)P.release(s,id);}
  P.step(s,1/120);
  for(const p of s.players){assert(p.nodes[0].y<p.nodes[1].y-50,'torso stays upright in '+c.id);assert(Math.abs(p.nodes[0].x-p.nodes[1].x)<7,'limited lean');assert(p.y<=P.floor);for(const n of p.nodes)assert(Number.isFinite(n.x)&&Number.isFinite(n.y));}
  assert(Number.isFinite(s.ball.x)&&Number.isFinite(s.ball.vy));
 }
}
function shot(duration,x=350,team=0){
 const s=P.create(4,()=>.5),p=s.players[0];p.team=team;p.facing=team===0?1:-1;p.x=team===0?x:1000-x;s.players=[p];s.ball.holder=0;
 P.press(s,0);tick(s,Math.round(duration*120));assert.equal(s.ball.holder,0,'holding never auto-fires');P.release(s,0);assert.equal(s.ball.holder,null,'release fires');const launch={...s.ball};
 s.players=[];for(let i=0;i<480&&s.phase==='playing';i++)P.step(s,1/120);return{launch,s};
}
for(const team of [0,1]){let hits=0,misses=0;for(let t=.15;t<1.4;t+=.05){const {s}=shot(t,350,team);if(s.scores[team])hits++;else misses++;}assert(hits>0&&misses>0,'both made and missed physical shots on each side');}
assert.equal(shot(.2).s.scores[0],0,'a weak release does not get assisted into the hoop');
assert.notEqual(shot(.4).launch.vy,shot(.9).launch.vy,'hold duration changes the launch');
assert.notEqual(shot(.9,350).s.scores[0],shot(.9,500).s.scores[0],'the same release is not automatically corrected for distance');
const canceled=P.create(4);canceled.players=[canceled.players[0]];canceled.ball.holder=0;P.press(canceled,0);tick(canceled,70);P.cancelInput(canceled);assert.equal(canceled.ball.holder,0,'pause/blur/pointer cancellation must not shoot');assert(!canceled.players[0].held);
const winner=P.create();winner.scores[0]=4;winner.condition.points=2;P.score(winner,0);assert.equal(winner.phase,'finished');assert.equal(winner.winner,0);const frozen=JSON.stringify(winner);tick(winner,100);P.press(winner,0);assert.equal(JSON.stringify(winner),frozen);
const round=P.create(2,seeded(3));P.score(round,1);const condition=round.condition.id;tick(round,200);assert.notEqual(round.condition.id,condition);assert.equal(round.round,2);assert.equal(round.scores[1],1);
let complete=0;for(let seed=1;seed<=6;seed++){
 const rng=seeded(seed),s=P.create(seed%2?2:4,rng),durations=Array.from({length:s.mode},()=>60+Math.floor(rng()*70));
 for(let i=0;i<120*240&&s.phase!=='finished';i++){for(let p=0;p<s.mode;p++){const phase=(i+p*37)%(160+p*13);if(phase===0){durations[p]=25+Math.floor(rng()*125);P.press(s,p);}if(phase===durations[p])P.release(s,p);}P.step(s,1/120);}if(s.phase==='finished')complete++;
}
assert(complete>=3,'normal hold/release inputs can complete multiple matches');
console.log('PASS upright bodies in all conditions; hold raises arms; release shoots; misses/timing/distance; input cancellation; 2/4-player control; rounds/wins; '+complete+' complete physical matches');
