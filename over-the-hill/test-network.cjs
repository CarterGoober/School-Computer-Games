'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),P=require('./physics.js');
assert(fs.existsSync(__dirname+'/network.js'),'latency-aware network reconciliation is required');
const N=require('./network.js'),flat=()=>0;
let local=P.spawn(flat),server=P.spawn(flat),net=N(P,flat,[]);local.z=12;
net.accept({car:server,updated:1000,input:{}},0);
assert.equal(local.z,12,'receiving a packet never teleports the local vehicle');
let maxMove=0;
for(let i=0;i<1200;i++){const z=local.z;net.step(local,{},1/120);P.step(local,{},1/120,flat);maxMove=Math.max(maxMove,Math.abs(local.z-z));}
assert(maxMove<.03);assert(Math.abs(local.z)<.1,'large errors converge gradually');
assert.equal(net.accept({car:{...server,z:500},updated:999,input:{}},0),false,'out of order packets cannot drag the player backwards');
// With 250ms packet age, prediction should track the current server position.
net=N(P,flat,[]);server=P.spawn(flat);server.speed=8;local=structuredClone(server);
for(let i=0;i<30;i++)P.step(local,{up:true},1/120,flat);
net.accept({car:server,updated:2000,input:{up:true}},.25);
const before=local.z;net.step(local,{up:true},1/120);
assert(Math.abs(local.z-before)<.003,'aged packets are projected before correction, not pulled to stale positions');
// Angles wrap across ±pi and the movement heading follows the body.
local=P.spawn(flat,0,0,Math.PI-.01);server=P.spawn(flat,0,0,-Math.PI+.01);net=N(P,flat,[]);net.accept({car:server,updated:3000,input:{}},0);net.step(local,{},1/120);assert(Math.abs(local.heading-(Math.PI-.01))<.01);
console.log('PASS no packet-time teleport, bounded correction, stale-packet rejection, latency projection and wrapped steering', {maxMove});
