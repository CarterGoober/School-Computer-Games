(function(root){
 'use strict';
 const C=typeof module!=='undefined'&&module.exports?require('./garage-catalog.js'):root.GarageCatalog;
 const DAY=86400000,mod=(n,m)=>((n%m)+m)%m;
 // Fixed, versioned permutations: no ownership, locale, random seed, or refresh affects offers.
 function order(items,salt){return [...items].sort((a,b)=>hash(salt+a.id)-hash(salt+b.id)||a.id.localeCompare(b.id));}
 function hash(text){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
 const vehicles=order(C.newVehicles,'garage-vehicle-v1'),paints=order(C.liveries,'garage-paint-v1');
 function daily(now=Date.now()){
  const day=Math.floor(Number(now)/DAY);if(!Number.isFinite(day))throw Error('Invalid date');
  const offers=[['vehicle',vehicles],['livery',paints]].map(([type,items])=>{
   const item=items[mod(day,items.length)],vehicle=item.vehicle||item.id;
   const games=Object.keys(C.games).filter(g=>C.games[g].models.includes(vehicle));
   const game=games[mod(Math.floor(day/items.length),games.length)];
   const price=C.packages[item.rarity][type]*({rare:4,legendary:5,ultra:6}[item.rarity]);
   return {id:`${day}:${type}:${game}:${item.id}`,day,game,type,item,vehicle,rarity:item.rarity,price};
  });
  return {day,date:new Date(day*DAY).toISOString().slice(0,10),endsAt:(day+1)*DAY,offers};
 }
 function contents(game,type,tier,profile){
  if(!C.games[game]||!C.packages[tier]||!['vehicle','livery'].includes(type)||type==='vehicle'&&game==='tide')return [];
  const pool=type==='vehicle'?C.newVehicles.filter(v=>C.games[game].models.includes(v.id)):C.liveries.filter(l=>profile.owned.includes(l.vehicle));
  return C.tiers.flatMap((rarity,i)=>{const items=pool.filter(v=>v.rarity===rarity);return items.map(item=>({item,chance:C.packages[tier].odds[i]/items.length}));});
 }
 const api={daily,contents};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ShopCatalog=api;
})(typeof window!=='undefined'?window:globalThis);
