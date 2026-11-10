/* One authored neighborhood, instanced by owner. No public party membership yet. */
(function(root){'use strict';
const buildings=[
 {id:'house',name:'YOUR HOUSE',service:'HOUSE STASH',x:160,y:150,w:250,h:200,color:'#5f8a9e',furniture:[[180,170,70,32],[180,215,30,65],[340,170,45,85]]},
 {id:'smuggler',name:'SMUGGLER & CO.',service:'BUY / SELL',x:660,y:170,w:250,h:180,color:'#ae8c61',furniture:[[680,190,30,80],[740,190,140,24],[850,230,35,45]]},
 {id:'garage',name:'VEHICLE GARAGE',service:'OWNED VEHICLES',x:150,y:560,w:300,h:200,color:'#648ba6',furniture:[[170,580,35,80],[375,580,50,35]]},
 {id:'deployment',name:'ROAD OFFICE',service:'LOADOUT & BACKPACK',x:660,y:560,w:260,h:200,color:'#549e94',furniture:[[680,580,60,35],[840,580,55,55]]}
];
for(const b of buildings){b.north=b.y>500;if(b.north)b.furniture=b.furniture.map(([x,y,w,h])=>[x,2*b.y+b.h-y-h,w,h]);b.doorY=b.north?b.y:b.y+b.h;}
const walls=[];for(const b of buildings){const d=b.id==='garage'?80:56,door=b.doorY,back=b.north?b.y+b.h-8:b.y;walls.push([b.x,back,b.w,8],[b.x,b.y,8,b.h],[b.x+b.w-8,b.y,8,b.h],[b.x,door-(b.north?0:8),(b.w-d)/2,8],[b.x+(b.w+d)/2,door-(b.north?0:8),(b.w-d)/2,8],...b.furniture)}
const inside=(p,b)=>p.x>b.x+9&&p.x<b.x+b.w-9&&p.y>b.y+9&&p.y<b.y+b.h-8;
const base={id:'harbor-home-1',width:1100,height:960,spawn:{x:510,y:430},buildings,walls,land:(x,y)=>x>40&&y>65&&x<1060&&y<915,inside,service:p=>buildings.find(b=>inside(p,b))?.id||null,instance:owner=>({id:'base:'+owner,kind:'base',owner,access:'private',party:null}),solid:(x,y,r)=>x-r<40||y-r<65||x+r>1060||y+r>915||walls.some(([a,b,w,h])=>x+r>a&&x-r<a+w&&y+r>b&&y-r<b+h)};
root.CityBase=base;if(typeof module!=='undefined')module.exports=base;
})(globalThis);
