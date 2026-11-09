/* Fixed Ashen Vale watershed. Original models, stable spatial dressing, bounded streaming. */
(function(){
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t;
const rand=n=>{const v=Math.sin(n*127.13+41.7)*43758.5453;return v-Math.floor(v);};
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const WORLD_ID='ashen-vale-watershed-2',BOUNDS={minX:-8000,maxX:8000,minZ:-5000,maxZ:11000};
const baked=globalThis.__ASHEN_FIXED_WORLD__?.world===WORLD_ID?globalThis.__ASHEN_FIXED_WORLD__:null;
const hill=(x,z,cx,cz,rx,rz,h)=>h*Math.exp(-(((x-cx)/rx)**2+((z-cz)/rz)**2));
// Keep the complete original 8 km watershed height function inside this box.
const CORE={minX:-4000,maxX:4000,minZ:-2000,maxZ:6000};
function expansionWeight(x,z){return smooth(Math.max(CORE.minX-x,x-CORE.maxX,CORE.minZ-z,z-CORE.maxZ,0)/700);}
function expansionHeight(x,z){
 let y=55+Math.sin(x*.0011+z*.0008)*28+Math.sin(z*.0024-x*.0005)*13;
 // Broad wooded foothills frame the enormous western lake, with open shore roads.
 y+=hill(x,z,-6800,6500,1050,1600,1050)+hill(x,z,-5200,8900,1300,1200,1240)+hill(x,z,-7500,-1000,1300,2100,300);
 // Eastern granite is an actual two kilometre massif with a traversable saddle.
 y+=hill(x,z,6600,5700,1050,1650,1870)+hill(x,z,5500,9200,1500,1150,1550)+hill(x,z,7600,9000,850,1400,780);
 // The northern ice divide has three distinct shoulders rather than a perimeter wall.
 y+=hill(x,z,-2300,9950,1400,1400,1740)+hill(x,z,700,10100,1350,1150,1540)+hill(x,z,3500,10500,1000,900,850);
 const mesa=hill(x,z,4100,-3650,2250,1000,360)+hill(x,z,-2000,-4200,1800,950,170),channel=3000+Math.sin(z*.0017)*260;
 y+=mesa-(1-smooth((Math.abs(x-channel)-80)/270))*smooth((-z-2100)/450)*smooth((z+5000)/600)*Math.min(210,mesa*.7);
 const crags=smooth((y-320)/650);return y+crags*(Math.sin(x*.007+z*.002)*Math.sin(z*.005)*38+Math.sin(x*.013-z*.003)*11);
}
function riverX(z){return -950+Math.sin(z*.0009)*310+Math.sin(z*.0021)*85;}
function riverLevel(z){return 18+Math.max(0,z-500)*.052+6*smooth((z-2670)/18);}
// Authored irregular basins; no session-dependent water or shoreline geometry.
const lakes=[{name:'Stillwater',x:-1150,z:500,rx:390,rz:245,level:17,depth:1.65,phase:.2},{name:'Mirrorfen',x:1900,z:1200,rx:210,rz:145,level:38,depth:1.05,phase:1.7},{name:'Southwind Mere',x:500,z:-850,rx:260,rz:130,level:27,depth:1.25,phase:3.1},{name:'Alder Pool',x:-450,z:500,rx:76,rz:49,level:25,depth:.75,phase:2.2},{name:'Tarn of the Three Sisters',x:-1400,z:3500,rx:150,rz:94,level:378,depth:1.4,phase:4}];
lakes.push({name:'Loch Bracken',expanded:true,x:-6000,z:1700,rx:1050,rz:700,level:74,depth:2.8,phase:.9},{name:'Blueglass Tarn',expanded:true,x:5060,z:6300,rx:290,rz:440,level:108,depth:2.2,phase:2.8},{name:'Lake of Bells',expanded:true,x:-800,z:8050,rx:620,rz:380,level:94,depth:2.4,phase:4.7});
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
 y=mix(y,expansionHeight(x,z),expansionWeight(x,z));
 for(const l of lakes){const d=shore(l,x,z);if(l.expanded&&d<250)y=Math.max(y,l.level+8*(1-smooth((d-70)/180)));if(d<75){const bed=l.level-l.depth*clamp(-d/60,0,1)+Math.max(0,d)*(l.expanded?.14:.055);y=mix(bed,y,smooth((d-25)/50));}}
 return y;
}
// Lay fixed switchbacks on the actual mountain face, solving terrain contours
// instead of cutting a low, straight-grade trench through the ridge crest.
function ridgeRoute(west){
 if(baked)return baked.roads[west?5:6];
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
// Append-only routes: old road and discovery indices remain valid in saved games.
roads.push(
 [[-2000,1100],[-3100,1000],[-4100,500],[-4800,700],[-4950,1400],[-4800,2400],[-5200,3100],[-6200,3200],[-7000,2600],[-7300,1600],[-7100,500],[-6300,-100],[-5400,-200],[-4800,700]],
 [[-5200,3100],[-5100,4200],[-5600,4900],[-6300,5200],[-6700,6000],[-6500,6900],[-5900,7400],[-4800,7800],[-3900,8500],[-2800,8500],[-2300,7800],[-2600,7000],[-3500,6500],[-4200,5500],[-5100,4200]],
 [[100,-1300],[500,-1900],[1100,-2400],[1900,-2300],[2400,-2800],[2400,-3600],[1500,-4200],[0,-4200],[-1600,-3900],[-2900,-3200],[-3700,-2400],[-4500,-1600],[-5400,-200]],
 [[2200,600],[3400,400],[4200,700],[4800,1400],[5500,1700],[6400,1200],[7100,500],[7200,-500],[6600,-1500],[5700,-2300],[4400,-2600],[3300,-2300],[2400,-2800]],
 [[4800,1400],[4700,2700],[5000,3700],[5600,4200],[6400,4500],[6900,5100],[6800,5900],[6200,6400],[5700,7100],[5100,7800],[4000,8200],[2700,7800],[1800,7000],[1000,6500],[0,6800],[-1300,7100],[-2300,7800]],
 [[5700,7100],[6300,7700],[6800,8400],[6500,9000],[5600,9500],[4500,9800],[3300,9500],[2700,8700],[2700,7800]],
 [[-3900,8500],[-3700,9500],[-3000,10100],[-2000,10300],[-1000,10000],[-300,9400],[600,9000],[1500,9100],[2700,8700]],
 [[3300,-2300],[3900,-3200],[4400,-3700],[5400,-4100],[6500,-3900],[7200,-3100],[7100,-2100],[6600,-1500]]
);
const roadNames=['Watershed circuit','Southwind loop','Alder crossroad','Crown traverse','Stillwater approach','Longback switchbacks','Eagleback switchbacks','Loch Bracken shore circuit','Blackfir and northwestern divide','Southwind long road','Eastern drovers road','Granite saddle traverse','Blueglass high road','Northern bell road','Ochre canyon rim'];
const route=baked?baked.route:[];
if(!baked){
for(let road=0;road<roads.length;road++){const knots=roads[road];for(let k=0;k<knots.length-1;k++){const a=knots[Math.max(0,k-1)],b=knots[k],c=knots[k+1],d=knots[Math.min(knots.length-1,k+2)],count=Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1])/8);for(let i=0;i<count;i++){const t=i/count,t2=t*t,t3=t2*t,v=j=>.5*(2*b[j]+(-a[j]+c[j])*t+(2*a[j]-5*b[j]+4*c[j]-d[j])*t2+(-a[j]+3*b[j]-3*c[j]+d[j])*t3),x=v(0),z=v(1);route.push({x,z,y:base(x,z),road,end:i===count-1&&k===knots.length-2});}}if(road>=7){const [x,z]=knots.at(-1);route.push({x,z,y:base(x,z),road,end:true});}}
// Regrade only the added mountain roads for real wheel-driven climbing. The
// former height follower could climb the >100% gradients at a few hairpins.
for(const road of [5,6]){const points=route.filter(p=>p.road===road);for(let pass=0;pass<4;pass++){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],rise=.26*Math.hypot(a.x-b.x,a.z-b.z);b.y=clamp(b.y,a.y-rise,a.y+rise);}for(let i=points.length-2;i>=0;i--){const a=points[i+1],b=points[i],rise=.26*Math.hypot(a.x-b.x,a.z-b.z);b.y=clamp(b.y,a.y-rise,a.y+rise);}}}
// The original Crown traverse had ungraded 60% slopes and stalled the rigid
// wagon at the Cloudrest ascent. Repair only its elevations, retaining all XY
// samples and both existing valley junction heights. A 16 m bench blends back
// into the untouched mountain over a 40 m half-width corridor.
{const points=route.filter(p=>p.road===3);for(let pass=0;pass<4;pass++){for(let i=1;i<points.length-1;i++){const a=points[i-1],b=points[i],rise=.26*Math.hypot(a.x-b.x,a.z-b.z);b.y=clamp(b.y,a.y-rise,a.y+rise);}for(let i=points.length-2;i>0;i--){const a=points[i+1],b=points[i],rise=.26*Math.hypot(a.x-b.x,a.z-b.z);b.y=clamp(b.y,a.y-rise,a.y+rise);}}}
// Grade the extensions independently of the protected roads. Shared authored
// junctions are solved together, so a side road cannot meet a raised road wall.
const addedRoads=roads.slice(7).map((_,j)=>route.filter(p=>p.road===j+7));
for(const points of addedRoads)for(let pass=0;pass<6;pass++){const ys=points.map(p=>p.y);for(let i=2;i<points.length-2;i++)points[i].y=(ys[i-2]+ys[i-1]*2+ys[i]*3+ys[i+1]*2+ys[i+2])/9;}
const junctions=[];for(const knots of roads.slice(7))for(const [x,z]of knots){const matching=route.filter(p=>Math.abs(p.x-x)<.01&&Math.abs(p.z-z)<.01);if(matching.length>1&&!junctions.some(j=>j[0]===matching[0]))junctions.push(matching);}
// Balance cuts AND fills around the natural elevation profile. A minimum-only
// envelope lowered entire mountains to their nearest low valley. The midpoint
// of lower/upper slope envelopes retains relief while satisfying a 24% grade.
let coreRoadAnchors=null;
function roadEnvelope(sign,anchorsOnly=false,grade=.24){const values=new Map();for(const points of addedRoads)for(const p of points)values.set(p,anchorsOnly?(coreRoadAnchors?.has(p)?sign*coreRoadAnchors.get(p):Infinity):sign*p.y);
 for(let pass=0;pass<24;pass++){
  for(const points of junctions){const joined=points.filter(p=>p.road>=7);let v=Math.min(...joined.map(p=>values.get(p)));if(anchorsOnly){const anchor=points.find(p=>p.road<7);if(anchor)v=Math.min(v,sign*anchor.y);}for(const p of joined)values.set(p,v);}
  for(const points of addedRoads){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];values.set(b,Math.min(values.get(b),values.get(a)+grade*Math.hypot(a.x-b.x,a.z-b.z)));}for(let i=points.length-2;i>=0;i--){const a=points[i+1],b=points[i];values.set(b,Math.min(values.get(b),values.get(a)+grade*Math.hypot(a.x-b.x,a.z-b.z)));}}
 }return values;
}
// Keep the already validated lowland approaches inside the original core.
const coreFloor=roadEnvelope(1,false,.18),coreUpper=roadEnvelope(1,true,.18),coreLower=roadEnvelope(-1,true,.18);coreRoadAnchors=new Map();for(const points of addedRoads)for(const p of points)if(p.x>=CORE.minX&&p.x<=CORE.maxX&&p.z>=CORE.minZ&&p.z<=CORE.maxZ)coreRoadAnchors.set(p,clamp(coreFloor.get(p),-coreLower.get(p),coreUpper.get(p)));
const lowerRoad=roadEnvelope(1),upperRoad=roadEnvelope(-1),anchorUpper=roadEnvelope(1,true),anchorLower=roadEnvelope(-1,true);
for(const points of addedRoads)for(const p of points)p.y=clamp((lowerRoad.get(p)-upperRoad.get(p))*.5,-anchorLower.get(p),anchorUpper.get(p));
}
const bins=new Map();route.forEach((p,i)=>{const bx=Math.floor(p.x/64),bz=Math.floor(p.z/64);for(let x=bx-1;x<=bx+1;x++)for(let z=bz-1;z<=bz+1;z++){const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);}});
function nearest(x,z,full=false,legacy=false){let dist=Infinity,result=null,roadWeight=0,roadHeight=0;const ids=full?route.map((_,i)=>i):bins.get(Math.floor(x/64)+','+Math.floor(z/64))||[];for(const i of ids){const a=route[i],b=route[i+1];if(!b||a.road!==b.road||legacy&&a.road>=7)continue;const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1),px=a.x+dx*t,pz=a.z+dz*t,d=(x-px)**2+(z-pz)**2;if((a.road===3||a.road>=5)&&d<900){const w=Math.exp(-d/30);roadWeight+=w;roadHeight+=mix(a.y,b.y,t)*w;}if(d<dist){dist=d;result={x:px,z:pz,y:mix(a.y,b.y,t),heading:Math.atan2(dx,dz),i};}}return result?{...result,surfaceY:roadWeight>1e-12?roadHeight/roadWeight:result.y,distance:Math.sqrt(dist)}:{distance:Infinity};}
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
for(const trail of rockTrails){let along=0;for(let i=1;i<trail.points.length;i++){const a=trail.points[i-1],b=trail.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);rockSegments.push({a,b,dx,dz,length,along,trail:rockTrails.indexOf(trail)});along+=length;}}
function rockField(x,z){let distance=Infinity,along=0,side=0,trail=-1;
 for(const p of rockSegments){if(x<Math.min(p.a[0],p.b[0])-20||x>Math.max(p.a[0],p.b[0])+20||z<Math.min(p.a[1],p.b[1])-20||z>Math.max(p.a[1],p.b[1])+20)continue;
 const t=clamp(((x-p.a[0])*p.dx+(z-p.a[1])*p.dz)/(p.length*p.length),0,1),dx=x-p.a[0]-p.dx*t,dz=z-p.a[1]-p.dz*t,d=Math.hypot(dx,dz);if(d<distance){distance=d;along=p.along+t*p.length;side=(dx*p.dz-dz*p.dx)/p.length;trail=p.trail;}}
 const weight=1-smooth((distance-5)/11);let phaseAlong=along,phaseSide=side;
 // A closest-segment phase switch created 0.4 m vertical steps at corners.
 // Blend adjacent phases locally; straight shelves and protected roads retain
 // the original .75 m / .32 m granite components and exact placements.
 if(trail>=0&&weight>0){let corner=Infinity;const points=rockTrails[trail].points;for(let i=1;i<points.length-1;i++)corner=Math.min(corner,Math.hypot(x-points[i][0],z-points[i][1]));if(corner<24){const road=nearest(x,z).distance,blend=(1-smooth((corner-18)/6))*smooth((road-6)/6);if(blend>0){let total=0,aa=0,ss=0;for(const p of rockSegments){if(p.trail!==trail)continue;const t=clamp(((x-p.a[0])*p.dx+(z-p.a[1])*p.dz)/(p.length*p.length),0,1),dx=x-p.a[0]-p.dx*t,dz=z-p.a[1]-p.dz*t,d2=dx*dx+dz*dz;if(d2>576)continue;const w=Math.exp(-d2/64);total+=w;aa+=(p.along+t*p.length)*w;ss+=((dx*p.dz-dz*p.dx)/p.length)*w;}if(total){phaseAlong=mix(along,aa/total,blend);phaseSide=mix(side,ss/total,blend);}}}}
 return {distance,weight,along,side,trail,rough:weight*(.75*Math.pow(.5+.5*Math.sin(phaseAlong*.48+phaseSide*.19),6)+.32*Math.pow(.5+.5*Math.sin(phaseAlong*.29-phaseSide*.65),4))};
}
function terrainHeight(x,z){const p=nearest(x,z),added=p.i!==undefined&&route[p.i].road>=7,original=added&&x>-4100&&x<4100&&z>-2100&&z<6100?nearest(x,z,false,true):added?{distance:Infinity}:p;let y=base(x,z)+Math.sin(x*.09+z*.12)*.16+Math.sin(z*.19-x*.14)*.08+geology(x,z)*(.55*Math.sin(x*.055+z*.035)+.26*Math.sin(z*.11-x*.07));y+=landformCorrection(x,z);const rd=Math.abs(x-riverX(z));if(z>400&&z<4000)y=mix(riverLevel(z)-.65,y,smooth((rd-5)/20));const crownRoad=p.i!==undefined&&route[p.i].road===3,mountainRoad=crownRoad||p.i!==undefined&&route[p.i].road>=5,roadWidth=crownRoad?40:mountainRoad?80:12;if(p.distance<roadWidth&&!waterSource(x,z))y=mix(mountainRoad&&!crownRoad?p.surfaceY:p.y,y,smooth((p.distance-(crownRoad?8:mountainRoad?10:4))/(crownRoad?32:mountainRoad?70:8)));if(p.i!==undefined&&route[p.i].road>=7&&original.distance<85){let legacy=base(x,z)+Math.sin(x*.09+z*.12)*.16+Math.sin(z*.19-x*.14)*.08+geology(x,z)*(.55*Math.sin(x*.055+z*.035)+.26*Math.sin(z*.11-x*.07));const crown=original.i!==undefined&&route[original.i].road===3,mountain=crown||original.i!==undefined&&route[original.i].road>=5;if(original.distance<(crown?40:mountain?80:12)&&!waterSource(x,z))legacy=mix(mountain&&!crown?original.surfaceY:original.y,legacy,smooth((original.distance-(crown?8:mountain?10:4))/(crown?32:mountain?70:8)));y=mix(legacy,y,smooth((original.distance-6)/70));}const bridge=Math.abs(z-1803)<4.2&&Math.abs(x-riverX(1803))<23;if(bridge)y=Math.max(y,riverLevel(z)+.42);return y;}
// Grade only the underlying floor of the three existing crawl spurs. Their
// original positive granite shelves are added afterwards, unchanged. Main-road
// centres and the first 6 m on either side stay untouched; joins blend to 12 m.
// Broad, continuous landforms follow the graded routes. Build the smooth
// cut/fill displacement once on a 64 m grid; collision and worker geometry
// then use the same cheap bilinear sample. Compact support keeps distant peaks
// and the protected core outside the Crown repair unchanged.
function unpackGrid(text){return new Float32Array(Uint8Array.from(atob(text),c=>c.charCodeAt(0)).buffer);}
const landformGrid=baked?{...baked.landformGrid,extension:unpackGrid(baked.landformGrid.extension),crown:unpackGrid(baked.landformGrid.crown)}:(()=>{const step=64,minX=Math.floor((BOUNDS.minX-1900)/step)*step,maxX=Math.ceil((BOUNDS.maxX+1900)/step)*step,minZ=Math.floor((BOUNDS.minZ-1900)/step)*step,maxZ=Math.ceil((BOUNDS.maxZ+1900)/step)*step,nx=(maxX-minX)/step+1,nz=(maxZ-minZ)/step+1,extension=new Float32Array(nx*nz),crown=new Float32Array(nx*nz),spatial=new Map();
 for(const road of [3,...roads.slice(7).map((_,i)=>i+7)]){const points=route.filter(p=>p.road===road);for(let i=0;i<points.length-1;i+=4){const a=points[i],b=points[Math.min(i+4,points.length-1)],da=a.y-base(a.x,a.z),db=b.y-base(b.x,b.z),radius=clamp(250+Math.max(Math.abs(da),Math.abs(db))*2.6,400,1800),segment={a,b,da,db,radius,crown:road===3,dx:b.x-a.x,dz:b.z-a.z};segment.inv=1/(segment.dx**2+segment.dz**2);
  for(let x=Math.floor((Math.min(a.x,b.x)-radius)/512);x<=Math.floor((Math.max(a.x,b.x)+radius)/512);x++)for(let z=Math.floor((Math.min(a.z,b.z)-radius)/512);z<=Math.floor((Math.max(a.z,b.z)+radius)/512);z++){const key=x+','+z;if(!spatial.has(key))spatial.set(key,[]);spatial.get(key).push(segment);}
 }}
 for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const x=minX+i*step,z=minZ+j*step,list=spatial.get(Math.floor(x/512)+','+Math.floor(z/512));if(!list)continue;let ew=0,ev=0,ef=0,cw=0,cv=0,cf=0;
  for(const p of list){const t=clamp(((x-p.a.x)*p.dx+(z-p.a.z)*p.dz)*p.inv,0,1),dx=x-p.a.x-p.dx*t,dz=z-p.a.z-p.dz*t,d2=dx*dx+dz*dz;if(d2>=p.radius*p.radius)continue;const fade=1-smooth(Math.sqrt(d2)/p.radius),w=fade/((d2+64)**2),v=mix(p.da,p.db,t);if(p.crown){cw+=w;cv+=v*w;cf=Math.max(cf,fade);}else{ew+=w;ev+=v*w;ef=Math.max(ef,fade);}}
  let dry=1;for(const lake of lakes){const d=shore(lake,x,z);if(d<320)dry=Math.min(dry,smooth((d-120)/200));}const index=i*nz+j;if(ew)extension[index]=ev/ew*ef*dry;if(cw)crown[index]=cv/cw*cf*dry;
 }return{step,minX,maxX,minZ,maxZ,nx,nz,extension,crown};})();
