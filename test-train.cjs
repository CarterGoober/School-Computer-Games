'use strict';
const assert=require('node:assert/strict'),P=require('./train-physics.js'),R=require('./train-rewards.js'),vm=require('node:vm'),fs=require('node:fs');
const dt=1/120;
function simulate(s,seconds,input={}){for(let i=0;i<seconds*120;i++)P.step(s,input,dt);return s;}
for(const input of [{},{throttle:true},{brake:true},{throttle:true,brake:true}]){const s=simulate(P.create(),3,input);assert(s.speed>0);assert(s.z>50);assert.equal(s.phase,'running');}
assert(simulate(P.create(),3,{throttle:true}).speed>simulate(P.create(),3).speed);assert(simulate(P.create(),3,{brake:true}).speed<simulate(P.create(),3).speed);assert(P.limits(200).min>P.limits(0).min);assert(P.limits(400).coast>P.limits(0).coast);
const locked=P.create();assert.equal(P.turn(locked,1),false);assert.equal(locked.x,0);assert(P.jump(locked));assert(!P.jump(locked));assert(P.turn(locked,-1));simulate(locked,2);assert.equal(locked.lane,0);assert.equal(locked.transfers,1);assert.equal(locked.landings,1);
// Automatic ramp can be cleared even under full brakes, at starting and maximum pace.
for(const time of [0,40,180,500])for(const input of [{},{brake:true},{throttle:true}]){const s=P.create();s.z=96;s.time=time;s.speed=P.limits(time)[input.brake?'min':input.throttle?'max':'coast'];simulate(s,2.4,input);assert.equal(s.phase,'running');assert(s.landings>=1);}
const fail=P.create();fail.z=275;simulate(fail,3);assert.notEqual(fail.phase,'running','center track ends after second gap');assert.equal(fail.transfers,0);const score=fail.score;simulate(fail,2);assert.equal(fail.phase,'finished');assert.equal(fail.score,score,'falling never adds score');
const rock=P.create();rock.z=1048;rock.lane=P.section(5).rock.lane;rock.x=P.laneX(rock.lane);rock.target=rock.lane;simulate(rock,1);assert.notEqual(rock.phase,'running');
// A normal-input bot must survive many complete sections at every speed, including full-brake play.
function play(seed,input,seconds){const s=P.create(seed);for(let n=0;n<seconds*120;n++){
 const seg=P.section(Math.floor(s.z/P.LENGTH),seed),rock=seg.rock;
 if(!s.airborne&&rock&&rock.lane===s.lane&&rock.z-s.z>0&&rock.z-s.z<s.speed*.42+4)P.jump(s);
 if(s.airborne&&rock&&rock.z>s.z&&rock.z-s.z<70&&rock.lane===s.target){const safe=[0,1,2].find(l=>l!==rock.lane&&P.rail(rock.z,l,seed));P.turn(s,Math.sign(safe-s.target));}
 if(s.airborne){const flight=(s.vy+Math.sqrt(s.vy*s.vy+24*s.y))/12,landingZ=s.z+s.speed*flight;if(!P.rail(landingZ,s.target,seed)){const safe=[0,1,2].filter(l=>P.rail(landingZ,l,seed)).sort((a,b)=>Math.abs(a-s.target)-Math.abs(b-s.target))[0];P.turn(s,Math.sign(safe-s.target));}}
 P.step(s,input,dt);if(s.phase!=='running')throw Error(`seed ${seed} at ${s.z.toFixed(1)}: ${s.reason}`);
 }assert(s.score>4000);assert(s.landings>20);assert(s.transfers>6);assert(s.history.length<=360);return s;}
for(let seed=1;seed<=4;seed++)for(const input of [{},{brake:true},{throttle:true}])play(seed,input,180);
// Rewards use the shared wallet at its current economy scale and leave existing profiles untouched.
const saved=new Map(),ctx={module:{exports:{}},require,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}};vm.runInNewContext(fs.readFileSync(__dirname+'/progression.js','utf8'),ctx);const G=ctx.module.exports;G.event('apex','fixture',1,1000);const balance=G.read('apex').balance,profiles=JSON.stringify(JSON.parse(saved.get('afterclass-garage-v2')).profiles);
const run=R.create('test-run',800),s=P.create();s.landings=2;s.transfers=1;s.time=21;s.score=1200;R.update(run,s,G.awardGarage);assert.equal(run.total,18);R.update(run,s,G.awardGarage);assert.equal(run.total,18);s.phase='falling';s.time=30;R.update(run,s,G.awardGarage);assert.equal(run.total,18);s.phase='finished';R.update(run,s,G.awardGarage);assert.equal(run.total,36);R.update(run,s,G.awardGarage);assert.equal(run.total,36);assert.equal(G.read('tide').balance,balance+36);assert.equal(JSON.stringify(JSON.parse(saved.get('afterclass-garage-v2')).profiles),profiles);assert.equal(G.awardGarage('summit',30,'test-run:best:1').total,0);
const short=R.create('short',0),shortState={...P.create(),score:200,phase:'finished'};assert.equal(R.update(short,shortState,G.awardGarage),0,'tiny runs cannot farm record bonuses');
console.log('PASS Summit: downhill/coast/brakes/throttle, increasing pace, grounded rail lock, midair transfers, safe ramps at all speeds, failed landings/rocks, bounded history, 12 three-minute normal-input runs, shared rewards at current economy rate, deduplication, no falling/short-record rewards, preserved existing profiles');
