(function(){
 'use strict';
 const C=GarageCatalog,P=Progression,S=ShopCatalog,$=s=>document.querySelector(s),params=new URLSearchParams(location.search);
 let filter=C.games[params.get('game')]?params.get('game'):'all',day=null,pending=null,busy=false,revealing=false;
 const fmt=n=>n.toLocaleString(),label=type=>type==='vehicle'?'cargo box':'spray can';
 const preview=(vehicle,paint='',cls='')=>`<canvas class="${cls}" width="400" height="200" data-model="${vehicle}" data-paint="${paint}" aria-label="${paint?C.paints[paint].name:C.models[vehicle].name} preview"></canvas>`;
 function paintAll(scope=document){scope.querySelectorAll('canvas[data-model]').forEach(c=>FleetArt.preview(c,c.dataset.model,C.paints[c.dataset.paint]));}
 if(params.get('embedded')==='1'&&parent!==window){document.body.classList.add('embedded');$('#return-link').textContent='← Back to your game';$('#return-link').onclick=e=>{e.preventDefault();parent.postMessage('garage:shop-close',location.origin);};}
 function balance(){const amount=P.read('apex').balance;$('#balance').textContent=fmt(amount);$('#storage-note').textContent=P.storageAvailable?'Points, purchases, collections, and equipped looks are saved on this device. All purchases work offline after the garage is cached. Rooftop Rumble has no collectible items yet.':'Browser storage is unavailable. Purchases are disabled to protect your points. Enable storage and reload.';return amount;}
 function offerState(o){const p=P.read(o.game),owned=(o.type==='vehicle'?p.owned:p.liveries).includes(o.item.id),locked=o.type==='livery'&&!p.owned.includes(o.vehicle);return{owned,locked};}
 function render(){
  const amount=balance(),daily=S.daily();day=daily.day;
  $('#game-filters').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.game===filter)));
  const offers=daily.offers.filter(o=>filter==='all'||o.game===filter);
  $('#daily-offers').innerHTML=offers.length?offers.map(o=>{const state=offerState(o);return `<article class="offer daily-offer ${o.rarity}"><div class="offer-top"><span>${o.rarity.toUpperCase()} / GUARANTEED</span><span class="game-label">${C.games[o.game].name}</span></div><div class="offer-body"><div><p class="offer-type">${o.type==='vehicle'?'DIRECT VEHICLE UNLOCK':'DIRECT LIVERY UNLOCK'}</p><h3>${o.item.name}</h3><p>${o.type==='livery'?`For ${C.models[o.vehicle].name}`:o.item.description}</p></div>${preview(o.vehicle,o.type==='livery'?o.item.id:'')}</div><div class="offer-bottom"><small>${state.owned?'Already in your collection.':state.locked?`Livery only; vehicle not owned.`:'No roll. This exact item is yours.'}<br>${fmt(o.price)} Garage Points</small><button class="offer-button" data-offer="${o.id}" ${state.owned||!P.storageAvailable?'disabled':''}>${state.owned?'✓ Owned':`View offer · ${fmt(o.price)}`}</button></div></article>`;}).join(''):'<p class="empty-offers">Today’s two featured items belong to other games. Choose <b>All games</b> to see them. Boxes and cans for this game are below.</p>';
  $('#packs').innerHTML=Object.entries(C.games).filter(([game])=>filter==='all'||filter===game).map(([game,meta])=>{const p=P.read(game);return (game==='tide'?['livery']:['vehicle','livery']).map(type=>`<div class="pack-group"><h3>${meta.name} / ${type==='vehicle'?'Vehicle cargo boxes':'Livery spray cans'}</h3><div class="pack-grid">${C.tiers.map(tier=>{
   const pack=C.packages[tier],pool=S.contents(game,type,tier,p),samples=C.tiers.map(r=>pool.find(x=>x.item.rarity===r)?.item).filter(Boolean);
   return `<article class="offer pack-offer ${tier}"><div class="offer-top"><span>${pack.name.toUpperCase()}</span><span class="game-label">${meta.name}</span></div><div class="pack-object">${GarageReveal.icon(type)}</div><h3>${pack.name} ${label(type)}</h3><p>One ${type==='vehicle'?'vehicle':'livery'}. A whole new look.</p><div class="pack-odds">${C.tiers.map((r,i)=>`<span>${C.packages[r].name}<b>${Math.round(pack.odds[i]*100)}%</b></span>`).join('')}</div><div class="pack-previews">${samples.map(item=>preview(item.vehicle||item.id,type==='livery'?item.id:'')).join('')}<span>${pool.length}<br>possible<br>rewards</span></div><button class="offer-button" data-pack="${game}:${type}:${tier}" ${!P.storageAvailable?'disabled':''}>Preview & open · ${fmt(pack[type])} PTS</button><small class="pack-refund">Duplicate? ${fmt(pack[type]*2/3)} points back.</small></article>`;
  }).join('')}</div></div>`).join('');}).join('');
  document.querySelectorAll('[data-offer]').forEach(b=>b.onclick=()=>open({offerId:b.dataset.offer}));
  document.querySelectorAll('[data-pack]').forEach(b=>b.onclick=()=>{const [game,type,tier]=b.dataset.pack.split(':');open({game,type,tier});});paintAll();tick();
 }
 function open(selection){
  if(busy||revealing)return;
  let offer;if(selection.offerId){offer=S.daily().offers.find(o=>o.id===selection.offerId);if(!offer){render();return;}selection={offerId:offer.id,game:offer.game,type:offer.type};}
  pending={...selection,id:crypto.randomUUID()};const {game,type,tier}=selection,p=P.read(game),price=offer?offer.price:C.packages[tier][type];
  $('#purchase-game').textContent=C.games[game].name+' / '+(offer?'TODAY’S GUARANTEED PICK':'RANDOM REWARD');
  if(offer){
   $('#purchase-details').innerHTML=`<h2 id="purchase-title">${offer.item.name}</h2>${preview(offer.vehicle,type==='livery'?offer.item.id:'','guaranteed-preview')}<p><b>${C.packages[offer.rarity].name} ${type} · Guaranteed</b><br>You receive exactly this ${type} for <b>${C.games[game].name}</b>. ${type==='livery'?`Fits ${C.models[offer.vehicle].name}. ${p.owned.includes(offer.vehicle)?'': '<b>Vehicle not included. Save this livery until you unlock its vehicle.</b>'}`:''} It stays owned permanently.</p><p>This direct offer costs <b>${fmt(price)} Garage Points</b>. No random draw. Owned offers cannot be purchased again.</p>`;
  }else{
   const pack=C.packages[tier],pool=S.contents(game,type,tier,p);
   $('#purchase-details').innerHTML=`<h2 id="purchase-title">${pack.name} ${label(type)}</h2><p>One random ${type} for <b>${C.games[game].name}</b>. ${type==='livery'?'Only designs for your owned vehicles are eligible.':''} Duplicates stay in the draw and refund exactly <b>${fmt(price*2/3)} of your ${fmt(price)} points</b>.</p><p>${C.tiers.map((r,i)=>`${C.packages[r].name} ${Math.round(pack.odds[i]*100)}%`).join(' · ')}. Within each rarity, every pictured item is equally likely. Percentages below are per opening (rounded).</p><div class="contents-grid">${pool.map(({item,chance})=>`<article class="contents-item ${item.rarity}">${preview(item.vehicle||item.id,type==='livery'?item.id:'')}<b>${item.name}</b><small>${C.packages[item.rarity].name} · ${(chance*100).toFixed(2).replace(/\.00$/,'')}%${type==='livery'?`<br>For ${C.models[item.vehicle].name}`:''}<br>${(type==='vehicle'?p.owned:p.liveries).includes(item.id)?'Owned · duplicate refund applies':'New to your collection'}</small></article>`).join('')}</div>`;
  }
  $('#purchase-error').textContent=p.balance<price?`You need ${fmt(price-p.balance)} more Garage Points.`:'';
  $('#confirm-purchase').textContent=`Confirm purchase · ${fmt(price)} PTS`;$('#confirm-purchase').disabled=p.balance<price||!P.storageAvailable;
  $('#close-purchase').disabled=false;$('#cancel-purchase').disabled=false;
  paintAll($('#purchase-dialog'));$('#purchase-dialog').showModal();$('#purchase-dialog').scrollTop=0;$('#cancel-purchase').focus();
 }
 async function confirm(){
  if(busy||!pending)return;busy=true;const request={...pending};$('#confirm-purchase').disabled=true;$('#cancel-purchase').disabled=true;$('#close-purchase').disabled=true;$('#purchase-error').textContent='Saving your purchase…';
  try{
   const result=await P.checkout(request);
   if(!result.ok){$('#purchase-error').textContent=result.error;$('#confirm-purchase').disabled=false;return;}
   pending=null;$('#purchase-dialog').close();revealing=true;render();
   $('#shop-status').textContent=`${result.item.name}: ${result.duplicate?`${fmt(result.refund)} points refunded.`:`added to ${C.games[request.game].name}.`} Balance: ${fmt(P.read(request.game).balance)}.`;
   GarageReveal.show(request.game,result,()=>{revealing=false;render();});
  }catch{$('#purchase-error').textContent='Could not complete the purchase. Try again; this confirmation cannot charge twice.';$('#confirm-purchase').disabled=false;}
  finally{busy=false;$('#cancel-purchase').disabled=false;$('#close-purchase').disabled=false;}
 }
 function close(){if(!busy){$('#purchase-dialog').close();pending=null;}}
 function tick(){const daily=S.daily();if(day!==daily.day){render();return;}const total=Math.max(0,Math.ceil((daily.endsAt-Date.now())/1000)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;$('#countdown').textContent=[h,m,s].map(n=>String(n).padStart(2,'0')).join(':');}
 $('#game-filters').querySelectorAll('button').forEach(b=>b.onclick=()=>{filter=b.dataset.game;render();});
 $('#confirm-purchase').onclick=confirm;$('#close-purchase').onclick=close;$('#cancel-purchase').onclick=close;$('#purchase-dialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();else pending=null;});
 addEventListener('garage:updated',balance);addEventListener('storage',e=>{if(e.key==='afterclass-garage-v2'||e.key===null)render();});addEventListener('pageshow',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden){render();}});
 render();setInterval(tick,1000);if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
})();