function landformCorrection(x,z){const g=landformGrid;if(x<g.minX||x>=g.maxX||z<g.minZ||z>=g.maxZ)return 0;const xx=(x-g.minX)/g.step,zz=(z-g.minZ)/g.step,a=Math.floor(xx),b=Math.floor(zz),u=xx-a,v=zz-b,index=a*g.nz+b,sample=data=>mix(mix(data[index],data[index+g.nz],u),mix(data[index+1],data[index+g.nz+1],u),v);return sample(g.extension)*expansionWeight(x,z)+sample(g.crown);}
function rockProfileTarget(x,z){const road=nearest(x,z);let y=terrainHeight(x,z);if(road.distance>6&&road.distance<24){const t=6/road.distance,sx=mix(road.x,x,t),sz=mix(road.z,z,t),shoulder=terrainHeight(sx,sz),rise=(road.distance-6)*.22,capped=clamp(y,shoulder-rise,shoulder+rise);y=mix(capped,y,smooth((road.distance-12)/12));}return y;}
const rockProfiles=baked?baked.rockProfiles:rockTrails.map(trail=>{const points=[];let along=0;
 for(let i=1;i<trail.points.length;i++){const a=trail.points[i-1],b=trail.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/2);for(let j=0;j<n;j++){const t=j/n,x=mix(a[0],b[0],t),z=mix(a[1],b[1],t);points.push({along:along+t*length,y:rockProfileTarget(x,z),locked:nearest(x,z).distance<=6});}along+=length;}
 const last=trail.points.at(-1);points.push({along,y:rockProfileTarget(...last),locked:nearest(...last).distance<=6});
 for(let pass=0;pass<3;pass++){const ys=points.map(p=>p.y);for(let i=1;i<points.length-1;i++)if(!points[i].locked)points[i].y=(ys[i-1]+ys[i]*2+ys[i+1])/4;}
 for(let pass=0;pass<8;pass++){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];if(!b.locked)b.y=clamp(b.y,a.y-(b.along-a.along)*.22,a.y+(b.along-a.along)*.22);}for(let i=points.length-2;i>=0;i--){const a=points[i+1],b=points[i];if(!b.locked)b.y=clamp(b.y,a.y-(a.along-b.along)*.22,a.y+(a.along-b.along)*.22);}}
 return points;
});
function rockProfileAt(trail,along){const points=rockProfiles[trail];let lo=0,hi=points.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(points[mid].along<along)lo=mid;else hi=mid;}const a=points[lo],b=points[hi];return mix(a.y,b.y,clamp((along-a.along)/(b.along-a.along),0,1));}
function rockFloor(field,x,z){let sum=0,weight=0;for(const p of rockSegments){if(p.trail!==field.trail)continue;const t=clamp(((x-p.a[0])*p.dx+(z-p.a[1])*p.dz)/(p.length*p.length),0,1),dx=x-p.a[0]-p.dx*t,dz=z-p.a[1]-p.dz*t,d2=dx*dx+dz*dz;if(d2>144)continue;const w=Math.exp(-d2/18);sum+=rockProfileAt(p.trail,p.along+t*p.length)*w;weight+=w;}return weight?sum/weight:rockProfileAt(field.trail,field.along);}
function height(x,z){let y=terrainHeight(x,z);const field=rockField(x,z);if(field.trail>=0&&field.distance<10){const road=nearest(x,z).distance;if(road>6){const blend=(1-smooth((field.distance-4)/6))*smooth((road-6)/6);y=mix(y,rockFloor(field,x,z),blend);}}return y+field.rough;}
const regions=[{name:'Copperwood',note:'A valley full of gold.',x:0,z:600},{name:'Fir Reach',note:'The forest holds the rain.',x:1900,z:1500},{name:'Lantern Pass',note:'Between the ridges, a road to the sky.',x:900,z:3400},{name:'The White Crown',note:'The watershed begins in silence.',x:1100,z:5100},{name:'Windfold Highlands',note:'Long grass, long shadows.',x:-1500,z:3800},{name:'Redstone Canyon',note:'Water remembers its way through stone.',x:-2500,z:2000},{name:'Stillwater Basin',note:'The mountains gather in the lake.',x:-1300,z:450},{name:'Southwind Meadows',note:'Room to wander.',x:100,z:-1000}];
regions.push({name:'Blackfir Wildwood',note:'Tall trees and the long western water.',x:-5900,z:2200},{name:'Hartsfall Divide',note:'A road through forested mountains.',x:-5900,z:6500},{name:'Bellweather Highlands',note:'Old stone bells above a blue lake.',x:-1200,z:8200},{name:'The Northward Crown',note:'Three summits hold the winter.',x:-1800,z:10300},{name:'Blueglass Massif',note:'Granite ridges above the weather.',x:5800,z:6800},{name:'Ochre Canyon',note:'A river of wind between sunlit walls.',x:4300,z:-3500},{name:'Larksong Prairie',note:'A long road under an immense sky.',x:-1500,z:-3500},{name:'Juniper Coast',note:'Dry woods, pale rock, open horizons.',x:6500,z:100});
function regionAt(x,z){const choices=expansionWeight(x,z)===0?regions.slice(0,8):regions;return choices.reduce((a,b)=>Math.hypot(x-a.x,z-a.z)<Math.hypot(x-b.x,z-b.z)?a:b);}
function waterAt(x,z){const w=waterSource(x,z);return w?{level:w.level,depth:Math.max(0,w.level-height(x,z)),shore:w.shore}: {level:-10000,depth:0,shore:Infinity};}
function wet(x,z){return waterAt(x,z).depth>.03;}
function surface(x,z){
 const w=waterAt(x,z),y=height(x,z),trail=1-smooth((nearest(x,z).distance-3)/6),sand=1-smooth((Math.abs(w.shore)-8)/25),wetness=1-smooth((w.shore+2)/12),rock=Math.max(smooth((y-250)/200),rockField(x,z).weight,geology(x,z)),dirt=1-smooth((y-100)/100);
 return{...w,sand,wetness,grip:clamp(.96-trail*(.10+.05*(1-dirt))+rock*.04-sand*.24*(1-wetness),.55,1),resistance:.17+trail*(.045+.02*(1-dirt))+sand*.30*(1-wetness)+rock*.015,kind:w.depth>.04?'water':sand>.4?(wetness>.45?'wet sand':'sand'):rock>.5?'rock':trail>.4?(dirt>.5?'dirt':'gravel'):'grass'};
}
height.surface=surface;
height.bounds=BOUNDS;
const outcrops=[{x:-24,z:135,r:6,h:12},{x:37,z:173,r:5,h:9},{x:306,z:618,r:7,h:14},{x:1180,z:1590,r:5,h:11},{x:1475,z:2170,r:7,h:13},{x:-2240,z:2230,r:7,h:16}];
for(const p of rockSegments)for(let d=16;d<p.length;d+=23)for(const side of [-1,1]){const x=p.a[0]+p.dx*d/p.length+side*p.dz/p.length*12,z=p.a[1]+p.dz*d/p.length-side*p.dx/p.length*12;if(nearest(x,z).distance>10)outcrops.push({x,z,r:1.4+rand(x+z)*1.2,h:1.5+rand(z)*2});}
const structures=[{"x":173,"z":314,"r":4.6},{"x": 1370, "z": 1660, "r": 4.6}, {"x": 2090, "z": 790, "r": 4.6}, {"x": 1780, "z": 4680, "r": 4.6}, {"x": 990, "z": 5290, "r": 4.6}, {"x": -1680, "z": 3770, "r": 4.6}, {"x": -2290, "z": 2520, "r": 4.6}, {"x": -2290, "z": 1700, "r": 4.6}, {"x": -1510, "z": 420, "r": 4.6}, {"x": -1220, "z": -1070, "r": 4.6}, {"x": 200, "z": -1270, "r": 4.6}, {"x": 10, "z": 1630, "r": 4.6}];
const clearings=[[28, 57], [-1490, 500], [173, 314], [650, 3600], [470, 740], [1370, 1660], [2090, 790], [-795.089084038585, 2679], [750, 3480], [1780, 4680], [990, 5290], [-850, 4340], [-1680, 3770], [-2290, 2520], [-2290, 1700], [-1520, 810], [-1510, 420], [-1220, -1070], [200, -1270], [1440, -580], [-691.499461950177, 1803], [10, 1630], [1370, 4290], [-1850, 3180], [-600, 690], [2160, 50]];
// Stable spatial hash: collision and visible vegetation are independently reproducible.
function candidates(cx,cz){const out=[],seed=cx*7381+cz*19391;for(let i=0;i<74;i++){const x=cx*128+rand(seed+i*7)*128,z=cz*128+rand(seed+i*7+1)*128,y=height(x,z),region=regionAt(x,z).name,alpine=smooth((y-320)/200),density=region==='Blackfir Wildwood'?.94:region==='Hartsfall Divide'?.78:region==='Juniper Coast'?.32:region==='Larksong Prairie'?.045:region==='Bellweather Highlands'?.25:region==='Fir Reach'?1:region==='Copperwood'?.72:region==='Stillwater Basin'?.38:region==='Southwind Meadows'?.08:.12;if(rockField(x,z).distance<17||nearest(x,z).distance<9||waterAt(x,z).shore<10||clearings.some(l=>Math.hypot(l[0]-x,l[1]-z)<14))continue;const pine=region==='Blackfir Wildwood'?rand(seed+i+42)<.48:region==='Bellweather Highlands'?rand(seed+i+42)<.7:region==='Larksong Prairie'?false:region!=='Copperwood'&&region!=='Stillwater Basin',rocky=rand(seed+i+210)<.12+geology(x,z)*.36; if(rocky)out.push({x,z,r:1+rand(seed+i+100)*2.4,kind:'rock',seed:seed+i});else if(rand(seed+i+100)<density*(.65+.35*Math.sin(x*.007+Math.sin(z*.003)*2)**2)*(1-alpine))out.push({x,z,r:.65,h:14+rand(seed+i+90)*13,kind:'tree',pine,seed:seed+i});}return out;}
const obstacleCache=new Map();function obstacles(x,z){const cx=Math.floor(x/128),cz=Math.floor(z/128),out=[];for(let a=cx-1;a<=cx+1;a++)for(let b=cz-1;b<=cz+1;b++){const key=a+','+b;if(!obstacleCache.has(key))obstacleCache.set(key,candidates(a,b));out.push(...obstacleCache.get(key));}while(obstacleCache.size>512)obstacleCache.delete(obstacleCache.keys().next().value);for(const l of [...structures,...outcrops,...solidDetails(x,z)])if(Math.hypot(l.x-x,l.z-z)<150)out.push(l);return out;}
const landmarks=[{x:28,z:57,name:'The copper clearing',note:'Leaves like little lanterns. The valley is still waking.',kind:'camp'},{x:-1490,z:500,name:'Stillwater shore',note:'A whole sky held in a pocket of water.',kind:'lake'},{x:173,z:314,name:'The old survey shelter',note:'Someone built a roof where the weather changes its mind.',kind:'cabin'},{x:650,z:3600,name:'Cloudrest cairn',note:'The woods below, the open sky ahead. Stay a while.',kind:'cairn'}];
landmarks.push(...[{"x": 470, "z": 740, "name": "The lantern orchard", "kind": "camp", "note": "A quiet place along the watershed."}, {"x": 1370, "z": 1660, "name": "Rainwatch lodge", "kind": "cabin", "note": "A quiet place along the watershed."}, {"x": 2090, "z": 790, "name": "The cedar gateway", "kind": "ruin", "note": "A quiet place along the watershed."}, {"x": -795.089084038585, "z": 2679, "name": "Mossfall cascade", "kind": "waterfall", "note": "Meltwater spills over a granite step."}, {"x": 750, "z": 3480, "name": "Lantern saddle", "kind": "cairn", "note": "A quiet place along the watershed."}, {"x": 1780, "z": 4680, "name": "The winter survey", "kind": "cabin", "note": "A quiet place along the watershed."}, {"x": 990, "z": 5290, "name": "Crown observatory", "kind": "ruin", "note": "A quiet place along the watershed."}, {"x": -850, "z": 4340, "name": "Three sisters", "kind": "cairn", "note": "A quiet place along the watershed."}, {"x": -1680, "z": 3770, "name": "Windfold bothy", "kind": "cabin", "note": "A quiet place along the watershed."}, {"x": -2290, "z": 2520, "name": "The hollow arch", "kind": "cave", "note": "A quiet place along the watershed."}, {"x": -2290, "z": 1700, "name": "Redstone watch", "kind": "ruin", "note": "A quiet place along the watershed."}, {"x": -1520, "z": 810, "name": "Heron landing", "kind": "camp", "note": "A quiet place along the watershed."}, {"x": -1510, "z": 420, "name": "Stillwater boathouse", "kind": "cabin", "note": "A quiet place along the watershed."}, {"x": -1220, "z": -1070, "name": "The sleeping orchard", "kind": "ruin", "note": "A quiet place along the watershed."}, {"x": 200, "z": -1270, "name": "Southwind shelter", "kind": "cabin", "note": "A quiet place along the watershed."}, {"x": 1440, "z": -580, "name": "The long pasture", "kind": "camp", "note": "A quiet place along the watershed."}, {"x": -691.499461950177, "z": 1803, "name": "Alder crossing", "kind": "bridge", "note": "A timber span over the descending Alder River."}, {"x": 10, "z": 1630, "name": "The old milehouse", "kind": "cabin", "note": "A quiet place along the watershed."}, {"x": 1370, "z": 4290, "name": "Snowline refuge", "kind": "camp", "note": "A quiet place along the watershed."}, {"x": -1850, "z": 3180, "name": "Wind gate", "kind": "cairn", "note": "A quiet place along the watershed."}, {"x": -600, "z": 690, "name": "The amber steps", "kind": "camp", "note": "A quiet place along the watershed."}, {"x": 2160, "z": 50, "name": "Foxglove hollow", "kind": "camp", "note": "A quiet place along the watershed."}]);
for(const trail of rockTrails){const p=trail.points[1];landmarks.push({x:p[0]+8,z:p[1],name:trail.name,note:'Granite shelves. Slow down and let the wheels find their way.',kind:'cairn'});}
landmarks.push({x:-2930,z:4890,name:'The Longback crown',note:'A kilometre of mountain beneath your wheels.',kind:'cairn'},{x:2893,z:5240,name:'Eagleback high pass',note:'Two valleys, a thin road, and a very long view.',kind:'cairn'},{x:-2537,z:4290,name:'Windcut balcony',note:'The cliff road follows the stone.',kind:'camp'},{x:2480,z:3890,name:'Cloudline overlook',note:'The forest has become a carpet below.',kind:'cairn'});
landmarks.push({x:-1890,z:3300,name:'Longback ascent',note:'The western switchbacks begin here. Brake before the hairpins.',kind:'cairn'},{x:1610,z:2700,name:'Eagleback ascent',note:'Follow the stone road toward the high pass.',kind:'cairn'});
// New discoveries are authored roadside clusters, appended after all 35 old entries.
const discoveries=[
 [-4800,720,'The Bracken gate','A weathered sign points around a lake wider than the old valley.','ruin'],[-4970,1400,'Reedwatch boathouse','Dark firs and a pale timber landing face the western water.','cabin'],[-5200,3120,'The charcoal yard','The charcoal burners left their last stacked kiln beside the north road.','kiln'],[-7030,2600,'Heronwatch stones','Five standing stones watch the broad western shore.','stones'],[-7330,1600,'Blackfir ferry camp','An empty ferry bell waits for an answer across the water.','camp'],[-6300,-125,'Bracken southern lookout','The whole lake opens between two wooded headlands.','lookout'],
 [-5130,4200,'Hartsfall ranger station','The timber road begins to climb through the black firs.','cabin'],[-6300,5220,'The abandoned sawyard','Cut beams and an old lifting frame mark a silent mountain trade.','sawyard'],[-6720,6000,'Raven staircase','A line of cairns follows the stone shoulder above the trees.','cairn'],[-5900,7420,'Hartsfall fire tower','The forest rolls below an old timber watch platform.','lookout'],[-3900,8520,'The seven bells','Wind moves through the open arches of a hilltop bell house.','ruin'],
 [-2800,8520,'Bellweather bothy','A low roof gives shelter on the long northern traverse.','cabin'],[-2320,7800,'The pilgrim turn','Roads meet below the three winter mountains.','stones'],[-3720,9500,'Northward refuge','A timber door, a snow pole and a very long view south.','cabin'],[-2000,10325,'The weather crown','At the end of the climb, three summits divide the sky.','observatory'],[-300,9425,'The frost dial','An old stone dial counts the shadows of the northern peaks.','stones'],[1500,9120,'High shepherd shelter','A small roof at the pass between two great watersheds.','cabin'],
 [4700,2725,'Granite gatehouse','The eastern road enters a valley cut between granite shoulders.','ruin'],[5630,4200,'The blue quarry','Half dressed blocks remain beside a roofless quarry shelter.','quarry'],[6920,5100,'Eagles roost','The switchback opens across a wall of silver granite.','lookout'],[6220,6400,'Blueglass cairn','The western tarn catches the pale light below the saddle.','cairn'],[6320,7700,'The cloud workshop','A roofless survey workshop rests above the forest.','ruin'],[6500,9020,'The silver observatory','Stone sighting pillars point toward the northern crown.','observatory'],[4500,9820,'The sky bridge camp','The high road is only a thread between the mountain shoulders.','camp'],
 [7200,-525,'Juniper wayhouse','Sun bleached wood and fragrant trees line the old drovers road.','cabin'],[5700,-2325,'The drovers ring','A ring of rough stones shelters the last camp before the canyon.','stones'],[4400,-3725,'Ochre watch','Terracotta cliffs rise above the deep southern cut.','lookout'],[5400,-4125,'The wind mine','An empty timber headframe stands over a dark seam in the ochre rock.','mine'],[7200,-3125,'The red window','Broken arches frame a long view across the canyon.','ruin'],[1500,-4220,'Larksong windmill','The prairie road passes an abandoned grain store and wind wheel.','windmill'],[-1600,-3925,'The long grass camp','An enormous sky, low hills and the warm sound of moving grass.','camp'],[-3700,-2420,'The westward milehouse','The long road turns north toward Bracken water.','cabin']
];
for(const [x,z,name,note,kind]of discoveries){landmarks.push({x,z,name,note,kind});clearings.push([x,z]);if(['cabin','ruin','lookout','observatory','windmill','mine','sawyard','quarry','kiln'].includes(kind))structures.push({x,z,r:kind==='lookout'?2.8:5});}
// Collider descriptors use the same fixed placements as visible solid props.
for(const s of structures){const l=landmarks.find(l=>Math.hypot(l.x-s.x,l.z-s.z)<1);s.kind=l?.kind||'cabin';s.h=s.kind==='lookout'?14:s.kind==='windmill'?12:s.kind==='cabin'?5.6:s.kind==='cave'?10:7;s.rx=s.kind==='cabin'?4.1:4.6;s.rz=s.kind==='cabin'?3.1:4.6;
 // This legacy cabin occupied the centre of road 3. Retain the discovery's
 // coordinates/index, but place its visible solid hut in the roadside pullout.
 if(l?.name==='The winter survey'){const p=nearest(l.x,l.z),sites=[-16,16].map(offset=>({x:l.x+Math.cos(p.heading)*offset,z:l.z-Math.sin(p.heading)*offset}));l.building=sites.reduce((a,b)=>nearest(a.x,a.z).distance>nearest(b.x,b.z).distance?a:b);s.x=l.building.x;s.z=l.building.z;clearings.push([s.x,s.z]);}
}
function waymarkPoint(i){const p=route[i],next=route[i+1]||p,heading=Math.atan2(next.x-p.x,next.z-p.z);for(const offset of [7.5,-7.5,13,-13,21,-21]){const point={x:p.x+Math.cos(heading)*offset,z:p.z-Math.sin(heading)*offset};if(nearest(point.x,point.z).distance>5)return point;}return{x:p.x+Math.cos(heading)*25,z:p.z-Math.sin(heading)*25};}
const detailCollisionCache=new Map();
function solidDetails(x,z){const cx=Math.floor(x/128),cz=Math.floor(z/128),key=Math.floor(x/64)+','+Math.floor(z/64);if(!detailCollisionCache.has(key)){const out=[];for(let a=cx-1;a<=cx+1;a++)for(let b=cz-1;b<=cz+1;b++)for(let i=0;i<230;i+=23){const seed=a*131+b*387+i*19,xx=a*128+rand(seed)*128,zz=b*128+rand(seed+1)*128;if(wet(xx,zz)||nearest(xx,zz).distance<5||rockField(xx,zz).distance<14||height(xx,zz)>560)continue;out.push({x:xx+1.5,z:zz+.5,r:.13,h:.26,kind:'log',length:Math.sqrt(10),heading:Math.atan2(3,1),yOffset:.12});}
 const ids=bins.get(Math.floor(x/64)+','+Math.floor(z/64))||[];for(const i of ids){const p=route[i],next=route[i+1];if(i%35===0)out.push({...waymarkPoint(i),r:.14,h:2.1,kind:'tree'});if(i%6||p.road<5||!next||next.road!==p.road)continue;const angle=Math.atan2(next.x-p.x,next.z-p.z),cs=Math.cos(angle),sn=Math.sin(angle),left=base(p.x-cs*18,p.z+sn*18),right=base(p.x+cs*18,p.z-sn*18),side=left<right?-1:1;if(p.y-Math.min(left,right)<12)continue;out.push({x:p.x+side*cs*9.2,z:p.z-side*sn*9.2,r:.1,rx:.1,rz:8,h:.13,yOffset:.8,heading:angle,kind:'rail'});}
 detailCollisionCache.set(key,out);while(detailCollisionCache.size>128)detailCollisionCache.delete(detailCollisionCache.keys().next().value);}return detailCollisionCache.get(key);}
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
let terrainColors=new Map();
function terrainFace(g,points){g.faces.push({points,color:'#9ca46e',terrain:1,vertexColors:points.map(p=>{const key=p[0]+','+p[2];if(!terrainColors.has(key))terrainColors.set(key,terrainColor(p[0],p[2]));return terrainColors.get(key);})});}
function makeTerrain(cx,cz,step){if(step===4)step=2;const centre=nearest(cx*128+64,cz*128+64);if(step===4&&centre.i!==undefined&&route[centre.i].road>=5&&centre.distance<110)step=2;const x=cx*128,z=cz*128,g=group(x+64,z+64,92);g.distant=true;g.ground=true;const vertices=new Map(),point=(xx,zz)=>{const key=xx+','+zz;if(!vertices.has(key))vertices.set(key,[xx,renderHeight(xx,zz),zz]);return vertices.get(key);};for(let a=0;a<128;a+=step)for(let b=0;b<128;b+=step){const fine=step===4&&rockField(x+a+2,z+b+2).distance<20?1:step;for(let u=0;u<step;u+=fine)for(let v=0;v<step;v+=fine){const aa=point(x+a+u,z+b+v),bb=point(x+a+u+fine,z+b+v),cc=point(x+a+u+fine,z+b+v+fine),dd=point(x+a+u,z+b+v+fine);terrainFace(g,[aa,bb,cc]);terrainFace(g,[aa,cc,dd]);}}
 // Matching world-coordinate edge colors and downward skirts close mixed-LOD seams.
 for(let i=0;i<128;i+=step)for(const [ax,az,bx,bz] of [[x+i,z,x+i+step,z],[x+i,z+128,x+i+step,z+128],[x,z+i,x,z+i+step],[x+128,z+i,x+128,z+i+step]]){const a=[ax,height(ax,az),az],b=[bx,height(bx,bz),bz];terrainFace(g,[a,b,[bx,b[1]-4,bz],[ax,a[1]-4,az]]);}
 return g;}
