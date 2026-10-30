(function(root){
  'use strict';
  const C=typeof module!=='undefined'&&module.exports?require('./garage-catalog.js'):root.GarageCatalog;
  const rewardRates=Object.freeze({raceFinish:70,raceBest:44,jump:9,driftSecond:2,load:4,perfectLoad:24,pirate:14,restart:8,rescue:20,voyageFinish:80,voyageBest:40});
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));let serial=0,storageOK=true,walletMemory=null,walletWriteFailed=false;
  const WALLET_KEY='afterclass-garage-v2';
  function dateKey(now=new Date()){return`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
  const taskPool={
    apex:[['checkpoints',4,'Pass 4 checkpoints',120],['distance',800,'Drive 800 meters',140],['best',1,'Beat a personal best',220],['finishes',2,'Finish 2 races',260]],
    drift:[['driftSeconds',10,'Hold drifts for 10 seconds total',180],['jumps',2,'Hit 2 jumps',160],['checkpoints',4,'Pass 4 checkpoints',120],['best',1,'Beat a personal best',220]],
    tide:[['loads',6,'Load 6 cargo containers',180],['pirates',2,'Repel 2 pirate boats',180],['restarts',1,'Restart a cruise engine',160],['rescues',1,'Rescue a passenger',180],['perfectLoads',2,'Make 2 perfect cargo placements',220]]
  };
  function tasks(game,day=dateKey()){const hash=[...day].reduce((a,c)=>a*31+c.charCodeAt(0),0)>>>0,pool=taskPool[game],first=hash%pool.length;return[['finishes',1,game==='tide'?'Complete a delivery':'Finish a race',200],pool[first],pool[(first+1)%pool.length]].map(([event,goal,label,reward],id)=>({id:`${day}:${id}`,event,goal,label,reward:Math.round(Math.round(reward*.2)*.85)}));}
  function fresh(game){return{version:1,balance:0,earned:0,owned:[...C.games[game].starters],liveries:[],equipped:{vehicle:C.games[game].starters[0],paints:{}},daily:{date:dateKey(),progress:{},claimed:[]},events:[],bestTimes:{},lastDrop:null,remainder:0};}
  function normalize(game,data){
    const p=fresh(game);if(!data||typeof data!=='object')return p;
    for(const key of ['balance','earned'])if(Number.isSafeInteger(data[key])&&data[key]>=0)p[key]=data[key];
    p.owned=[...new Set([...p.owned,...(Array.isArray(data.owned)?data.owned:[]).filter(id=>C.games[game].models.includes(id))])];
    p.liveries=(Array.isArray(data.liveries)?data.liveries:[]).filter(id=>C.paints[id]&&p.owned.includes(C.paints[id].vehicle));
    if(p.owned.includes(data.equipped?.vehicle))p.equipped.vehicle=data.equipped.vehicle;
    for(const id of p.owned){const paint=data.equipped?.paints?.[id];if(p.liveries.includes(paint)&&C.paints[paint].vehicle===id)p.equipped.paints[id]=paint;}
    if(data.daily?.date===dateKey())p.daily={date:data.daily.date,progress:{...(data.daily.progress||{})},claimed:Array.isArray(data.daily.claimed)?data.daily.claimed:[]};
    if(Number.isFinite(data.remainder)&&data.remainder>=0&&data.remainder<1)p.remainder=data.remainder;
    p.events=(Array.isArray(data.events)?data.events:[]).filter(x=>typeof x==='string').slice(-600);
    if(data.bestTimes&&typeof data.bestTimes==='object')for(const [k,v]of Object.entries(data.bestTimes))if(Number.isFinite(v)&&v>0)p.bestTimes[k]=v;
    if(data.lastDrop&&(C.models[data.lastDrop.item?.id]||C.paints[data.lastDrop.item?.id]))p.lastDrop=data.lastDrop;
    return p;
  }
  // One storage record commits wallet and collections together. Legacy keys remain intact.
  function wallet(){
    if(!walletWriteFailed&&typeof localStorage!=='undefined'){
      try{
        const raw=localStorage.getItem(WALLET_KEY);
        if(raw){const w=JSON.parse(raw);if(w.version!==2||!Number.isSafeInteger(w.balance)||w.balance<0||!w.profiles)throw Error('Invalid wallet');walletMemory=w;return w;}
        if(!walletMemory){
          const profiles={};let balance=0;
          for(const game of Object.keys(C.games)){
            const old=localStorage.getItem(`afterclass-progress-${game}`);
            // Never persist an incomplete migration when an existing save cannot be read.
            const profile=old?JSON.parse(old):fresh(game);profiles[game]=profile;
            if(Number.isSafeInteger(profile.balance)&&profile.balance>=0)balance+=profile.balance;
          }
          if(!Number.isSafeInteger(balance))throw Error('Wallet too large');
          walletMemory={version:2,balance,profiles};
          persistWallet(walletMemory);
        }
      }catch{storageOK=false;walletWriteFailed=true;}
    }
    if(!walletMemory)walletMemory={version:2,balance:0,profiles:{}};
    return walletMemory;
  }
  function persistWallet(w){walletMemory=w;try{if(typeof localStorage!=='undefined'&&!walletWriteFailed)localStorage.setItem(WALLET_KEY,JSON.stringify(w));}catch{storageOK=false;walletWriteFailed=true;}}
  function read(game){if(!C.games[game])throw Error('Unknown game');const w=wallet(),p=normalize(game,w.profiles[game]);p.balance=w.balance;return p;}
  function save(game,p){const w=wallet();w.balance=p.balance;w.profiles[game]=p;persistWallet(w);if(typeof root.dispatchEvent==='function'&&typeof CustomEvent!=='undefined')root.dispatchEvent(new CustomEvent('garage:updated',{detail:{game,balance:w.balance}}));return p;}
  function event(game,event,quantity=1,points=0,id){
    if(!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(points)||points<0)return{points:0,daily:0,total:0};
    const p=read(game);if(id&&p.events.includes(id))return{points:0,daily:0,total:0};if(id)p.events.push(id);
    const scaled=points*.85+p.remainder;points=Math.floor(scaled+1e-9);p.remainder=Math.max(0,scaled-points);p.daily.progress[event]=Math.max(0,Number(p.daily.progress[event])||0)+quantity;
    let daily=0;for(const task of tasks(game,p.daily.date))if(!p.daily.claimed.includes(task.id)&&(Number(p.daily.progress[task.event])||0)>=task.goal){p.daily.claimed.push(task.id);daily+=task.reward;}
    p.balance+=points+daily;p.earned+=points+daily;p.events=p.events.slice(-600);save(game,p);return{points,daily,total:points+daily};
  }
  function random(){if(root.crypto?.getRandomValues){const a=new Uint32Array(1);root.crypto.getRandomValues(a);return a[0]/4294967296;}return Math.random();}
  function purchase(game,type,tier,rng=random){
    const pack=C.packages[tier],p=read(game);if(!pack||!['vehicle','livery'].includes(type)||game==='tide'&&type==='vehicle')return{ok:false,error:'Choose an available box or spray can.'};
    const price=pack[type];if(p.balance<price)return{ok:false,error:`You need ${price-p.balance} more points.`};
    const roll=clamp(rng(),0,.999999999),tierIndex=roll<pack.odds[0]?0:roll<pack.odds[0]+pack.odds[1]?1:2,rarity=C.tiers[tierIndex];
    const pool=type==='vehicle'?C.newVehicles.filter(v=>v.rarity===rarity):C.liveries.filter(v=>v.rarity===rarity&&p.owned.includes(v.vehicle));
    const item=pool[Math.floor(clamp(rng(),0,.999999999)*pool.length)];if(!item)return{ok:false,error:'No rewards available in this collection.'};
    const collection=type==='vehicle'?p.owned:p.liveries,duplicate=collection.includes(item.id),refund=duplicate?price*2/3:0;
    p.balance-=price;p.balance+=refund;if(!duplicate)collection.push(item.id);
    const result={ok:true,type,tier,rarity,item:{id:item.id,name:item.name,vehicle:item.vehicle||item.id,kind:type},duplicate,refund,price,netCost:price-refund};p.lastDrop=result;save(game,p);return result;
  }
  function equip(game,vehicle,paint){const p=read(game);if(!p.owned.includes(vehicle))return false;if(paint&&(!p.liveries.includes(paint)||C.paints[paint]?.vehicle!==vehicle))return false;p.equipped.vehicle=vehicle;if(paint===null)delete p.equipped.paints[vehicle];else if(paint)p.equipped.paints[vehicle]=paint;save(game,p);return true;}
  function appearance(game,vehicle){const p=read(game);return C.paints[p.equipped.paints[vehicle]]||null;}
  function begin(game){return{game,id:`${Date.now().toString(36)}-${++serial}-${Math.floor(random()*1e8)}`,awarded:0,daily:0,seq:0,done:false,previous:null,distance:0,drift:0,jumps:0,checkpoints:0,boat:{},finish:null};}
  function earn(run,eventName,quantity,points){const earned=event(run.game,eventName,quantity,points,`${run.id}:${++run.seq}`);run.awarded+=earned.total;run.daily+=earned.daily;return earned;}
  function updateDrive(run,car,dt){
    if(!run||run.done)return;
    if(run.previous){const distance=Math.hypot(car.x-run.previous.x,car.z-run.previous.z);if(distance<Math.abs(car.speed)*dt+2)run.distance+=distance;}
    run.previous={x:car.x,z:car.z};if(run.distance>=50){const n=Math.floor(run.distance/50)*50;earn(run,'distance',n,0);run.distance-=n;}
    if(car.nextCheckpoint>run.checkpoints){earn(run,'checkpoints',car.nextCheckpoint-run.checkpoints,0);run.checkpoints=car.nextCheckpoint;}
    if((car.jumps||0)>run.jumps){earn(run,'jumps',car.jumps-run.jumps,(car.jumps-run.jumps)*rewardRates.jump);run.jumps=car.jumps;}
    if(run.game==='drift'&&!car.airborne&&car.driftAngle>.13&&Math.abs(car.speed)>8){run.drift+=dt;if(run.drift>=1){const n=Math.floor(run.drift);earn(run,'driftSeconds',n,n*rewardRates.driftSecond);run.drift-=n;}}
  }
  function updateBoat(run,s){
    if(!run||run.done)return;const mult={easy:1,medium:1.5,hard:2.2}[s.difficulty]||1;
    const values={loads:s.crane?CCount(s.crane):0,perfectLoads:s.crane?.perfects||0,pirates:s.stats.pirates,restarts:s.stats.restarts,rescues:s.stats.rescues};
    for(const [name,n]of Object.entries(values)){const previous=run.boat[name]||0;if(n>previous)earn(run,name,n-previous,(n-previous)*({loads:rewardRates.load,perfectLoads:rewardRates.perfectLoad,pirates:rewardRates.pirate,restarts:rewardRates.restart,rescues:rewardRates.rescue}[name])*(name==='loads'||name==='perfectLoads'?1:mult));run.boat[name]=Math.max(previous,n);}
  }
  function CCount(crane){return crane.boxes.filter(b=>b.loadedOnce).length;}
  function finishRace(run,{time,best,trackId=0}){
    if(!run||run.done||!Number.isFinite(time)||time<=0)return null;
    const mult=(run.game==='apex'?[1,1.25,1.5]:[1.15,1,1.25,1.4,1.6])[trackId]||1;
    const base=Math.round(rewardRates.raceFinish*mult),speed=Math.round(clamp(170-time*2,0,130)*mult),pb=Number.isFinite(best)&&time<best-.001?Math.round(rewardRates.raceBest*mult):0;
    earn(run,'finishes',1,base+speed);if(pb)earn(run,'best',1,pb);run.done=true;return run.finish={base,speed,pb,mult,total:run.awarded,daily:run.daily};
  }
  function finishBoat(run,s){
    if(!run||run.done)return null;updateBoat(run,s);
    if(s.stage!=='complete'){run.done=true;return{total:run.awarded,daily:run.daily};}
    const mult={easy:1,medium:1.5,hard:2.2}[s.difficulty]||1,p=read('tide'),key=`${s.vessel}:${s.difficulty}`,best=p.bestTimes[key],cargoLost=s.vessel==='cargo'?clamp(s.stats.cargoLost||0,0,6):0,pb=!cargoLost&&best&&s.voyageTime<best?Math.round(rewardRates.voyageBest*mult):0;
    const base=Math.round(rewardRates.voyageFinish*mult),speed=Math.round(clamp(72-s.voyageTime*.4,0,72)*mult),cargoPenalty=Math.round((base+speed)*cargoLost/6),completion=base+speed-cargoPenalty;earn(run,'finishes',1,completion);if(pb)earn(run,'best',1,pb);
    const fresh=read('tide');if(!cargoLost)fresh.bestTimes[key]=Math.min(best||Infinity,s.voyageTime);save('tide',fresh);run.done=true;return run.finish={base,speed,pb,mult,cargoLost,cargoPenalty,completion,total:run.awarded,daily:run.daily};
  }
  const api={catalog:C,rewardRates,dateKey,tasks,read,event,purchase,equip,appearance,begin,updateDrive,updateBoat,finishRace,finishBoat,get storageAvailable(){return storageOK;}};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Progression=api;
})(typeof window!=='undefined'?window:globalThis);
