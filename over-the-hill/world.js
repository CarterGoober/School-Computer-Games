/* Fixed Ashen Vale watershed. Original models, stable spatial dressing, bounded streaming. */
(function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const rand=n=>{const v=Math.sin(n*127.13+41.7)*43758.5453;return v-Math.floor(v);};
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const WORLD_ID='ashen-vale-watershed-2',BOUNDS={minX:-4000,maxX:4000,minZ:-2000,maxZ:6000};
const hill=(x,z,cx,cz,rx,rz,h)=>h*Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
function riverX(z){return -950+Math.sin(z*.0009)*310+Math.sin(z*.0021)*85;}
function riverLevel(z){return 18+Math.max(0,z-500)*.052+6*smooth((z-2670)/18);}
// Authored irregular basins; no session-dependent water or shoreline geometry.
const lakes=[{name:'Stillwater',x:-1150,z:500,rx:390,rz:245,level:17,depth:1.65,phase:.2},{name:'Mirrorfen',x:1900,z:1200,rx:210,rz:145,level:38,depth:1.05,phase:1.7},{name:'Southwind Mere',x:500,z:-850,rx:260,rz:130,level:27,depth:1.25,phase:3.1},{name:'Alder Pool',x:-450,z:500,rx:76,rz:49,level:25,depth:.75,phase:2.2},{name:'Tarn of the Three Sisters',x:-1400,z:3500,rx:150,rz:94,level:378,depth:1.4,phase:4}];
function shore(l,x,z){const dx=(x-l.x)/l.rx,dz=(z-l.z)/l.rz,a=Math.atan2(dz,dx),edge=1+.105*Math.sin(a*3+l.phase)+.065*Math.cos(a*5-l.phase);return (Math.hypot(dx,dz)-edge)*Math.min(l.rx,l.rz);}
function waterSource(x,z){for(const l of lakes){const d=shore(l,x,z);if(d<55)return {level:l.level,shore:d,lake:l};}if(z>400&&z<4000){const d=Math.abs(x-riverX(z))-11;if(d<35)return{level:riverLevel(z),shore:d};}return null;}
// Two fixed north-south spines rise out of the existing watershed, away from
// the protected lowland spawn, lake basins and original valley routes.
function ridgeHeight(x,z){
 const west=-3020+150*Math.sin(z*.0014),east=2880+170*Math.sin(z*.0011+.5);
 const north=smooth((z-2450)/1000)*smooth((6200-z)/650);
 return north*(1100*Math.exp(-(((x-west)/470)**2))*(.84+.16*Math.sin(z*.0025))
 +1250*Math.exp(-(((x-east)/530)**2))*(.86+.14*Math.sin(z*.0021+1)));
}
function geology(x,z){const north=smooth((z-1900)/1900);return clamp(Math.max(north*.9,hill(x,z,600,1000,650,700,.92),hill(x,z,1450,2050,650,850,.95),hill(x,z,-2050,1000,700,1100,.88),hill(x,z,-1600,-800,800,500,.85))*(.85+.15*Math.sin(x*.009+Math.sin(z*.005))),0,1);}
function base(x,z){
 let y=24+ridgeHeight(x,z)+hill(x,z,1800,4100,1100,1500,670)+hill(x,z,-1400,4300,1350,1250,480)+hill(x,z,100,5500,1000,1150,820)+hill(x,z,-2700,2100,1000,1600,180);
 const north=smooth((z-2400)/1800);y+=north*(Math.sin(x*.005+z*.002)*Math.sin(z*.004)*38+140*Math.exp(-Math.hypot((x-150)/240,(z-5600)/420))+160*Math.exp(-Math.hypot((x-1900)/260,(z-4450)/350)));
 y+=Math.sin(x*.0021+z*.0013)*12+Math.sin(z*.0035-x*.0012)*8+Math.sin(x*.008+z*.003)*2;
 const river=Math.abs(x-riverX(z)), valley=1-smooth((river-22)/210);
 if(z>200&&z<4200)y=mix(y,riverLevel(z)+2,valley*smooth((z-200)/200)*smooth((4200-z)/300));

 // A sheltered canyon cuts the western plateau, opening south toward the lake.
 const canyon=-2450+Math.sin(z*.0016)*180,cut=(1-smooth((Math.abs(x-canyon)-48)/220))*smooth((z-700)/400)*smooth((3100-z)/500);
 y-=cut*85;
 for(const l of lakes){const d=shore(l,x,z);if(d<75){const bed=l.level-l.depth*clamp(-d/60,0,1)+Math.max(0,d)*.055;y=mix(bed,y,smooth((d-25)/50));}}
 return y;
}
// Lay fixed switchbacks on the actual mountain face, solving terrain contours
// instead of cutting a low, straight-grade trench through the ridge crest.
function ridgeRoute(west){
 const start=west?[-1900,3300]:[3750,2800],endZ=west?4900:5250,center=z=>west?-3020+150*Math.sin(z*.0014):2880+170*Math.sin(z*.0011+.5),endX=center(endZ),from=base(...start),to=base(endX,endZ),points=west?[start,[-2000,3290],[-2120,3280],[-2220,3280]]:[[1600,2700],[2100,2470],[2800,2450],[3450,2600],start];let previous=start[0];
 for(let i=1;i<=120;i++){const t=i/120,z=mix(start[1],endZ,t)+Math.sin(t*Math.PI*4)*500*Math.sin(t*Math.PI),target=mix(from,to,t),inside=center(z),outside=west?-1450:3950,roots=[];let best=outside,error=Infinity,oldX=outside,oldY=base(outside,z)-target;
  for(let j=1;j<=100;j++){const x=mix(outside,inside,j/100),y=base(x,z)-target;if(Math.abs(y)<error){best=x;error=Math.abs(y);}if(y*oldY<=0){let a=oldX,b=x;for(let k=0;k<16;k++){const m=(a+b)/2;if((base(a,z)-target)*(base(m,z)-target)<=0)b=m;else a=m;}roots.push((a+b)/2);}oldX=x;oldY=y;}
  const x=roots.length?roots.at(-1):best;points.push([x,z]);previous=x;
 }return points;
}
const roads=[
 [[0,-80],[0,0],[50,300],[360,650],[620,1050],[1100,1550],[1500,2100],[1600,2700],[1200,3200],[650,3600],[200,4000],[-300,4350],[-950,4300],[-1500,3900],[-1900,3300],[-2200,2700],[-2350,2200],[-2300,1600],[-2000,1100],[-1550,850],[-1100,1000],[-600,700],[-250,300],[0,0]],
 [[0,0],[-400,-300],[-1000,-650],[-1300,-1100],[-650,-1450],[100,-1300],[850,-1050],[1450,-600],[1900,0],[2200,600],[2000,1100],[1500,1500],[1100,1550]],
 [[-2000,1100],[-1550,1400],[-1100,1700],[-600,1800],[-100,1600],[500,1400],[1100,1550]],
 [[650,3600],[1050,4000],[1400,4400],[1700,4600],[1900,4900],[1500,5200],[1000,5300],[500,5200],[100,4900],[-300,4350]],
 [[-400,-300],[-750,0],[-1200,160],[-1550,430],[-1550,850]],
 ridgeRoute(true),
 ridgeRoute(false)
];
const route=[];
for(let road=0;road<roads.length;road++){const knots=roads[road];for(let k=0;k<knots.length-1;k++){const a=knots[Math.max(0,k-1)],b=knots[k],c=knots[k+1],d=knots[Math.min(knots.length-1,k+2)],count=Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1])/8);for(let i=0;i<count;i++){const t=i/count,t2=t*t,t3=t2*t,v=j=>.5*(2*b[j]+(-a[j]+c[j])*t+(2*a[j]-5*b[j]+4*c[j]-d[j])*t2+(-a[j]+3*b[j]-3*c[j]+d[j])*t3),x=v(0),z=v(1);route.push({x,z,y:base(x,z),road,end:i===count-1&&k===knots.length-2});}}}
const bins=new Map();route.forEach((p,i)=>{const bx=Math.floor(p.x/64),bz=Math.floor(p.z/64);for(let x=bx-1;x<=bx+1;x++)for(let z=bz-1;z<=bz+1;z++){const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);}});
function nearest(x,z,full=false){let dist=Infinity,result=null,roadWeight=0,roadHeight=0;const ids=full?route.map((_,i)=>i):bins.get(Math.floor(x/64)+','+Math.floor(z/64))||[];for(const i of ids){const a=route[i],b=route[i+1];if(!b||a.road!==b.road)continue;const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),px=a.x+dx*t,pz=a.z+dz*t,d=(x-px)**2+(z-pz)**2;if(a.road>=5&&d<900){const w=Math.exp(-d/30);roadWeight+=w;roadHeight+=mix(a.y,b.y,t)*w;}if(d<dist){dist=d;result={x:px,z:pz,y:mix(a.y,b.y,t),heading:Math.atan2(dx,dz),i};}}return result?{...result,surfaceY:roadWeight>1e-12?roadHeight/roadWeight:result.y,distance:Math.sqrt(dist)}:{distance:Infinity};}
const spawnIds=['forest','ridge','beach'];
function spawnPoint(id){if(id==='forest')return{x:0,z:0,heading:0};if(id==='beach')return{x:-1550,z:500,heading:Math.PI/2};if(id==='ridge'){const points=route.filter(p=>p.road===6),start=Math.floor(points.length*.75);for(let i=start;i<points.length-2;i++){const p=points[i],next=points[i+1],heading=Math.atan2(next.x-p.x,next.z-p.z),sn=Math.sin(heading),cs=Math.cos(heading),grade=Math.abs(height(p.x+sn*1.7,p.z+cs*1.7)-height(p.x-sn*1.7,p.z-cs*1.7)),cross=Math.abs(height(p.x+cs,p.z-sn)-height(p.x-cs,p.z+sn));if(grade<.5&&cross<.4)return{x:p.x,z:p.z,heading};}const p=points.at(-3),n=points.at(-2);return{x:p.x,z:p.z,heading:Math.atan2(n.x-p.x,n.z-p.z)};}return null;}
// Fixed optional rock-crawl spurs. Shelves are part of the collision heightfield,
// not decorative solid boxes placed across a road. Existing road layout is retained.
const rockTrails=[
 {name:'Copperwood rock garden',points:[[8,75],[60,100],[100,150],[125,205],[135,255],[95,305],[60,345]]},
 {name:'Redstone shelf',points:[[-2300,1500],[-2200,1600],[-2170,1750],[-2210,1900],[-2320,2050]]},
 {name:'Lantern scree',points:[[1100,3300],[1020,3330],[940,3400],[850,3500],[740,3560]]}
];
const rockSegments=[];
for(const trail of rockTrails){let along=0;for(let i=1;i<trail.points.length;i++){const a=trail.points[i-1],b=trail.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);rockSegments.push({a,b,dx,dz,length,along});along+=length;}}
function rockField(x,z){let distance=Infinity,along=0,side=0;
 for(const p of rockSegments){if(x<Math.min(p.a[0],p.b[0])-20||x>Math.max(p.a[0],p.b[0])+20||z<Math.min(p.a[1],p.b[1])-20||z>Math.max(p.a[1],p.b[1])+20)continue;
 const t=clamp(((x-p.a[0])*p.dx+(z-p.a[1])*p.dz)/(p.length*p.length),0,1),dx=x-p.a[0]-p.dx*t,dz=z-p.a[1]-p.dz*t,d=Math.hypot(dx,dz);if(d<distance){distance=d;along=p.along+t*p.length;side=(dx*p.dz-dz*p.dx)/p.length;}}
 const weight=1-smooth((distance-5)/11);
 return {distance,weight,rough:weight*(.75*Math.pow(.5+.5*Math.sin(along*.48+side*.19),6)+.32*Math.pow(.5+.5*Math.sin(along*.29-side*.65),4))};
}
function height(x,z){const p=nearest(x,z);let y=base(x,z)+Math.sin(x*.09+z*.12)*.16+Math.sin(z*.19-x*.14)*.08+geology(x,z)*(.55*Math.sin(x*.055+z*.035)+.26*Math.sin(z*.11-x*.07));const rd=Math.abs(x-riverX(z));if(z>400&&z<4000)y=mix(riverLevel(z)-.65,y,smooth((rd-5)/20));const mountainRoad=p.i!==undefined&&route[p.i].road>=5,roadWidth=mountainRoad?28:12;if(p.distance<roadWidth&&!waterSource(x,z))y=mix(mountainRoad?p.surfaceY:p.y,y,smooth((p.distance-(mountainRoad?10:4))/(mountainRoad?18:8)));const bridge=Math.abs(z-1803)<4.2&&Math.abs(x-riverX(1803))<23;if(bridge)y=Math.max(y,riverLevel(z)+.42);return y+rockField(x,z).rough;}
const regions=[{name:'Copperwood',note:'A valley full of gold.',x:0,z:600},{name:'Fir Reach',note:'The forest holds the rain.',x:1900,z:1500},{name:'Lantern Pass',note:'Between the ridges, a road to the sky.',x:900,z:3400},{name:'The White Crown',note:'The watershed begins in silence.',x:1100,z:5100},{name:'Windfold Highlands',note:'Long grass, long shadows.',x:-1500,z:3800},{name:'Redstone Canyon',note:'Water remembers its way through stone.',x:-2500,z:2000},{name:'Stillwater Basin',note:'The mountains gather in the lake.',x:-1300,z:450},{name:'Southwind Meadows',note:'Room to wander.',x:100,z:-1000}];
function regionAt(x,z){return regions.reduce((a,b)=>Math.hypot(x-a.x,z-a.z)<Math.hypot(x-b.x,z-b.z)?a:b);}
function waterAt(x,z){const w=waterSource(x,z);return w?{level:w.level,depth:Math.max(0,w.level-height(x,z)),shore:w.shore}: {level:-10000,depth:0,shore:Infinity};}
function wet(x,z){return waterAt(x,z).depth>.03;}
function surface(x,z){
 const w=waterAt(x,z),y=height(x,z),trail=1-smooth((nearest(x,z).distance-3)/6),sand=1-smooth((Math.abs(w.shore)-8)/25),wetness=1-smooth((w.shore+2)/12),rock=Math.max(smooth((y-250)/200),rockField(x,z).weight,geology(x,z)),dirt=1-smooth((y-100)/100);
 return{...w,sand,wetness,grip:clamp(.96-trail*(.10+.05*(1-dirt))+rock*.04-sand*.24*(1-wetness),.55,1),resistance:.17+trail*(.045+.02*(1-dirt))+sand*.30*(1-wetness)+rock*.015,kind:w.depth>.04?'water':sand>.4?(wetness>.45?'wet sand':'sand'):rock>.5?'rock':trail>.4?(dirt>.5?'dirt':'gravel'):'grass'};
}
height.surface=surface;
const outcrops=[{x:-24,z:135,r:6,h:12},{x:37,z:173,r:5,h:9},{x:306,z:618,r:7,h:14},{x:1180,z:1590,r:5,h:11},{x:1475,z:2170,r:7,h:13},{x:-2240,z:2230,r:7,h:16}];
for(const p of rockSegments)for(let d=16;d<p.length;d+=23)for(const side of [-1,1]){const x=p.a[0]+p.dx*d/p.length+side*p.dz/p.length*12,z=p.a[1]+p.dz*d/p.length-side*p.dx/p.length*12;if(nearest(x,z).distance>10)outcrops.push({x,z,r:1.4+rand(x+z)*1.2,h:1.5+rand(z)*2});}
const structures=[{"x":173,"z":314,"r":4.6},{"x": 1370, "z": 1660, "r": 4.6}, {"x": 2090, "z": 790, "r": 4.6}, {"x": 1780, "z": 4680, "r": 4.6}, {"x": 990, "z": 5290, "r": 4.6}, {"x": -1680, "z": 3770, "r": 4.6}, {"x": -2290, "z": 2520, "r": 4.6}, {"x": -2290, "z": 1700, "r": 4.6}, {"x": -1510, "z": 420, "r": 4.6}, {"x": -1220, "z": -1070, "r": 4.6}, {"x": 200, "z": -1270, "r": 4.6}, {"x": 10, "z": 1630, "r": 4.6}];
const clearings=[[28, 57], [-1490, 500], [173, 314], [650, 3600], [470, 740], [1370, 1660], [2090, 790], [-795.089084038585, 2679], [750, 3480], [1780, 4680], [990, 5290], [-850, 4340], [-1680, 3770], [-2290, 2520], [-2290, 1700], [-1520, 810], [-1510, 420], [-1220, -1070], [200, -1270], [1440, -580], [-691.499461950177, 1803], [10, 1630], [1370, 4290], [-1850, 3180], [-600, 690], [2160, 50]];
// Stable spatial hash: collision and visible vegetation are independently reproducible.
function candidates(cx,cz){const out=[],seed=cx*7381+cz*19391;for(let i=0;i<74;i++){const x=cx*128+rand(seed+i*7)*128,z=cz*128+rand(seed+i*7+1)*128,y=height(x,z),region=regionAt(x,z).name,alpine=smooth((y-320)/200),density=region==='Fir Reach'?1:region==='Copperwood'?.72:region==='Stillwater Basin'?.38:region==='Southwind Meadows'?.08:.12;if(rockField(x,z).distance<17||nearest(x,z).distance<9||waterAt(x,z).shore<10||clearings.some(l=>Math.hypot(l[0]-x,l[1]-z)<14))continue;const pine=region!=='Copperwood'&&region!=='Stillwater Basin',rocky=rand(seed+i+210)<.12+geology(x,z)*.36; if(rocky)out.push({x,z,r:1+rand(seed+i+100)*2.4,kind:'rock',seed:seed+i});else if(rand(seed+i+100)<density*(.65+.35*Math.sin(x*.007+Math.sin(z*.003)*2)**2)*(1-alpine))out.push({x,z,r:.65,h:14+rand(seed+i+90)*13,kind:'tree',pine,seed:seed+i});}return out;}
const obstacleCache=new Map();function obstacles(x,z){const cx=Math.floor(x/128),cz=Math.floor(z/128),out=[];for(let a=cx-1;a<=cx+1;a++)for(let b=cz-1;b<=cz+1;b++){const key=a+','+b;if(!obstacleCache.has(key))obstacleCache.set(key,candidates(a,b));out.push(...obstacleCache.get(key));}while(obstacleCache.size>512)obstacleCache.delete(obstacleCache.keys().next().value);for(const l of [...structures,...outcrops])if(Math.hypot(l.x-x,l.z-z)<150)out.push(l);return out;}
const landmarks=[{x:28,z:57,name:'The copper clearing',note:'Leaves like little lanterns. The valley is still waking.',kind:'camp'},{x:-1490,z:500,name:'Stillwater shore',note:'A whole sky held in a pocket of water.',kind:'lake'},{x:173,z:314,name:'The old survey shelter',note:'Someone built a roof where the weather changes its mind.',kind:'cabin'},{x:650,z:3600,name:'Cloudrest cairn',note:'The woods below, the open sky ahead. Stay a while.',kind:'cairn'}];
landmarks.push(...[{"x": 470, "z": 740, "name": "The lantern orchard", "kind": "camp", "note": "A quiet place along the watershed."}, {"x": 1370, "z": 1660, "name": "Rainwatch lodge", "kind": "cabin", "note": "A quiet place along the watershed."}, {"x": 2090, "z": 790, "name": "The cedar gateway", "kind": "ruin", "note": "A quiet place along the watershed."}, {"x": -795.089084038585, "z": 2679, "name": "Mossfall cascade", "kind": "waterfall", "note": "Meltwater spills over a granite step."}, {"x": 750, "z": 3480, "name": "Lantern saddle", "kind": "cairn", "note": "A quiet place along the watershed."}, {"x": 1780, "z": 4680, "name": "The winter survey", "kind": "cabin", "note": "A quiet place along the watershed."}, {"x": 990, "z": 5290, "name": "Crown observatory", "kind": "ruin", "note": "A quiet place along the watershed."}, {"x": -850, "z": 4340, "name": "Three sisters", "kind": "cairn", "note": "A quiet place along the watershed."}, {"x": -1680, "z": 3770, "name": "Windfold bothy", "kind": "cabin", "note": "A quiet place along the watershed."}, {"x": -2290, "z": 2520, "name": "The hollow arch", "kind": "cave", "note": "A quiet place along the watershed."}, {"x": -2290, "z": 1700, "name": "Redstone watch", "kind": "ruin", "note": "A quiet place along the watershed."}, {"x": -1520, "z": 810, "name": "Heron landing", "kind": "camp", "note": "A quiet place along the watershed."}, {"x": -1510, "z": 420, "name": "Stillwater boathouse", "kind": "cabin", "note": "A quiet place along the watershed."}, {"x": -1220, "z": -1070, "name": "The sleeping orchard", "kind": "ruin", "note": "A quiet place along the watershed."}, {"x": 200, "z": -1270, "name": "Southwind shelter", "kind": "cabin", "note": "A quiet place along the watershed."}, {"x": 1440, "z": -580, "name": "The long pasture", "kind": "camp", "note": "A quiet place along the watershed."}, {"x": -691.499461950177, "z": 1803, "name": "Alder crossing", "kind": "bridge", "note": "A timber span over the descending Alder River."}, {"x": 10, "z": 1630, "name": "The old milehouse", "kind": "cabin", "note": "A quiet place along the watershed."}, {"x": 1370, "z": 4290, "name": "Snowline refuge", "kind": "camp", "note": "A quiet place along the watershed."}, {"x": -1850, "z": 3180, "name": "Wind gate", "kind": "cairn", "note": "A quiet place along the watershed."}, {"x": -600, "z": 690, "name": "The amber steps", "kind": "camp", "note": "A quiet place along the watershed."}, {"x": 2160, "z": 50, "name": "Foxglove hollow", "kind": "camp", "note": "A quiet place along the watershed."}]);
for(const trail of rockTrails){const p=trail.points[1];landmarks.push({x:p[0]+8,z:p[1],name:trail.name,note:'Granite shelves. Slow down and let the wheels find their way.',kind:'cairn'});}
landmarks.push({x:-2930,z:4890,name:'The Longback crown',note:'A kilometre of mountain beneath your wheels.',kind:'cairn'},{x:2893,z:5240,name:'Eagleback high pass',note:'Two valleys, a thin road, and a very long view.',kind:'cairn'},{x:-2537,z:4290,name:'Windcut balcony',note:'The cliff road follows the stone.',kind:'camp'},{x:2480,z:3890,name:'Cloudline overlook',note:'The forest has become a carpet below.',kind:'cairn'});
landmarks.push({x:-1890,z:3300,name:'Longback ascent',note:'The western switchbacks begin here. Brake before the hairpins.',kind:'cairn'},{x:1610,z:2700,name:'Eagleback ascent',note:'Follow the stone road toward the high pass.',kind:'cairn'});
let groups=[];
const shades=new Map();
function shade(hex,f){const key=hex+f.toFixed(2);if(shades.has(key))return shades.get(key);const n=parseInt(hex.slice(1),16),s='#'+[n>>16,(n>>8)&255,n&255].map(v=>clamp(Math.round(v*f),0,255).toString(16).padStart(2,'0')).join('');shades.set(key,s);return s;}
function face(g,points,color){const a=points[0],b=points[1],c=points[2],u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];const nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0],len=Math.hypot(nx,ny,nz)||1;const light=.78+.22*Math.abs((nx*-.5+ny*.8+nz*.35)/len);g.faces.push({points,color:shade(color,light)});}
function group(x,z,r=15){return{x,z,r,faces:[]};}
function box(g,x,y,z,w,h,d,color){const p=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,0,d/2],[-w/2,0,d/2],[-w/2,h,-d/2],[w/2,h,-d/2],[w/2,h,d/2],[-w/2,h,d/2]].map(p=>[x+p[0],y+p[1],z+p[2]]);for(const ids of [[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7],[0,3,2,1]])face(g,ids.map(i=>p[i]),color);}
function beam(g,a,b,r,color){const axis=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],len=Math.hypot(...axis)||1,d=axis.map(v=>v/len),u=Math.abs(d[1])<.9?[d[2],0,-d[0]]:[1,0,0],ul=Math.hypot(...u);for(let i=0;i<3;i++)u[i]/=ul;const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]],rings=[a,b].map(p=>Array.from({length:6},(_,i)=>{const angle=i/6*Math.PI*2;return p.map((q,k)=>q+r*(Math.cos(angle)*u[k]+Math.sin(angle)*v[k]));}));for(let i=0;i<6;i++)face(g,[rings[0][i],rings[0][(i+1)%6],rings[1][(i+1)%6],rings[1][i]],color);face(g,rings[1],'#ad9569');}
function rock(g,x,y,z,r,h,color,seed=0){const rings=[{h:0,r:.8},{h:h*.55,r:1},{h:h,r:.35}],n=6;const verts=rings.map((q,k)=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2;return[x+Math.cos(a)*r*q.r*(.85+rand(seed+i)*.3),y+q.h,z+Math.sin(a)*r*q.r];}));for(let k=0;k<2;k++)for(let i=0;i<n;i++)face(g,[verts[k][i],verts[k][(i+1)%n],verts[k+1][(i+1)%n],verts[k+1][i]],color);face(g,verts[2],color);}
function instance(g,model,x,y,z,scale=[1,1,1],rotation=0,tint=null){if(!g.instances)g.instances=[];g.instances.push({model,position:[x,y,z],scale,rotation,tint});}
function spray(g,x,y,z,w,h,angle,color,tile=0,lean=0){if(tile===2)return;const model=tile===2?'grass':tile===1?'fern':'shrub';instance(g,model,x,y,z,[w*.65,h*1.2,w*.65],angle);}
function tree(x,z,h,seed,pine=false){const y=height(x,z),g=group(x,z,h),birch=!pine&&rand(seed+12)<.3;instance(g,pine?'pine':birch?'birch':'oak',x,y,z,[h/12,h/12,h/12],rand(seed)*Math.PI*2,pine?'#ffffff':['#ffffff','#e0a877','#e5bd8b','#d89d8c','#d0d4b3'][Math.floor(rand(seed+22)*5)]);groups.push(g);}
function renderHeight(x,z){return height(x,z);}
function terrainColor(x,z){const y=height(x,z),dx=(base(x+4,z)-base(x-4,z))/8,dz=(base(x,z+4)-base(x,z-4))/8,slope=Math.hypot(dx,dz),region=regionAt(x,z).name;
 const lush=smooth((x-500)/1200)*smooth((z+100)/1200),v=Math.sin(x*.014+Math.sin(z*.008))*Math.sin(z*.011)*3;
 let c=[mix(95,65,lush),mix(137,113,lush),mix(70,74,lush)];const rock=Math.max(geology(x,z)*.9,rockField(x,z).weight*.9,smooth((y-280)/210)*.7+smooth((slope-.2)/.65)*.3);c=c.map((q,i)=>mix(q,[133,145,151][i],rock));
 const roadBlend=(1-smooth((nearest(x,z).distance-2.3)/3.7))*(1-rockField(x,z).weight);if(!waterSource(x,z))c=c.map((q,i)=>mix(q,[169,151,111][i],roadBlend));
 const water=waterAt(x,z),beach=1-smooth((water.shore-15)/30),wetSand=1-smooth((water.shore+1)/10);if(water.level>-1000)c=c.map((q,i)=>mix(q,mix([204,186,139][i],[146,146,112][i],wetSand),beach));
 const snow=smooth((y-570)/100);c=c.map((q,i)=>mix(q,[222,229,218][i],snow));if(snow>0)c=c.map((q,i)=>mix(q,[148,153,151][i],roadBlend*snow*.75));
 const light=.88+.18*clamp((.85-dx*.4-dz*.3)/Math.sqrt(1+dx*dx+dz*dz),0,1);return c.map(q=>(q+v)*light/255);
}
function terrainFace(g,points){g.faces.push({points,color:'#9ca46e',terrain:1,vertexColors:points.map(p=>terrainColor(p[0],p[2]))});}
function makeTerrain(cx,cz,step){const centre=nearest(cx*128+64,cz*128+64);if(step===4&&centre.i!==undefined&&route[centre.i].road>=5&&centre.distance<110)step=2;const x=cx*128,z=cz*128,g=group(x+64,z+64,92);g.distant=true;for(let a=0;a<128;a+=step)for(let b=0;b<128;b+=step){const fine=step===4&&rockField(x+a+2,z+b+2).distance<20?1:step;for(let u=0;u<step;u+=fine)for(let v=0;v<step;v+=fine){const point=(xx,zz)=>[xx,renderHeight(xx,zz),zz],aa=point(x+a+u,z+b+v),bb=point(x+a+u+fine,z+b+v),cc=point(x+a+u+fine,z+b+v+fine),dd=point(x+a+u,z+b+v+fine);terrainFace(g,[aa,bb,cc]);terrainFace(g,[aa,cc,dd]);}}
 // Matching world-coordinate edge colors and downward skirts close mixed-LOD seams.
 for(let i=0;i<128;i+=step)for(const [ax,az,bx,bz] of [[x+i,z,x+i+step,z],[x+i,z+128,x+i+step,z+128],[x,z+i,x,z+i+step],[x+128,z+i,x+128,z+i+step]]){const a=[ax,height(ax,az),az],b=[bx,height(bx,bz),bz];terrainFace(g,[a,b,[bx,b[1]-4,bz],[ax,a[1]-4,az]]);}
 return g;}