function structure(l){const placement=l.building||l,x=placement.x,z=placement.z,y=height(x,z),g=group(x,z,35);box(g,x+7,y,z,.2,2.3,.2,'#73634a');box(g,x+7,y+1.6,z,1.5,.5,.15,'#dac89b');
 if(l.kind==='cabin'){box(g,x,y,z,8,3.8,6,'#84684c');for(let j=0;j<8;j++)box(g,x,y+j*.46,z,8.15,.08,6.12,'#6e5944');face(g,[[x-4.7,y+3.7,z-3.6],[x,y+5.6,z-3.6],[x,y+5.6,z+3.6],[x-4.7,y+3.7,z+3.6]],'#52675f');face(g,[[x,y+5.6,z-3.6],[x+4.7,y+3.7,z-3.6],[x+4.7,y+3.7,z+3.6],[x,y+5.6,z+3.6]],'#62776c');box(g,x-1.7,y,z-3.1,1.6,2.7,.15,'#3f5147');box(g,x+1.7,y+1.4,z-3.1,1.6,1.3,.15,'#a6b5a4');box(g,x+3,y+3.7,z+1,.8,3,.8,'#a59e87');}
 else if(l.kind==='lookout'){for(const sx of [-1,1])for(const sz of [-1,1]){beam(g,[x+sx*2.5,y,z+sz*2.5],[x+sx*1.8,y+10,z+sz*1.8],.2,'#746146');}box(g,x,y+9.8,z,5.8,.35,5.8,'#ae9266');for(const side of [-1,1]){box(g,x+side*2.7,y+10,z,.15,1.3,5.5,'#806b4c');box(g,x,y+10,z+side*2.7,5.5,1.3,.15,'#806b4c');}for(let i=0;i<12;i++)box(g,x+4-i*.2,y+i*.8,z-3.3,.9,.1,.55,'#9b825e');face(g,[[x-3.4,y+12,z-3.4],[x,y+14,z-3.4],[x,y+14,z+3.4],[x-3.4,y+12,z+3.4]],'#52675f');face(g,[[x,y+14,z-3.4],[x+3.4,y+12,z-3.4],[x+3.4,y+12,z+3.4],[x,y+14,z+3.4]],'#637a70');}
 else if(l.kind==='stones'||l.kind==='observatory'){for(let i=0;i<(l.kind==='stones'?7:5);i++){const a=i*Math.PI*2/(l.kind==='stones'?7:5),xx=x+Math.cos(a)*6,zz=z+Math.sin(a)*6;rock(g,xx,height(xx,zz),zz,1.1,2.2+rand(i+x)*2.5,'#aaa994',i+x);}if(l.kind==='observatory'){box(g,x,y,z,4,.55,4,'#a5a796');box(g,x,y+.55,z,.7,3,.7,'#b8b9a3');beam(g,[x-2,y+3,z-2],[x+2,y+3.8,z+2],.22,'#7b857d');}}
 else if(l.kind==='mine'||l.kind==='sawyard'){for(const sx of [-1,1])for(const sz of [-1,1])beam(g,[x+sx*3.3,y,z+sz*3],[x+sx*2.6,y+7,z+sz*2.5],.24,'#766045');box(g,x,y+6.8,z,6.2,.4,5.5,'#9c815b');for(const side of [-1,1])beam(g,[x-3,y,z+side*3],[x+3,y+6.5,z+side*3],.16,'#8f7652');if(l.kind==='mine'){rock(g,x,y,z+5,5,7,'#9b8a73',x);box(g,x,y,z+2.8,3.2,4,.3,'#303c36');}else for(let i=0;i<7;i++)box(g,x+7,y+(i%3)*.38,z-2+Math.floor(i/3)*.8,5,.32,.55,'#c0a16c');}
 else if(l.kind==='quarry'||l.kind==='kiln'){for(let i=0;i<9;i++){const a=i*2.4,xx=x+Math.sin(a)*6,zz=z+Math.cos(a)*5;box(g,xx,height(xx,zz),zz,1.8,1+rand(i+x)*1.6,1.4,l.kind==='quarry'?'#a6b1b4':'#756e58');}if(l.kind==='kiln'){rock(g,x,y,z,3.5,3.4,'#565c50',x);box(g,x,y,z-2.6,1.7,1.8,.3,'#2f3e34');}else box(g,x+1,y,z,3,.9,2.4,'#c2c8be');}
 else if(l.kind==='windmill'){box(g,x,y,z,5,6,5,'#a0946e');face(g,[[x-3,y+6,z-3],[x+3,y+6,z-3],[x,y+8,z]],'#6c7569');for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const dx=Math.cos(a),dy=Math.sin(a);beam(g,[x,y+6,z-3],[x+dx*6,y+6+dy*6,z-3],.13,'#8d7855');face(g,[[x+dx*1.5,y+6+dy*1.5,z-3.1],[x+dx*6,y+6+dy*6,z-3.1],[x+dx*6-dy*1.2,y+6+dy*6+dx*1.2,z-3.1],[x+dx*1.5-dy*.7,y+6+dy*1.5+dx*.7,z-3.1]],'#c6b68a');}}
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
 for(let i=0;i<route.length;i+=35){const p=route[i];if(Math.floor(p.x/128)!==cx||Math.floor(p.z/128)!==cz)continue;const point=waymarkPoint(i),g=group(point.x,point.z,4),y=height(point.x,point.z);box(g,point.x,y,point.z,.2,2.1,.2,'#77674c');box(g,point.x,y+1.6,point.z,1.4,.4,.13,'#ddc99b');groups.push(g);}
 const main=group(x+64,z+64,110),detail=group(x+64,z+64,110);detail.detail=true;for(const g of groups){const target=g.detail?detail:main;target.faces.push(...g.faces);if(g.instances){target.instances??=[];target.instances.push(...g.instances);}}return [main,detail];}
