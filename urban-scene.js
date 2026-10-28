'use strict';
// Original street scenery, assembled once per district and culled before drawing.
window.buildUrbanScene = function(track) {
 const meshes=[],lots=[],colliders=[];
 const rand=n=>{const v=Math.sin(n*127.1+43.7)*43758.5453;return v-Math.floor(v)};
 const shade=(hex,f)=>'#'+hex.slice(1).match(/../g).map(v=>Math.max(0,Math.min(255,Math.round(parseInt(v,16)*f))).toString(16).padStart(2,'0')).join('');
 function object(x,z,radius,make,kind='detail',heading=0){
  const faces=[],s=Math.sin(heading),c=Math.cos(heading);
  const p=(x0,y,z0)=>({x:x+x0*c+z0*s,y,z:z+z0*c-x0*s});
  const face=(points,color,colors)=>faces.push({points:points.map(v=>p(...v)),color,colors});
  function box(x0,y,z0,w,h,d,color){
   const v=[];for(const yy of [y,y+h])for(const zz of [z0-d/2,z0+d/2])for(const xx of [x0-w/2,x0+w/2])v.push([xx,yy,zz]);
   face([v[0],v[1],v[5],v[4]],shade(color,.8));face([v[2],v[3],v[7],v[6]],color);face([v[0],v[2],v[6],v[4]],shade(color,.9));face([v[1],v[3],v[7],v[5]],shade(color,.72));face([v[4],v[5],v[7],v[6]],shade(color,1.08));
  }
  function cylinder(x0,y,z0,r,h,color,sides=12){
   const top=[];for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;const v=[x0+Math.cos(a)*r,y,z0+Math.sin(a)*r],w=[x0+Math.cos(b)*r,y,z0+Math.sin(b)*r];face([v,w,[w[0],y+h,w[2]],[v[0],y+h,v[2]]],shade(color,.8+.18*Math.cos(a-.5)));top.push([v[0],y+h,v[2]])}face(top,shade(color,1.1));
  }
  function crown(x0,y,z0,r,color){
   const rings=6,sides=16;
   for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){const vertices=[],colors=[];for(const [u,v] of [[i,j],[i+1,j],[i+1,j+1],[i,j+1]]){const a=u/sides*Math.PI*2,b=v/rings*Math.PI;vertices.push([x0+Math.cos(a)*Math.sin(b)*r,y+Math.cos(b)*r*.88,z0+Math.sin(a)*Math.sin(b)*r]);const light=.82+.14*Math.cos(a)*Math.sin(b)+.18*Math.cos(b);colors.push([...color.slice(1).match(/../g).map(c=>Math.min(1,parseInt(c,16)/255*light)),1])}face(vertices,color,colors)}
  }
  make({box,face,cylinder,crown});meshes.push({x,z,radius,faces,kind});
 }
 function clear(x,z,r){
  for(const [dx,dz] of [[0,0],[r,0],[-r,0],[0,r],[0,-r]])if(Drift.nearest(track,x+dx,z+dz).distance<track.width/2+4)return false;
  return !lots.some(p=>Math.hypot(x-p.x,z-p.z)<r+p.r+3);
 }
 const city=track.district==='city',industrial=track.district==='industrial',port=track.district==='port';
 // Street-facing lots follow the road, keeping homes and shops clear of the driving line.
 for(let i=0;i<track.samples.length;i+=9){
  const a=track.samples[i];if(a.baseY>1)continue;
  for(const side of [-1,1]){
   const radius=city?11:industrial||port?12:8,offset=track.width/2+radius+7;
   const x=a.x+a.nx*offset*side,z=a.z+a.nz*offset*side;
   if(port&&x>track.shore-24)continue;
   if(!clear(x,z,radius))continue;
   lots.push({x,z,r:radius});
   const heading=Math.atan2(-a.nx*side,-a.nz*side),seed=i*3+side;
   object(x,z,radius+1,({box,face})=>{
    const w=city?14:industrial||port?19:11,d=city?14:industrial||port?14:12;
    const height=city?13+Math.floor(rand(seed)*5)*4:industrial||port?8:5.5;
    const walls=city?['#b6b9bd','#a7b5bf','#c5bcb1'][i%3]:industrial||port?'#92a3a8':['#d3c8b8','#c1ccd0','#c6bda9','#b9c7bc'][i%4];
    box(0,-.08,0,w+3,.2,d+3,'#c4c7c6');box(0,.12,0,w,height,d,walls);
    box(0,.12,d/2+3.1,3.3,.025,5.8,'#bfc3c3');
    if(!city&&!industrial&&!port){
     const roof='#63717c',y=height+.12;
     face([[-w/2-.6,y,-d/2-.6],[0,y+2.8,-d/2-.6],[0,y+2.8,d/2+.6],[-w/2-.6,y,d/2+.6]],roof);
     face([[0,y+2.8,-d/2-.6],[w/2+.6,y,-d/2-.6],[w/2+.6,y,d/2+.6],[0,y+2.8,d/2+.6]],shade(roof,.8));
     face([[-w/2,y,d/2],[w/2,y,d/2],[0,y+2.8,d/2]],walls);
     box(-w/2+1.8,y,-2,1.1,2.3,1.1,'#a78c79');
     box(0,.2,d/2+.05,1.5,2.8,.1,'#526a70');box(0,3.1,d/2+.8,2.7,.18,2,'#e1e4e0');
    }else{
     box(0,height+.12,0,w+.5,.35,d+.5,'#64727b');box(2,height+.47,-2,3.5,1.1,2,'#919c9f');
     if(industrial||port){box(0,.2,d/2+.06,8,5,.13,'#596e7a');for(let row=1;row<9;row++)box(0,row*.55,d/2+.15,7.9,.05,.05,'#84969c')}
     else {box(0,.2,d/2+.1,w-1,3.2,.15,'#567f91');box(0,3.5,d/2+.6,w,.35,1.3,['#cb8760','#759d9b','#71839f'][i%3]);}
    }
    const rows=city?Math.floor((height-4)/3.5):industrial||port?1:2;
    for(let row=0;row<rows;row++)for(let col=0;col<3;col++){
     const xx=(col-1)*(w/3.4),yy=city?5+row*3.5:industrial||port?6:1.5+row*2.7;
     if(!city&&!industrial&&!port&&col===1)continue;
     box(xx,yy,d/2+.11,2,1.6,.08,'#e1e7e6');box(xx,yy+.13,d/2+.18,1.65,1.3,.05,'#7095a4');
     box(xx,yy+.16,d/2+.23,.07,1.2,.03,'#cbdadb');
    }
    // Side windows are visible while sliding past the frontage.
    for(let row=0;row<(city?Math.min(rows,5):2);row++)for(let col=0;col<3;col++)box(w/2+.07,1.7+row*3.5,(col-1)*3,.1,1.7,1.5,'#6c8c9c');
   },'building',heading);
   colliders.push({x,z,y:0,radius:radius*.72,kind:'building'});
  }
 }
 // Rounded deciduous trees, lamp posts, street signs, and curbside details.
 for(let i=0;i<track.samples.length;i+=7){
  const a=track.samples[i],side=i%2?1:-1,offset=track.width/2+2.2;
  const x=a.x+a.nx*offset*side,z=a.z+a.nz*offset*side,y=a.y;
  object(x,z,5,({box,cylinder})=>{cylinder(0,y,0,.1,6.3,'#64747b',8);box(0,y+6.1,1.1,.15,.15,2.4,'#65747b');box(0,y+6,2,.55,.15,1.1,'#dee4e2');box(0,y+5.94,2,.43,.04,.85,'#fff3c7');},'lamp',Math.atan2(-a.nx*side,-a.nz*side));
  if(i%14===0&&a.baseY<1){const tx=a.x-a.nx*side*(track.width/2+4),tz=a.z-a.nz*side*(track.width/2+4);if(!port||tx<track.shore-5)object(tx,tz,4,({cylinder,crown})=>{cylinder(0,0,0,.26,3.5,'#8c8170');crown(0,4.5,0,2.6,city?'#659385':'#72a084');},'tree')}
 }
 // Low-detail skyline beyond the playable streets; no mountain backdrop.
 const xs=track.samples.map(p=>p.x),zs=track.samples.map(p=>p.z),cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2;
 for(let i=0;i<20;i++){const angle=i/20*Math.PI*2,x=cx+Math.sin(angle)*340,z=cz+Math.cos(angle)*340;if(port&&x>track.shore)continue;object(x,z,25,({box})=>{box(0,0,0,16+rand(i)*20,city?25+rand(i+6)*45:8+rand(i+6)*15,20,'#b2bec5');},'skyline')}
 if(port){
  const shore=track.shore;
  object(shore+260,0,650,({face})=>{face([[-260,-.11,-600],[650,-.11,-600],[650,-.11,600],[-260,-.11,600]],'#3d8197');for(let i=0;i<40;i++){const x=rand(i)*260,z=rand(i+60)*400-180;face([[x,-.09,z],[x+9,-.09,z+1],[x+9,-.09,z+1.2],[x,-.09,z+.2]],'#7ca6b3')}},'water');
  object(shore-3,0,250,({box,cylinder})=>{box(0,-.07,0,6,.8,400,'#9aa8ae');for(let i=-180;i<200;i+=12){cylinder(0,.73,i,.4,.7,'#495c65',10);box(-1,.75,i,1.1,.08,2.5,'#d6bb66')}},'quay');
  for(let i=0;i<3;i++){
   const x=shore+26+i*27,z=-55+i*60;
   object(x,z,30,({box,face,cylinder})=>{
    face([[-4,.2,-13],[4,.2,-13],[4,.2,7],[0,.2,16],[-4,.2,7]],'#cfdfe3');
    for(const side of [-1,1])face([[side*4,.2,-13],[side*4,.2,7],[0,.2,16],[0,2,16],[side*4,2,7],[side*4,2,-13]],'#e5eceb');
    box(0,1.9,-2,7,.25,21,'#a1b5ba');box(0,2.15,-1,4.6,2.1,6,'#f1f1e7');box(0,3.1,2.03,4,1,.1,'#567f92');box(0,4.25,-1,5,.2,7,'#e7efee');cylinder(0,4.45,-2,.08,4.5,'#7f979f');
   },'boat',i*.2);
  }
  for(let i=0;i<3;i++)object(shore-16,-120+i*110,45,({box,cylinder})=>{for(const side of [-1,1])box(side*7,0,0,1.2,25,1.2,'#d8ac59');box(0,24,0,17,1.2,2,'#e5b95e');box(14,25,0,44,1,1.1,'#d8ac59');cylinder(30,7,0,.07,18,'#485f69',6);box(30,6.5,0,1.2,.5,.7,'#4a6067');},'crane');
 }
 if(port||industrial){for(let i=0;i<28;i++){
  const sample=track.samples[Math.floor(rand(i+220)*track.samples.length)],side=i%2?1:-1,x=sample.x+sample.nx*side*55,z=sample.z+sample.nz*side*55;
  if((port&&x>track.shore-20)||!clear(x,z,9))continue;
  object(x,z,11,({box})=>{const color=['#bc7257','#58879b','#90a89b','#d0ab69'][i%4];for(let stack=0;stack<1+i%2;stack++){box(0,stack*3.1,0,6,3,12,color);for(let rib=-5;rib<=5;rib++)box(3.03,stack*3.1+.2,rib,.08,2.7,.08,shade(color,.85))}},'container');
  colliders.push({x,z,y:0,radius:6,kind:'container'});
 }}
 track.sceneryObstacles=colliders;
 return {meshes,lots,colliders,counts:meshes.reduce((o,m)=>(o[m.kind]=(o[m.kind]||0)+1,o),{})};
};