function structure(l){const x=l.x,z=l.z,y=height(x,z),g=group(x,z,35);box(g,x+7,y,z,.2,2.3,.2,'#73634a');box(g,x+7,y+1.6,z,1.5,.5,.15,'#dac89b');
 if(l.kind==='cabin'){box(g,x,y,z,8,3.8,6,'#84684c');for(let j=0;j<8;j++)box(g,x,y+j*.46,z,8.15,.08,6.12,'#6e5944');face(g,[[x-4.7,y+3.7,z-3.6],[x,y+5.6,z-3.6],[x,y+5.6,z+3.6],[x-4.7,y+3.7,z+3.6]],'#52675f');face(g,[[x,y+5.6,z-3.6],[x+4.7,y+3.7,z-3.6],[x+4.7,y+3.7,z+3.6],[x,y+5.6,z+3.6]],'#62776c');box(g,x-1.7,y,z-3.1,1.6,2.7,.15,'#3f5147');box(g,x+1.7,y+1.4,z-3.1,1.6,1.3,.15,'#a6b5a4');box(g,x+3,y+3.7,z+1,.8,3,.8,'#a59e87');}
 else if(l.kind==='ruin'){for(let i=0;i<7;i++)box(g,x-6+i*2,y,z,1.7,2+rand(i+x)*5,1.5,'#9b9e8a');box(g,x-6,y,z+4,1.5,3.4,8,'#898f7c');}
 else if(l.kind==='cave'){rock(g,x-5,y,z,4,10,'#969582',x);rock(g,x+5,y,z,4,10,'#969582',z);box(g,x,y+7,z,13,3,6,'#9d9b88');box(g,x,y,z+2,4.5,6,.3,'#38483d');}
 else if(l.kind==='bridge'){const deck=riverLevel(z)+.12;box(g,x,deck,z,46,.3,8,'#927954');for(const side of [-1,1]){box(g,x,deck+1,z+side*4,46,.16,.16,'#685f47');for(let j=-22;j<=22;j+=4)box(g,x+j,deck,z+side*4,.22,1.4,.22,'#685f47');}}
 else if(l.kind==='waterfall'){for(const side of [-1,1])for(let i=0;i<5;i++){const zz=z-10+i*5,xx=riverX(zz)+side*10;rock(g,xx,height(xx,zz)-.5,zz,2.5,3,'#8d9784',i);}for(let i=-9;i<10;i+=2){const a=z+i,b=a+2;face(g,[[riverX(a)-4,riverLevel(a)+.04,a],[riverX(a)+4,riverLevel(a)+.04,a],[riverX(b)+4,riverLevel(b)+.04,b],[riverX(b)-4,riverLevel(b)+.04,b]],'#c0d9ca');}}
 else if(l.kind==='cairn'){for(let j=0;j<6;j++)rock(g,x,y+j*.6,z,1.8-j*.23,.8,'#b8b49b',j);box(g,x+5,y,z,.14,5,.14,'#766b52');face(g,[[x+5,y+5,z],[x+5,y+4,z],[x+7,y+4.5,z]],'#b57a44');}
 else{box(g,x,y,z,4,.5,.8,'#96724b');for(let i=0;i<8;i++){const a=i*Math.PI/4;rock(g,x+Math.cos(a)*1.5,y,z+4+Math.sin(a)*1.5,.35,.35,'#8c8c75',i);}}
 return g;}