function makeWater(cx,cz,step=8,size=128){const g=group(cx*128+size/2,cz*128+size/2,size*.72);g.water=true;g.distant=true;
 const vertex=(x,z)=>{const w=waterAt(x,z);return{p:[x,w.level+.025,z],d:w.level-height(x,z)};};
 function tri(verts){let poly=verts;const out=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];if(a.d>0)out.push(a);if((a.d>0)!==(b.d>0)){const t=a.d/(a.d-b.d);out.push({p:a.p.map((v,j)=>mix(v,b.p[j],t)),d:0});}}if(out.length<3)return;g.faces.push({points:out.map(v=>v.p),color:'#589d9f',terrain:-1,waterDepths:out.map(v=>Math.max(.02,v.d))});}
 for(let x=cx*128;x<cx*128+size;x+=step)for(let z=cz*128;z<cz*128+size;z+=step){const a=vertex(x,z),b=vertex(x+step,z),c=vertex(x+step,z+step),d=vertex(x,z+step);if(Math.max(a.d,b.d,c.d,d.d)<=0)continue;tri([a,b,c]);tri([a,c,d]);}return g;}
// Every preset keeps a complete coarse horizon. Near terrain, water and the
// original physical scenery are bounded separately from distant model groves.
const graphicsPresets=Object.freeze([
 {name:'Low',range:3800,pixel:.60,near:1.6,forest:950,treeDetail:220,shadow:0},
 {name:'Balanced',range:5800,pixel:.85,near:1.9,forest:1800,treeDetail:260,shadow:1024},
 {name:'High',range:8200,pixel:1.25,near:2.6,forest:2900,treeDetail:300,shadow:2048},
 {name:'PC Ultra',range:10500,pixel:1.7,near:2.9,forest:4200,treeDetail:340,shadow:2048}
]);
function tagChunk(list,a,b,lod){const prefix=lod===256?'apron:':lod===128?'horizon:':lod===32?'middle:':'';for(const g of list){g.cell=prefix+a+','+b;g.lod=lod;}return list;}
function waterIntersects(x,z,size){return lakes.some(l=>x<l.x+l.rx*1.3+80&&x+size>l.x-l.rx*1.3-80&&z<l.z+l.rz*1.3+80&&z+size>l.z-l.rz*1.3-80)||z<4050&&z+size>350&&x<-500&&x+size>-1400;}
function macroTerrain(a,b,size,step){const x=a*size,z=b*size,g=group(x+size/2,z+size/2,size*.72),vertices=new Map();g.ground=true;g.distant=true;
 const point=(xx,zz)=>{const key=xx+','+zz;if(!vertices.has(key))vertices.set(key,[xx,height(xx,zz),zz]);return vertices.get(key);};
 for(let u=x;u<x+size;u+=step)for(let v=z;v<z+size;v+=step){const aa=point(u,v),bb=point(u+step,v),cc=point(u+step,v+step),dd=point(u,v+step);terrainFace(g,[aa,bb,cc]);terrainFace(g,[aa,cc,dd]);}
 for(let d=0;d<size;d+=step)for(const [ax,az,bx,bz]of[[x+d,z,x+d+step,z],[x+d,z+size,x+d+step,z+size],[x,z+d,x,z+d+step],[x+size,z+d,x+size,z+d+step]]){const aa=point(ax,az),bb=point(bx,bz);terrainFace(g,[aa,bb,[bx,bb[1]-45,bz],[ax,aa[1]-45,az]]);}return g;
}
function macroGroves(a,b){const g=group(a*512+256,b*512+256,380),fill=group(g.x,g.z,g.r);for(const q of[g,fill]){q.distant=true;q.vegetation=true;}g.forestBand='far';fill.forestBand='middle';
 // Use exact stable tree positions and original low polygon models, with a
 // representative subset across each 512 m tile, rather than flat billboards.
 for(let cx=a*4;cx<a*4+4;cx++)for(let cz=b*4;cz<b*4+4;cz++)for(const o of candidates(cx,cz)){if(o.kind!=='tree')continue;const target=rand(o.seed+71)<.14?g:fill,model=o.pine?'pine_low':rand(o.seed+12)<.3?'birch_low':'oak_low';instance(target,model,o.x,height(o.x,o.z),o.z,[o.h/12,o.h/12,o.h/12],rand(o.seed)*Math.PI*2,o.pine?'#ffffff':['#ffffff','#e0a877','#e5bd8b','#d89d8c','#d0d4b3'][Math.floor(rand(o.seed+22)*5)]);}return [g,fill];
}
// One fixed, very coarse exterior ground apron closes the silhouette beyond
// the playable walls. It adds no destinations, forest, colliders or terrain
// inside the authored bounds, and is not a session-generated extension.
function horizonApron(){const g=group(0,3072,100000),inner=[-8192,8192,-6144,12288],outer=[-70000,70000,-70000,70000],rings=[0,.018,.065,.25,1];g.ground=true;g.distant=true;
 for(let side=0;side<4;side++){const horizontal=side<2,length=horizontal?inner[1]-inner[0]:inner[3]-inner[2],count=Math.ceil(length/256);const point=(i,r)=>{const t=i/count,a=horizontal?mix(inner[0],inner[1],t):inner[side===2?0:1],b=horizontal?inner[side===0?2:3]:mix(inner[2],inner[3],t),ox=horizontal?mix(outer[0],outer[1],t):outer[side===2?0:1],oz=horizontal?outer[side===0?2:3]:mix(outer[2],outer[3],t),x=mix(a,ox,r),z=mix(b,oz,r);return[x,height(x,z),z];};
 for(let i=0;i<count;i++)for(let j=1;j<rings.length;j++){const a=point(i,rings[j-1]),b=point(i+1,rings[j-1]),c=point(i+1,rings[j]),d=point(i,rings[j]);terrainFace(g,[a,b,c]);terrainFace(g,[a,c,d]);}}
 return g;
}
function buildChunk(a,b,lod){terrainColors=new Map();let list;if(lod===256)list=[horizonApron()];else if(lod===128||lod===64){const size=2048;list=[macroTerrain(a,b,size,128)];if(waterIntersects(a*size,b*size,size))list.push(makeWater(a*16,b*16,64,size));lod=128;}
 else if(lod===32){list=[macroTerrain(a,b,512,32),...macroGroves(a,b)];if(waterIntersects(a*512,b*512,512))list.push(makeWater(a*4,b*4,16,512));}
 else{list=[makeTerrain(a,b,lod)];if(waterIntersects(a*128,b*128,128))list.push(makeWater(a,b,4));if(lod===4)list.push(...makeScenery(a,b));}
 terrainColors.clear();return tagChunk(list,a,b,lod);
}
function streamPlan(x,z,quality=1){const preset=graphicsPresets[clamp(Math.round(quality)||0,0,3)],result=[],cx=Math.floor(x/128),cz=Math.floor(z/128);
 function add(a,b,size,lod,priority){if(a*size>=BOUNDS.maxX||(a+1)*size<=BOUNDS.minX||b*size>=BOUNDS.maxZ||(b+1)*size<=BOUNDS.minZ)return;result.push({a,b,size,lod,d:priority,key:(lod===256?'apron:':lod===128?'horizon:':lod===32?'middle:':'')+a+','+b+','+lod});}
 for(let a=cx-3;a<=cx+3;a++)for(let b=cz-3;b<=cz+3;b++){const d=Math.hypot(a-cx,b-cz);if(d<=preset.near)add(a,b,128,4,d<=1?d*.1:3+d*.1);}
 const middle=preset.forest+608,mx=Math.floor(x/512),mz=Math.floor(z/512),mr=Math.ceil(middle/512);
 for(let a=mx-mr;a<=mx+mr;a++)for(let b=mz-mr;b<=mz+mr;b++){const d=Math.hypot((a+.5)*512-x,(b+.5)*512-z);if(d<middle+362)add(a,b,512,32,d<900?.5+d/3000:4+d/1500);}
 const hx=Math.floor(x/2048),hz=Math.floor(z/2048),hr=Math.ceil(preset.range/2048),full=quality>=2;
 for(let a=full?Math.floor(BOUNDS.minX/2048):hx-hr;a<=(full?Math.floor(BOUNDS.maxX/2048):hx+hr);a++)for(let b=full?Math.floor(BOUNDS.minZ/2048):hz-hr;b<=(full?Math.floor(BOUNDS.maxZ/2048):hz+hr);b++){const d=Math.hypot((a+.5)*2048-x,(b+.5)*2048-z);if(full||d<preset.range+1450)add(a,b,2048,128,1+d/16000);}
 if(quality>=2)add(0,0,1,256,.15);
 return result.sort((a,b)=>a.d-b.d);
}
const chunks=new Map(),recent=new Map();let active=[],streamKey='',pending=[],wanted=new Map(),worker=null,busy=false,dirty=false,recentBytes=0;
const stats={chunks:0,pending:0,vertices:0,buildMs:0,mainMs:0,cacheHits:0,cacheBytes:0,cacheChunks:0};
function rememberChunk(key,groups){if(groups[0]?.lod!==4||groups.some(g=>g.faces?.length&&!g.packed))return;const bytes=groups.reduce((sum,g)=>sum+Object.values(g.packed||{}).reduce((n,a)=>n+a.byteLength,0)+(g.instances?.length||0)*512+512,0);if(recent.has(key))recentBytes-=recent.get(key).bytes;recent.delete(key);recent.set(key,{groups,bytes});recentBytes+=bytes;while(recent.size>16||recentBytes>8*1024*1024){const victim=[...recent.keys()].find(k=>!wanted.has(k))||recent.keys().next().value;recentBytes-=recent.get(victim).bytes;recent.delete(victim);}}
function pump(){if(busy||!worker||stats.uploadPending>18)return;while(pending.length&&chunks.has(pending[0][0]))pending.shift();if(!pending.length)return;const [key,p]=pending.shift();busy=true;worker.postMessage({key,...p});}
function stream(x,z,quality=1,vx=0,vz=0){const start=performance.now(),fx=x+clamp(vx*2,-128,128),fz=z+clamp(vz*2,-128,128),key=Math.floor(x/128)+','+Math.floor(z/128)+','+quality+','+Math.floor(fx/128)+','+Math.floor(fz/128);
 if(!worker&&typeof Worker!=='undefined'){worker=new Worker('stream-worker.js');worker.onmessage=e=>{busy=false;stats.buildMs=e.data.ms;stats.vertices=e.data.vertices||0;stats.transferBytes=e.data.bytes||0;if(wanted.has(e.data.key)){chunks.set(e.data.key,e.data.groups);dirty=true;}else rememberChunk(e.data.key,e.data.groups);pump();};worker.onerror=()=>{worker.terminate();worker=null;busy=false;};}
 if(key!==streamKey){streamKey=key;wanted=new Map(streamPlan(x,z,quality).map(p=>[p.key,p]));if(Math.hypot(fx-x,fz-z)>8){const forward=streamPlan(fx,fz,quality).filter(p=>p.lod===4&&!wanted.has(p.key)).slice(0,3);for(const p of forward)wanted.set(p.key,{...p,d:2.8});}for(const k of chunks.keys())if(!wanted.has(k)){rememberChunk(k,chunks.get(k));chunks.delete(k);dirty=true;}for(const k of wanted.keys())if(!chunks.has(k)&&recent.has(k)){const cached=recent.get(k);chunks.set(k,cached.groups);recentBytes-=cached.bytes;recent.delete(k);stats.cacheHits++;dirty=true;}pending=[...wanted.entries()].filter(([k])=>!chunks.has(k)).sort((a,b)=>a[1].d-b[1].d);}
 if(worker)pump();else if(pending.length){const [k,p]=pending.shift();chunks.set(k,buildChunk(p.a,p.b,p.lod));dirty=true;}
 if(dirty){active=[...chunks.values()].flat();dirty=false;}
 stats.chunks=chunks.size;stats.pending=pending.length+(busy?1:0);stats.cacheBytes=recentBytes;stats.cacheChunks=recent.size;stats.mainMs=performance.now()-start;return active;
}
const marks=[],lastMarks=new Map();
function effects(vehicles,now){const g=group(vehicles[0].x,vehicles[0].z,100);for(let i=0;i<vehicles.length;i++){const s=vehicles[i],key=s.effectId||i,prev=lastMarks.get(key);if(!prev||Math.hypot(s.x-prev.x,s.z-prev.z)>.85){lastMarks.set(key,{x:s.x,z:s.z});if(Math.hypot(s.x-vehicles[0].x,s.z-vehicles[0].z)<220&&Math.abs(s.speed)>.4)for(const w of s.wheels){const t=surface(w.x,w.z);if(t.depth>.03||t.sand>.2)marks.push({x:w.x,z:w.z,y:t.depth>.03?t.level+.055:height(w.x,w.z)+.045,water:t.depth>.03,heading:s.heading,speed:Math.abs(s.speed),born:now});}}}while(marks.length>180)marks.shift();while(marks.length&&now-marks[0].born>9)marks.shift();for(const m of marks){const age=now-m.born;if(m.water){if(age>2.6)continue;const r=.22+age*.75,fade=1-age/2.6,c=shade('#c1d4bf',.8+.2*fade);for(let k=0;k<12;k++){const a=k*Math.PI/6,b=(k+1)*Math.PI/6;face(g,[[m.x+Math.cos(a)*r,m.y,m.z+Math.sin(a)*r],[m.x+Math.cos(b)*r,m.y,m.z+Math.sin(b)*r],[m.x+Math.cos(b)*(r+.045*fade),m.y,m.z+Math.sin(b)*(r+.045*fade)],[m.x+Math.cos(a)*(r+.045*fade),m.y,m.z+Math.sin(a)*(r+.045*fade)]],c);}if(age<.5&&m.speed>2)for(let k=0;k<3;k++){const a=m.heading+(k-1)*1.4,rr=age*m.speed*.16,y=m.y+Math.max(0,Math.min(3,m.speed*.24)*age-.5*9.81*age*age);box(g,m.x+Math.sin(a)*rr,y,m.z+Math.cos(a)*rr,.06,.09,.06,'#c6dfce');}}else{const sn=Math.sin(m.heading),cs=Math.cos(m.heading),points=[[-.16,-.4],[.16,-.4],[.16,.4],[-.16,.4]].map(([x,z])=>{const xx=m.x+x*cs+z*sn,zz=m.z+z*cs-x*sn;return[xx,height(xx,zz)+.045,zz];});g.faces.push({points,color:'#9e9675',terrain:1,vertexColors:points.map(p=>terrainColor(p[0],p[2]).map(v=>v*(.8+.2*age/9)))});}}return g;}
function vehicle(s,variant=0){return{x:s.x,y:s.y,z:s.z,state:s,variant,faces:[]};}
const api={height,nearest,route,roads,roadNames,obstacles,landmarks,vehicle,base,rand,regions,regionAt,stream,stats,BOUNDS,WORLD_ID,candidates,terrainColor,waterAt,surface,lakes,effects,rockTrails,rockField,ridgeHeight,geology,spawnPoint,spawnIds,buildChunk,graphicsPresets,streamPlan};
if(typeof module!=='undefined')module.exports=api;else window.AmberWorld=api;
})();
