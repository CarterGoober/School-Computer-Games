'use strict';
const assert=require('node:assert/strict'),P=require('./basketball-physics');
function seeded(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function tick(s,n){for(let i=0;i<n;i++)P.step(s,1/120);}
assert.equal(P.conditions.length,10);assert.equal(new Set(P.conditions.map(c=>c.id)).size,10);
for(const mode of [2,4]){
 const s=P.create(mode,seeded(mode));tick(s,120);const old=s.players.map(p=>p.nodes[1].vy);P.press(s,0);
 assert(s.players[0].nodes[1].vy<old[0]-200);assert.equal(s.players[2].nodes[1].vy,old[2]);
 if(mode===2)assert(s.players[1].nodes[1].vy<old[1]-200);else assert.equal(s.players[1].nodes[1].vy,old[1]);
 const once=s.players[0].nodes[1].vy;P.press(s,0);assert.equal(s.players[0].nodes[1].vy,once,'cooldown prevents repeat spam');
}
for(const condition of P.conditions){
 for(const side of [0,1]){
  const s=P.create(4,()=>.5);P.round(s,condition);tick(s,100);
  const p=s.players[side===0?0:3];s.ball.holder=p.index;P.step(s,1/120);P.press(s,p.index);
  assert.equal(s.ball.holder,null);assert(s.ball.vy<0,'press with possession shoots upward');
  // Simulate an unobstructed shot, exercising gravity, wind, rim collisions and basket crossing.
  s.players=[];
  tick(s,480);assert(s.scores[side]>0,condition.id+' aimed shot scores on '+side);
 }
 const s=P.create(2,seeded(7));P.round(s,condition);for(let i=0;i<120*12;i++){if(i%36===0){P.press(s,0);P.press(s,1);}P.step(s,1/120);for(const p of s.players)for(const n of p.nodes){assert(Number.isFinite(n.x)&&Number.isFinite(n.y)&&Number.isFinite(n.vx));assert(n.x>=29&&n.x<=971);assert(n.y<=P.floor+.1);}assert(Number.isFinite(s.ball.x));}
}
const s=P.create(2,seeded(123));s.condition.points=2;P.score(s,1);assert.equal(s.scores[1],2);assert.equal(s.phase,'round');const previous=s.condition.id;tick(s,240);assert.equal(s.phase,'playing');assert.notEqual(s.condition.id,previous);s.scores[0]=4;P.score(s,0);assert.equal(s.winner,0);assert.equal(s.phase,'finished');const frozen=JSON.stringify(s);tick(s,100);P.press(s,0);assert.equal(JSON.stringify(s),frozen,'winning freezes the match');
// Several actual one-button matches must finish, without injecting scores or ball positions.
for(let seed=1;seed<=5;seed++){
 const match=P.create(seed%2?2:4,seeded(seed));for(let i=0;i<120*180&&match.phase!=='finished';i++){if(i%34===0)for(let p=0;p<match.mode;p++)P.press(match,p);P.step(match,1/120);}assert.equal(match.phase,'finished','playable seeded match '+seed);assert(Math.max(...match.scores)>=5);
}
console.log('PASS team/individual controls, cooldown, possession/shooting, real baskets in all 10 conditions, bounded ragdolls, round changes, first to 5, freeze, and five full one-button matches');
