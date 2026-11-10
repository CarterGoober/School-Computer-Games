/* Identical fixed-step arcade motion on the authority and predicting clients. */
(function(root){'use strict';const base=typeof module!=='undefined'?require('./base.js'):root.CityBase;const models={
rental:{name:'Borrowed hatch',tier:'rental',accel:210,max:215,drag:1.1,turn:1.05,length:44,width:23,color:'#629eac',value:0},
junk:{name:'Rustbucket 79',tier:'junk',accel:165,max:175,drag:1.3,turn:.85,length:46,width:24,color:'#9b7868',value:180},
sedan:{name:'Harbor S4',tier:'sedan',accel:235,max:245,drag:1.05,turn:1,length:50,width:25,color:'#7b9fca',value:500},
suv:{name:'Outlander XL',tier:'SUV',accel:250,max:240,drag:1.1,turn:.86,length:52,width:28,color:'#77a492',value:1100},
van:{name:'Parcel 600',tier:'van',accel:190,max:205,drag:1.15,turn:.72,length:58,width:27,color:'#c6aa88',value:650},
muscle:{name:'Vandal V8',tier:'muscle',accel:330,max:295,drag:1,turn:.93,length:53,width:27,color:'#d19a59',value:1900},
coupe:{name:'Comet RS',tier:'sports',accel:365,max:330,drag:.98,turn:1.16,length:47,width:25,color:'#bc85c5',value:2600},
exotic:{name:'Asterion X',tier:'exotic',accel:420,max:370,drag:.95,turn:1.12,length:51,width:28,color:'#b8da73',value:5500}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));function key(k={}){return{dx:clamp(Number(k.dx)||0,-1,1),dy:clamp(Number(k.dy)||0,-1,1),a:Number.isFinite(k.a)?k.a:0,handbrake:!!k.handbrake,shot:Number.isSafeInteger(k.shot)&&k.shot>0?k.shot:0,f:!!k.f,rob:!!k.rob,fire:!!k.fire,slot:clamp(Math.floor(Number(k.slot)||0),0,4)}}
function solid(map,cars,x,y,r,ignore){return !map.land(x,y)||map.walls.some(([a,b,w,h])=>x+r>a&&x-r<a+w&&y+r>b&&y-r<b+h)||cars.some(c=>c.id!==ignore&&!c.driver&&Math.hypot(c.x-x,c.y-y)<r+18)}
function step(p,c,k,dt,blocked){const dx=k.dx||0,dy=k.dy||0,move=(x,y,r)=>{const parts=Math.max(1,Math.ceil(Math.hypot(x,y)/6));for(let i=0;i<parts;i++){if(!blocked(p.x+x/parts,p.y,r))p.x+=x/parts;if(!blocked(p.x,p.y+y/parts,r))p.y+=y/parts}};if(c){const m=models[c.kind]||models.sedan,throttle=-dy,brake=!!k.handbrake;
// Preserve momentum through a turn; the handbrake releases rear lateral grip.
const old=c.a;c.v+=(throttle*m.accel-c.v*(brake?5.2:throttle?m.drag:2.8))*dt;c.v=clamp(c.v,-m.max*.4,m.max);
const target=dx*2.9*m.turn*Math.tanh(c.v/85)/(1+Math.abs(c.v)/580)*(brake?1.4:1);
c.steer=(c.steer||0)+(target-(c.steer||0))*(1-Math.exp(-dt*14));c.a+=c.steer*dt;
const yaw=c.a-old,side=c.slip||0;c.slip=clamp((side*Math.cos(yaw)-c.v*Math.sin(yaw))*Math.exp(-dt*(brake?1.1:13)),-110,110);
const x=p.x,y=p.y;p.a=c.a;move((Math.cos(c.a)*c.v-Math.sin(c.a)*c.slip)*dt,(Math.sin(c.a)*c.v+Math.cos(c.a)*c.slip)*dt,20);
if(Math.hypot(p.x-x,p.y-y)<Math.hypot(c.v,c.slip)*dt*.4){c.v*=.35;c.slip*=.35}Object.assign(c,{x:p.x,y:p.y});p.v=c.v;}else{const n=Math.max(1,Math.hypot(dx,dy));p.a=k.a??p.a;move(dx/n*110*dt,dy/n*110*dt,8);p.v=Math.hypot(dx,dy)*110}}
function progress(p,k,map){if(p.mode!=='city')return;p.fHold=p.role==='civilian'&&k.f?Math.min(3.99,(p.fHold||0)+.025):0;const store=map.stores.find(b=>p.x>b.x+10&&p.x<b.x+b.w-10&&p.y>b.y+10&&p.y<b.y+b.h);p.robTime=p.role==='criminal'&&!p.car&&k.rob&&store?Math.min(9.99,(p.robTime||0)+.025):0;}
class Predictor{constructor(map){this.map=map;this.pending=[];this.next=0;this.error=0}reset(p,c){this.player={...p};this.car=c?{...c}:null;this.pending=[];this.next=p.seq||0}step(k,dt,cars){if(!this.player)return;const cmd={...key(k),seq:++this.next};this.pending.push(cmd);if(this.pending.length>240){this.pending.shift();this.saturated=true}step(this.player,this.car,cmd,.025,(x,y,r)=>this.player.mode==='hideout'?base.solid(x,y,r):solid(this.map,cars,x,y,r,this.car?.id));progress(this.player,cmd,this.map);return cmd}reconcile(p,c,cars){if(!this.player||p.generation!==this.player.generation||p.mode!==this.player.mode||p.car!==this.player.car){this.reset(p,c);return true}if(p.seq<(this.ack||0))return;this.ack=p.seq;this.pending=this.pending.filter(k=>k.seq>p.seq);const old=this.player;this.player={...p};this.car=c?{...c}:null;for(const k of this.pending){step(this.player,this.car,k,.025,(x,y,r)=>this.player.mode==='hideout'?base.solid(x,y,r):solid(this.map,cars,x,y,r,this.car?.id));progress(this.player,k,this.map)}this.error=Math.hypot(old.x-this.player.x,old.y-this.player.y);this.next=Math.max(this.next,p.seq);return false}}
const api={models,key,solid,step,Predictor};root.CityMotion=api;if(typeof module!=='undefined')module.exports=api;})(globalThis);
