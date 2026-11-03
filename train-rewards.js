(function(root){
 'use strict';
 const rates=Object.freeze({landing:6,transfer:3,tenSeconds:3,thousandScore:10,personalBest:30});
 function create(id,best=0){return{id,best,landings:0,transfers:0,timeBlocks:0,scoreBlocks:0,total:0,done:false};}
 function update(run,s,award){
  if(run.done)return 0;let total=0;
  function pay(name,count,points){total+=award('summit',points,run.id+':'+name+':'+count).total;}
  if(s.phase==='running'){
   if(s.landings>run.landings){pay('landing',s.landings,(s.landings-run.landings)*rates.landing+(s.transfers-run.transfers)*rates.transfer);run.landings=s.landings;run.transfers=s.transfers;}
   const blocks=Math.floor(s.time/10),score=Math.floor(s.score/1000);
   if(blocks>run.timeBlocks){pay('survival',blocks,(blocks-run.timeBlocks)*rates.tenSeconds);run.timeBlocks=blocks;}
   if(score>run.scoreBlocks){pay('score',score,(score-run.scoreBlocks)*rates.thousandScore);run.scoreBlocks=score;}
  }
  if(s.phase==='finished'){if(s.score>run.best&&s.score>=300)pay('best',1,rates.personalBest);run.done=true;}
  run.total+=total;return total;
 }
 const api={rates,create,update};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SummitRewards=api;
})(typeof window!=='undefined'?window:globalThis);