function distantGroves(cx,cz){const g=group(cx*128+64,cz*128+64,110);g.minDistance=180;g.distant=true;g.vegetation=true;for(const o of candidates(cx,cz)){if(o.kind!=='tree'||rand(o.seed+71)>.55)continue;const name=o.pine?'pine_low':rand(o.seed+12)<.3?'birch_low':'oak_low';instance(g,name,o.x,height(o.x,o.z),o.z,[o.h/12,o.h/12,o.h/12],rand(o.seed)*Math.PI*2,o.pine?'#ffffff':['#ffffff','#e0a877','#e5bd8b','#d89d8c','#d0d4b3'][Math.floor(rand(o.seed+22)*5)]);}return g;}
function makeScenery(cx,cz){groups=[];const x=cx*128,z=cz*128;for(const o of candidates(cx,cz)){if(landmarks.some(l=>Math.hypot(l.x-o.x,l.z-o.z)<14))continue;if(o.kind==='tree')tree(o.x,o.z,o.h,o.seed,o.pine);else{const g=group(o.x,o.z,8);instance(g,'boulder',o.x,height(o.x,o.z)-.1,o.z,[o.r,o.r*.9,o.r],rand(o.seed)*Math.PI*2);groups.push(g);}}
 for(let i=0;i<230;i++){const seed=cx*131+cz*387+i*19,xx=x+rand(seed)*128,zz=z+rand(seed+1)*128;if(rockField(xx,zz).distance<14||wet(xx,zz)||nearest(xx,zz).distance<5)continue;const g=group(xx,zz,4);g.detail=true;const y=height(xx,zz);if(y>560)continue;if(i%23===0)beam(g,[xx,y+.15,zz],[xx+3,height(xx+3,zz+1)+.2,zz+1],.13,'#92806a');else for(let k=0;k<2;k++)spray(g,xx,y,zz,i%9===0?2.4:2.1,i%9===0?1.3:.75+rand(seed)*.45,k*Math.PI/2+seed,i%9===0?(i%2?'#53734c':'#836646'):'#8d9e57',i%9===0?0:2);groups.push(g);}
 for(const o of outcrops)if(Math.floor(o.x/128)===cx&&Math.floor(o.z/128)===cz){const g=group(o.x,o.z,o.h);instance(g,'cliff',o.x,height(o.x,o.z)-.3,o.z,[o.r,o.h/2.7,o.r],rand(o.x)*Math.PI*2);groups.push(g);}
 for(const l of landmarks)if(Math.floor(l.x/128)===cx&&Math.floor(l.z/128)===cz)groups.push(structure(l));
 // Reeds and bleached driftwood follow the fixed shoreline, leaving drivable beaches.
 for(let i=0;i<55;i++){const seed=cx*711+cz*993+i*31,xx=x+rand(seed)*128,zz=z+rand(seed+1)*128,w=waterAt(xx,zz);if(w.shore < -3||w.shore>12)continue;const g=group(xx,zz,4);g.detail=true;const y=height(xx,zz);if(i%5===0)beam(g,[xx,y+.2,zz],[xx+2.5,height(xx+2.5,zz+1)+.2,zz+1],.18,'#b8ad8b');else for(let k=0;k<4;k++){const dx=rand(seed+k)*1.4;beam(g,[xx+dx,y,zz],[xx+dx+.2,y+1.2+rand(seed+k+1)*.5,zz+.2],.025,'#82936a');}groups.push(g);}
 for(let i=0;i<route.length;i+=2){const p=route[i];if(Math.floor(p.x/128)!==cx||Math.floor(p.z/128)!==cz||wet(p.x,p.z))continue;const n=nearest(p.x,p.z),cs=Math.cos(n.heading),sn=Math.sin(n.heading),g=group(p.x,p.z,15);g.detail=true;for(const side of [-1,1])for(let j=0;j<3;j++){const d=side*(5.2+j*1.6),xx=p.x+cs*d,zz=p.z-sn*d;for(let k=0;k<2;k++)spray(g,xx,height(xx,zz),zz,2.3,.75+rand(i+j)*.5,k*1.57+i,'#a4ab5b',2);}groups.push(g);}
 for(let i=0;i<70;i++){const seed=cx*431+cz*193+i*37,xx=x+rand(seed)*128,zz=z+rand(seed+1)*128,w=waterAt(xx,zz);if(w.shore>20||w.shore< -12)continue;const g=group(xx,zz,3);g.detail=true;const r=.12+rand(seed+5)*.5;rock(g,xx,height(xx,zz)-.05,zz,r,r*.7,'#8d9694',seed);groups.push(g);}
 // Short cliff rails mark exposed edges without fencing the open watershed.
 for(let i=0;i<route.length;i+=6){const p=route[i],next=route[i+1];if(p.road<5||!next||next.road!==p.road||Math.floor(p.x/128)!==cx||Math.floor(p.z/128)!==cz)continue;const angle=Math.atan2(next.x-p.x,next.z-p.z),cs=Math.cos(angle),sn=Math.sin(angle),left=base(p.x-cs*18,p.z+sn*18),right=base(p.x+cs*18,p.z-sn*18),side=left<right?-1:1;if(p.y-Math.min(left,right)<12)continue;const xx=p.x+side*cs*9.2,zz=p.z-side*sn*9.2,y=height(xx,zz),g=group(xx,zz,15);for(const d of [-7,0,7]){const x=xx+sn*d,z=zz+cs*d,yy=height(x,z);box(g,x,yy,z,.18,1.1,.18,'#7c7565');}beam(g,[xx-sn*8,y+.85,zz-cs*8],[xx+sn*8,y+.85,zz+cs*8],.065,'#ac9b7c');groups.push(g);}
 // Waymarks recur along authored roads, not on an arbitrary world grid.
 for(let i=0;i<route.length;i+=35){const p=route[i];if(Math.floor(p.x/128)!==cx||Math.floor(p.z/128)!==cz)continue;const g=group(p.x+6,p.z,4),y=height(p.x+6,p.z);box(g,p.x+6,y,p.z,.2,2.1,.2,'#77674c');box(g,p.x+6,y+1.6,p.z,1.4,.4,.13,'#ddc99b');groups.push(g);}
 const main=group(x+64,z+64,110),detail=group(x+64,z+64,110);detail.detail=true;for(const g of groups){const target=g.detail?detail:main;target.faces.push(...g.faces);if(g.instances){target.instances??=[];target.instances.push(...g.instances);}}return [main,detail];}
