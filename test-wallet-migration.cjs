'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/progression.js','utf8'),C=require('./garage-catalog.js');
const day=new Date().toLocaleDateString('en-CA');
function load(saved,fail=false){const ctx={module:{exports:{}},require,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>{if(fail)throw Error('quota');saved.set(k,v);}}};vm.runInNewContext(source,ctx);return ctx.module.exports;}
const saved=new Map();let P=load(saved),originals={};
for(const [game,balance]of [['apex',600],['drift',123],['tide',77]]){let profile=JSON.parse(JSON.stringify(P.read(game)));profile.balance=balance;profile.daily.claimed=P.tasks(game).map(t=>t.id);profile.daily.progress.finishes=3;profile.bestTimes={'saved-record':42};if(game==='apex'){profile.owned.push('hybrid');profile.liveries=['hybrid-ultra'];profile.equipped={vehicle:'hybrid',paints:{hybrid:'hybrid-ultra'}};}originals[game]=profile;saved.set('afterclass-progress-'+game,JSON.stringify(profile));}
saved.delete('afterclass-garage-v2');P=load(saved);
for(const game of Object.keys(originals)){const p=P.read(game);assert.equal(p.balance,800);for(const key of ['owned','liveries','equipped','daily','bestTimes'])assert.deepEqual(JSON.parse(JSON.stringify(p[key])),JSON.parse(JSON.stringify(originals[game][key])),`${game} preserves ${key}`);}
const oldKeys=[...saved].filter(([k])=>k.startsWith('afterclass-progress-'));
P=load(saved);assert.equal(P.read('drift').balance,800,'migration is not applied twice');
let drop=P.purchase('apex','vehicle','rare',()=>.99999);assert(drop.duplicate);assert.equal(drop.refund,400);assert.equal(P.read('tide').balance,600,'cross-game spending uses the same wallet');
P.equip('tide','cruise');assert.equal(P.read('apex').balance,600,'equipment does not reset the wallet');
assert.deepEqual([...saved].filter(([k])=>k.startsWith('afterclass-progress-')),oldKeys,'legacy saves are retained verbatim');
// A second tab sees changes without reloading; no stale per-game balance is used.
const other=load(saved);P.event('drift','test',1,100);assert.equal(other.read('apex').balance,685);other.purchase('tide','livery','rare',()=>.1);assert.equal(P.read('drift').balance,385);
// Fractional earnings survive burst boundaries and module/page reloads.
const driftSaved=new Map();P=load(driftSaved);const before=P.read('drift').balance;
for(let i=0;i<10;i++){P.event('drift','driftSeconds',.25,.5);P=load(driftSaved);}
assert.equal(P.read('apex').balance-before,4);assert(Math.abs(P.read('drift').remainder-.25)<1e-8);
for(let i=0;i<30;i++)P.event('drift','driftSeconds',.25,.5);
const claimed=P.read('drift').daily.claimed;const daily=P.tasks('drift').filter(t=>claimed.includes(t.id)).reduce((n,t)=>n+t.reward,0);assert.equal(P.read('tide').balance-before-daily,17,'40 quarter seconds pay exactly 17 ordinary points');
const snapshot=[...saved];const failed=load(saved,true);const balance=failed.read('apex').balance;failed.event('tide','test',1,100);assert.equal(failed.read('drift').balance,balance+85);assert.equal(failed.storageAvailable,false);assert.deepEqual([...saved],snapshot,'failed write cannot split a debit from an unlock');
const bad=new Map([['afterclass-progress-apex','broken']]);const invalid=load(bad);invalid.event('apex','test',1,100);assert.equal(bad.size,1);assert.equal(bad.get('afterclass-progress-apex'),'broken','incomplete migration never overwrites unreadable saves');
console.log('PASS one-time shared migration, exact balance sum, intact claims/equipment/records/legacy saves, cross-page spending, fractional carry, and storage failure atomicity');
