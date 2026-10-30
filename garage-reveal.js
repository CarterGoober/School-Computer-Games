(function(root){
'use strict';
const C=GarageCatalog,P=Progression;
 const icon=type=>type==='vehicle'?'<svg viewBox="0 0 100 100" aria-hidden="true"><path d="m50 8 41 23-41 24L9 31z" fill="#f5d394"/><path d="m9 31 41 24v39L9 71z" fill="#b57b40"/><path d="m50 55 41-24v40L50 94z" fill="#dba45e"/><path d="m32 20 41 24v40M19 38v29m14-21v29M60 61v20m13-28v20" fill="none" stroke="#79542e" stroke-width="5"/><path d="m42 13 41 23-13 8-41-24z" fill="#fff0c5"/><path d="M29 55v12m-6-8 6-6 6 12" fill="none" stroke="#fae7b4" stroke-width="3"/></svg>':'<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M35 15h30v15H35z" fill="#365967"/><path d="M43 9h15v10H43z" fill="#e6efdf"/><path d="M36 27q-9 4-9 15v42q0 12 23 12t23-12V42q0-11-9-15z" fill="#cfdece"/><path d="M28 46h44v34H28z" fill="#609c9c"/><path d="m50 50 11 15-11 12-11-12z" fill="#f6d699"/><path d="M34 36h7v52h-7z" fill="#fff8d744"/><path d="M58 12h8v4h-8z" fill="#1c3d46"/></svg>';

function show(game,result,onDone=()=>{}){
const dialog=document.createElement('dialog');dialog.className='g-shop shop-reveal';dialog.setAttribute('aria-label','Open your purchase');dialog.innerHTML='<div class="g-reveal"></div>';document.body.append(dialog);dialog.showModal();
const $=s=>dialog.querySelector(s);let drop=result,taps=0;const tier=drop.tier,type=drop.type;
dialog.addEventListener('cancel',e=>{e.preventDefault();if(dialog.querySelector('#g-keep-reward'))dialog.querySelector('#g-keep-reward').click();else reveal();});
taps=0;const panel=$('.g-reveal');panel.hidden=false;panel.className=`g-reveal ${tier}`;panel.innerHTML=`<div class="g-rays"></div><div class="g-orbit"></div><span class="g-reveal-label">${tier.toUpperCase()}</span><p class="g-reveal-type">${type==='vehicle'?'CARGO BOX':'SPRAY CAN'}</p><button class="g-open-object" aria-label="Tap to open ${tier} ${type==='vehicle'?'cargo box':'spray can'}">${icon(type)}</button><p class="g-tap">TAP TO OPEN</p><div class="g-tap-dots">${Array.from({length:C.tiers.indexOf(tier)+2},()=>'<i></i>').join('')}</div><button class="g-skip">Reveal now</button>`;
   const open=$('.g-open-object');open.focus();open.onclick=()=>{taps++;panel.classList.remove('pulse');void panel.offsetWidth;panel.classList.add('pulse');panel.querySelectorAll('.g-tap-dots i').forEach((el,i)=>el.classList.toggle('lit',i<taps));if(taps>=C.tiers.indexOf(tier)+2)reveal();};$('.g-skip').onclick=reveal;
  function reveal(){
   if(!drop)return;const panel=$('.g-reveal');panel.className=`g-reveal ${drop.rarity} revealed`;const vehicle=drop.item.vehicle;
   panel.innerHTML=`<div class="g-rays"></div><div class="g-orbit"></div><span class="g-reveal-label">${drop.rarity.toUpperCase()}</span><p class="g-reveal-type">${drop.duplicate?'DUPLICATE':drop.type==='vehicle'?'NEW VEHICLE':'NEW LIVERY'}</p><canvas class="g-reward-preview" width="560" height="300" aria-label="${drop.item.name}"></canvas><h3>${drop.item.name}</h3><p class="g-reward-note">${drop.duplicate?`${drop.refund.toLocaleString()} points refunded · exactly ⅔ of your ${drop.price.toLocaleString()}-point purchase.`:drop.type==='livery'?`An exclusive style for ${C.models[vehicle].name}.`:'Unlocked in this game’s vehicle selector.'}</p><div class="g-reward-actions">${!drop.duplicate&&P.read(game).owned.includes(vehicle)?'<button id="g-equip-reward">EQUIP FOR NEXT RUN</button>':''}<button id="g-keep-reward">CONTINUE →</button></div>`;
   FleetArt.preview($('.g-reward-preview'),vehicle,drop.type==='livery'?C.paints[drop.item.id]:null);
   const done=()=>{dialog.close();dialog.remove();onDone();};$('#g-keep-reward').onclick=done;
   if($('#g-equip-reward'))$('#g-equip-reward').onclick=()=>{P.equip(game,vehicle,drop.type==='livery'?drop.item.id:undefined);done();};$('#g-keep-reward').focus();
  }

}
root.GarageReveal={icon,show};
})(window);