function makeWater(cx,cz,step=8){const g=group(cx*128+64,cz*128+64,92);g.water=true;g.distant=true;
 const vertex=(x,z)=>{const w=waterAt(x,z);return{p:[x,w.level+.025,z],d:w.level-height(x,z)};};
 function tri(verts){let poly=verts;const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];if(a.d>0)out.push(a);if((a.d>0)!==(b.d>0)){const t=a.d/(a.d-b.d);out.push({p:a.p.map((v,j)=>mix(v,b.p[j],t)),d:0});}}if(out.length<3)return;g.faces.push({points:out.map(v=>v.p),color:'#589d9f',terrain:-1,waterDepths:out.map(v=>Math.max(.02,v.d))});}
 for(let x=cx*128;x<(cx+1)*128;x+=step)for(let z=cz*128;z<(cz+1)*128;z+=step){const a=vertex(x,z),b=vertex(x+step,z),c=vertex(x+step,z+step),d=vertex(x,z+step);if(Math.max(a.d,b.d,c.d,d.d)<=0)continue;tri([a,b,c]);tri([a,c,d]);}return g;}
// Chunk generation runs away from input, physics and rendering. Only the nearby
// fixed watershed is resident. Preload an outer ring before it becomes visible.
function tagChunk(list,a,b,lod){for(const g of list){g.cell=(lod===64?'vista:':'')+a+','+b;g.lod=lod;}return list;}
function buildChunk(a,b,lod){if(lod===64){const g=group(a*512+256,b*512+256,370);g.distant=true;for(let x=a*512;x<(a+1)*512;x+=64)for(let z=b*512;z<(b+1)*512;z+=64){const pt=(x,z)=>[x,height(x,z)-5,z];terrainFace(g,[pt(x,z),pt(x+64,z),pt(x+64,z+64)]);terrainFace(g,[pt(x,z),pt(x+64,z+64),pt(x,z+64)]);}return tagChunk([g],a,b,lod);}const list=[makeTerrain(a,b,lod),makeWater(a,b,lod===4?4:16)];if(lod===4)list.push(...makeScenery(a,b));else list.push(distantGroves(a,b));return tagChunk(list,a,b,lod);}
const chunks=new Map();let active=[],streamKey='',pending=[],wanted=new Map(),worker=null,busy=false,dirty=false;
const stats={chunks:0,pending:0,vertices:0,buildMs:0,mainMs:0};
function pump(){if(busy||!worker||!pending.length||stats.uploadPending>12)return;const [key,p]=pending.shift();busy=true;worker.postMessage({key,...p});}
function stream(x,z,quality=1){const start=performance.now(),cx=Math.floor(x/128),cz=Math.floor(z/128),key=cx+','+cz+','+quality,far=[7,10,13][quality],near=[2,3,4][quality];
 if(!worker&&typeof Worker!=='undefined'){worker=new Worker('stream-worker.js');worker.onmessage=e=>{busy=false;stats.buildMs=e.data.ms;if(wanted.has(e.data.key)){const prefix=e.data.key.split(',').slice(0,2).join(',')+',';if(!e.data.key.startsWith('vista:'))for(const k of chunks.keys())if(k.startsWith(prefix))chunks.delete(k);chunks.set(e.data.key,e.data.groups);dirty=true;}pump();};worker.onerror=()=>{worker.terminate();worker=null;busy=false;};}
 if(key!==streamKey){streamKey=key;wanted=new Map();for(let a=cx-far;a<=cx+far;a++)for(let b=cz-far;b<=cz+far;b++){const d=Math.hypot(a-cx,b-cz);if(d>far||a*128<-4096||a*128>4096||b*128<-2048||b*128>6144)continue;const lod=d<=near?4:32;wanted.set(a+','+b+','+lod,{a,b,lod,d});}
 for(let a=Math.floor(x/512)-4;a<=Math.floor(x/512)+4;a++)for(let b=Math.floor(z/512)-4;b<=Math.floor(z/512)+4;b++){const d=Math.hypot(a+.5-x/512,b+.5-z/512);if(d<4&&a*512>=-4096&&a*512<4096&&b*512>=-2048&&b*512<6144)wanted.set('vista:'+a+','+b,{a,b,lod:64,d:-100+d});}
 const wantedCells=new Set([...wanted.keys()].map(k=>k.split(',').slice(0,2).join(',')));for(const k of chunks.keys())if(!wanted.has(k)&&!wantedCells.has(k.split(',').slice(0,2).join(','))){chunks.delete(k);dirty=true;}
 pending=[...wanted.entries()].filter(([k])=>!chunks.has(k)).sort((a,b)=>a[1].d-b[1].d);}
 if(worker)pump();else if(pending.length){const [k,p]=pending.shift();chunks.set(k,buildChunk(p.a,p.b,p.lod));dirty=true;}
 if(dirty){active=[...chunks.values()].flat();dirty=false;}
 stats.chunks=chunks.size;stats.pending=pending.length+(busy?1:0);stats.mainMs=performance.now()-start;return active;
}
const marks=[],lastMarks=new Map();
function effects(vehicles,now){const g=group(vehicles[0].x,vehicles[0].z,100);for(let i=0;i<vehicles.length;i++){const s=vehicles[i],key=s.effectId||i,prev=lastMarks.get(key);if(!prev||Math.hypot(s.x-prev.x,s.z-prev.z)>.85){lastMarks.set(key,{x:s.x,z:s.z});if(Math.hypot(s.x-vehicles[0].x,s.z-vehicles[0].z)<220&&Math.abs(s.speed)>.4)for(const w of s.wheels){const t=surface(w.x,w.z);if(t.depth>.03||t.sand>.2)marks.push({x:w.x,z:w.z,y:t.depth>.03?t.level+.055:height(w.x,w.z)+.045,water:t.depth>.03,heading:s.heading,speed:Math.abs(s.speed),born:now});}}}while(marks.length>180)marks.shift();while(marks.length&&now-marks[0].born>9)marks.shift();for(const m of marks){const age=now-m.born;if(m.water){if(age>2.6)continue;const r=.22+age*.75,fade=1-age/2.6,c=shade('#c1d4bf',.8+.2*fade);for(let k=0;k<12;k++){const a=k*Math.PI/6,b=(k+1)*Math.PI/6;face(g,[[m.x+Math.cos(a)*r,m.y,m.z+Math.sin(a)*r],[m.x+Math.cos(b)*r,m.y,m.z+Math.sin(b)*r],[m.x+Math.cos(b)*(r+.045*fade),m.y,m.z+Math.sin(b)*(r+.045*fade)],[m.x+Math.cos(a)*(r+.045*fade),m.y,m.z+Math.sin(a)*(r+.045*fade)]],c);}if(age<.5&&m.speed>2)for(let k=0;k<3;k++){const a=m.heading+(k-1)*1.4,rr=age*m.speed*.16,y=m.y+Math.sin(age*Math.PI*2)*Math.min(.6,m.speed*.07);box(g,m.x+Math.sin(a)*rr,y,m.z+Math.cos(a)*rr,.06,.09,.06,'#c6dfce');}}else{const sn=Math.sin(m.heading),cs=Math.cos(m.heading),points=[[-.16,-.4],[.16,-.4],[.16,.4],[-.16,.4]].map(([x,z])=>{const xx=m.x+x*cs+z*sn,zz=m.z+z*cs-x*sn;return[xx,height(xx,zz)+.045,zz];});g.faces.push({points,color:'#9e9675',terrain:1,vertexColors:points.map(p=>terrainColor(p[0],p[2]).map(v=>v*(.8+.2*age/9)))});}}return g;}
function vehicle(s,variant=0){if(typeof window!=='undefined'&&window.HillEngine)return {x:s.x,y:s.y,z:s.z,state:s,variant,faces:[]};const g=group(s.x,s.z,6),cream='#ece3bd',green=['#718268','#9a8058','#768c88'][variant%3],dark='#34463e',glass='#76958e';
 box(g,0,-.12,0,1.95,.34,4.4,dark);box(g,0,.12,0,2.03,.83,4.25,green);box(g,0,.95,-.65,2.03,1.13,2.6,green);box(g,0,2.03,-.62,2.19,.17,2.95,cream);box(g,0,.96,1.25,1.94,.14,1.6,green);
 // Windscreen and a divided rear window; pillars remain visible around each pane.
 face(g,[[-.87,1.13,.68],[.87,1.13,.68],[.87,1.91,.59],[-.87,1.91,.59]],glass);box(g,0,1.13,.69,.06,.81,.04,cream);
 box(g,0,1.18,-1.97,1.62,.67,.04,glass);box(g,0,1.18,-2,.07,.67,.04,cream);
 for(const side of [-1,1]){box(g,side*1.024,1.19,-.08,.026,.67,1.12,glass);box(g,side*1.024,1.19,-1.23,.026,.67,.83,glass);box(g,side*1.04,.73,-.18,.05,.06,.3,cream);box(g,side*1.04,.37,-.48,.05,.075,2.8,'#c2a266');box(g,side*1.18,1.29,.63,.29,.32,.13,dark);box(g,side*1.08,-.08,-.35,.3,.12,2.2,dark);for(const z of [-1.65,1.65])box(g,side*.98,.36,z,.34,.22,1.24,dark);box(g,side*.76,.42,-2.16,.24,.3,.06,'#a94f37');box(g,side*.78,.57,2.15,.28,.3,.07,'#eee0a1');box(g,side*.78,.24,2.16,.16,.12,.08,'#d99543');}
 box(g,0,.21,2.2,.91,.43,.09,dark);for(let i=-3;i<=3;i++)box(g,i*.11,.26,2.26,.035,.32,.03,'#9b9b7f');box(g,0,-.04,2.37,2.25,.19,.19,'#5a6253');box(g,0,-.07,-2.32,2.22,.19,.18,'#586153');box(g,0,.33,-2.24,.7,.16,.04,cream);
 // Small expedition rack with a rolled canvas bed and an unbranded spare.
 for(const x of [-.88,.88])box(g,x,2.22,-.65,.07,.13,2.5,dark);for(const z of [-1.8,.5])box(g,0,2.22,z,1.8,.13,.06,dark);box(g,-.35,2.2,-1.2,.74,.27,.72,'#ae8a51');box(g,.46,2.2,-1.3,.5,.25,.8,'#79846b');
 // Convert body meshes by the damped chassis orientation.
 const sn=Math.sin(s.heading),cs=Math.cos(s.heading),cp=Math.cos(s.pitch),sp=Math.sin(s.pitch),cr=Math.cos(s.roll),sr=Math.sin(s.roll);
 const transform=p=>{const xx=p[0]*cr-p[1]*.74*sr,yy=p[1]*.74*cr+p[0]*sr,zz=p[2]*cp-yy*sp,y=yy*cp+p[2]*sp;return[s.x+xx*cs+zz*sn,s.y+y,s.z+zz*cs-xx*sn];};g.faces.forEach(f=>f.points=f.points.map(transform));
 function wheel(x,y,z,angle,spare=false){const wg=group(0,0),n=12,r=spare?.45:.48,w=.38,verts=[-w/2,w/2].map(dx=>Array.from({length:n},(_,i)=>{const a=i/n*Math.PI*2+s.wheelSpin;return[dx,Math.cos(a)*r,Math.sin(a)*r];}));for(let i=0;i<n;i++)face(wg,[verts[0][i],verts[1][i],verts[1][(i+1)%n],verts[0][(i+1)%n]],i%2?'#303b32':'#394339');face(wg,verts[0],'#222e29');face(wg,verts[1],'#26352e');for(const side of [-1,1]){const hub=Array.from({length:10},(_,i)=>{const a=i/10*Math.PI*2;return[side*(w/2+.012),Math.cos(a)*.28,Math.sin(a)*.28];});face(wg,hub,cream);}
 const sa=Math.sin(angle),ca=Math.cos(angle);for(const f of wg.faces){f.points=f.points.map(p=>[x+p[0]*ca+p[2]*sa,y+p[1],z+p[2]*ca-p[0]*sa]);g.faces.push(f);}}
 for(const w of s.wheels){const mount=s.y-.35+w.lz*Math.sin(s.pitch)+w.lx*Math.sin(s.roll),wy=clamp(w.y,mount-.27,mount+.24);wheel(w.x,wy,w.z,s.heading+(w.lz>0?s.steer:0));const arm=group(w.x,w.z);box(arm,w.x,Math.min(wy,mount),w.z,.12,Math.abs(wy-mount)+.1,.12,'#566154');g.faces.push(...arm.faces);}
 // Spare on the back door is fixed to the body rather than the terrain.
 const spare=transform([0,1.02,-2.35]);wheel(...spare,s.heading+Math.PI/2,true);
 g.y=s.y;return g;
}
const api={height,nearest,route,obstacles,landmarks,vehicle,base,rand,regions,regionAt,stream,stats,BOUNDS,WORLD_ID,candidates,terrainColor,waterAt,surface,lakes,effects,rockTrails,rockField,ridgeHeight,geology,spawnPoint,spawnIds,buildChunk};
if(typeof module!=='undefined')module.exports=api;else window.AmberWorld=api;
})();
