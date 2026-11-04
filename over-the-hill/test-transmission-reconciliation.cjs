'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const P=require('./physics.js'),N=require('./network.js'),flat=()=>0,dt=1/120;
const source=fs.readFileSync(require.resolve('./transmission-ui.js'),'utf8');

// Load the real transmission UI; only its DOM and transport boundary are stubbed.
function fixture(car=P.spawn(flat),nextCommand=10){
 const buttons=new Map(),listeners=new Map(),messages=[],sent=[];
 const context={P,car,mode:'playing',chatOpen:false,nextCommand,
  $:selector=>{if(!buttons.has(selector))buttons.set(selector,{});return buttons.get(selector);},
  addEventListener:(type,listener)=>listeners.set(type,listener),
  showLocation:message=>messages.push(message),
  sendInput:()=>{sent.push({seq:context.nextCommand,gear:vm.runInContext('selectedGear',context)});context.nextCommand++;}
 };
 vm.createContext(context);vm.runInContext(source,context,{filename:'transmission-ui.js'});
 return{context,messages,sent,selected:()=>vm.runInContext('selectedGear',context),
  key:(code,key)=>listeners.get('keydown')({code,key,repeat:false,target:{matches:()=>false},preventDefault(){},stopImmediatePropagation(){}})};
}
const first=fixture();
assert.equal(typeof first.context.reconcileTransmission,'function','transmission UI must reconcile acknowledged authoritative shifts');

const pose=car=>({x:car.x,y:car.y,z:car.z,q:[...car.q],vx:car.vx,vy:car.vy,vz:car.vz,speed:car.speed,heading:car.heading});
function settle(car){for(let i=0;i<120;i++)P.step(car,{gear:1,parking:true},dt,flat);return car;}

// A delayed snapshot must preserve the selection whose command is still in flight.
{
 const local=settle(P.spawn(flat)),ui=fixture(local);local.speed=local.vz=1.1;
 ui.key('ShiftRight','Shift');assert.equal(local.gear,-1);assert.equal(ui.selected(),-1);assert.equal(ui.sent[0].seq,10);
 const authority={...local,gear:1,manual:true,shiftTime:0,rpm:1300,speed:1.3,vz:1.3},before=pose(local);
 ui.context.reconcileTransmission(authority,9);
 assert.equal(local.gear,-1,'an unacknowledged reverse selection survives an older snapshot');assert.equal(ui.selected(),-1);
 ui.context.reconcileTransmission(authority,10);
 assert.equal(local.gear,1,'an acknowledged server guard rejection restores the actual gear');assert.equal(ui.selected(),1);
 assert.equal(local.manual,true);assert.equal(local.shiftTime,0);assert.equal(local.rpm,1300);
 assert.deepEqual(pose(local),before,'transmission reconciliation does not teleport or alter momentum');
 assert(ui.messages.some(message=>/slow|brake|shift|reverse|gear|direction/i.test(message)),'a rejected selection explains the shift guard to the driver');
}

// Acknowledged forward selections retain the authority's clutch and engine state.
{
 const local=settle(P.spawn(flat)),ui=fixture(local),before=pose(local);
 assert(ui.context.chooseGear(4));
 ui.context.reconcileTransmission({...local,gear:4,manual:true,shiftTime:.11,rpm:1800},10);
 assert.equal(local.gear,4);assert.equal(ui.selected(),4);assert.equal(local.shiftTime,.11);assert.equal(local.rpm,1800);
 assert(ui.context.chooseGear(5));
 ui.context.reconcileTransmission({...local,gear:4,shiftTime:0},10);
 assert.equal(local.gear,5,'a newer forward selection is not overwritten by the preceding acknowledgement');
 ui.context.reconcileTransmission({...local,gear:5,manual:true,shiftTime:.06,rpm:2100},11);
 assert.equal(local.gear,5);assert.equal(ui.selected(),5);assert.equal(local.shiftTime,.06);assert.equal(local.rpm,2100);
 assert.deepEqual(pose(local),before);
 const transmission={gear:local.gear,manual:local.manual,shiftTime:local.shiftTime,rpm:local.rpm};
 for(const gear of [undefined,0,99,-2,NaN]){
  ui.context.reconcileTransmission({gear,manual:false,shiftTime:0,rpm:0},100);
  assert.deepEqual({gear:local.gear,manual:local.manual,shiftTime:local.shiftTime,rpm:local.rpm},transmission,'invalid legacy gears leave the current transmission intact');
 }
 ui.context.nextCommand=25;ui.context.resetTransmission();ui.context.reconcileTransmission({gear:5,manual:true,shiftTime:0,rpm:900},24);
 assert.equal(local.gear,1,'recovery protects its fresh first-gear selection from older acknowledgements');
}

// Exercise the original failure with actual physics and smooth network correction.
// Near the direction guard, prediction accepts reverse while authority refuses it.
{
 const local=settle(P.spawn(flat)),authority=settle(P.spawn(flat)),ui=fixture(local),net=N(P,flat,[]),controls=()=>({gear:ui.selected(),up:true});
 local.speed=local.vz=1.1;authority.speed=authority.vz=1.3;assert(ui.context.chooseGear(-1));
 for(let tick=0;tick<1200;tick++){
  P.step(authority,controls(),dt,flat);
  if(tick%8===0){net.accept({car:authority,updated:tick,input:controls()});ui.context.reconcileTransmission(authority,10);}
  net.step(local,controls(),dt);P.step(local,controls(),dt,flat);
 }
 assert.equal(authority.gear,1,'the real authority rejects reverse above the direction guard');
 assert.equal(local.gear,1);assert.equal(ui.selected(),1);assert(local.speed>3&&authority.speed>3,'both cars drive forward after the refusal');
 const gap=Math.hypot(local.x-authority.x,local.z-authority.z);
 assert(gap<.5,'acknowledged gear correction lets the existing network reconciliation converge: '+gap);
 console.log('PASS authoritative transmission reconciliation, pending selection, clutch state, legacy snapshots and rejected-shift convergence',{gap});
}
