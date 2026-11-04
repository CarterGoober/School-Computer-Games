/* Original layered pixel art. A ground-level pinhole camera looks forward from
   behind the quarterback; world depth affects both feet and sprite scale. */
(function(root){
'use strict';
const PALETTE={navy:'#092a59',blue:'#103f80',gold:'#ffd447',cream:'#fff4d8',orange:'#ff7a18'};
function project(x,y,width,height){const depth=Math.max(2,8.8-y),focal=width*.875;return{x:width/2+x*focal/depth,y:height*.34+1.75*focal/depth,scale:focal/depth};}
function create(canvas){
 const ctx=canvas.getContext('2d',{alpha:false});let W=canvas.width,H=canvas.height,background=null;
 const pixel=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 const poly=(c,points,color)=>{c.fillStyle=color;c.beginPath();for(let i=0;i<points.length;i++)i?c.lineTo(...points[i]):c.moveTo(...points[i]);c.closePath();c.fill();};
 function text(c,label,x,y,size,color,align='center'){c.fillStyle=color;c.font=`${size}px Trenches, monospace`;c.textAlign=align;c.textBaseline='alphabetic';c.fillText(String(label),x,y);}
 function resize(){const width=Math.max(360,Math.round(canvas.clientWidth||canvas.width)),height=Math.max(180,Math.round(canvas.clientHeight||canvas.height));if(width!==W||height!==H||!background){W=width;H=height;canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;makeBackground();}}
 function makeBackground(){
  background=document.createElement('canvas');background.width=W;background.height=H;const c=background.getContext('2d'),horizon=H*.34;
  const sky=c.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,'#092a59');sky.addColorStop(.65,'#3b3a86');sky.addColorStop(1,'#f38542');c.fillStyle=sky;c.fillRect(0,0,W,H);
  // Stepped dusk clouds: original pixel silhouettes rather than a raster backdrop.
  for(let i=0;i<34;i++){const x=(i*151)%W,y=18+(i*29)%Math.max(30,horizon-40);pixel(c,x,y,35+i%6*13,4,'#785283');pixel(c,x+15,y+4,55,3,'#b76472');}
  poly(c,[[0,horizon-15],[W*.13,horizon-36],[W*.24,horizon-22],[W*.31,horizon-42],[W*.48,horizon-25],[W*.66,horizon-43],[W*.85,horizon-23],[W,horizon-38],[W,horizon+18],[0,horizon+18]],'#102e45');
  pixel(c,0,horizon,W,H-horizon,'#279b45');
  // Every stripe, hash and sideline is projected onto the ground plane.
  const depthToScreen=z=>horizon+1.75*W*.875/z;
  for(let z=3;z<85;z+=2.5){const y=depthToScreen(z),next=depthToScreen(z+2.5);pixel(c,0,next,W,y-next,z%5<2.5?'#22863e':'#2b9b45');}
  const boundary=(x,z)=>[W/2+x*W*.875/z,depthToScreen(z)];
  poly(c,[boundary(-10,4),boundary(-10,80),[0,horizon+12],[0,H]],'#176436');poly(c,[boundary(10,4),boundary(10,80),[W,horizon+12],[W,H]],'#176436');
  for(let z=5;z<65;z+=5){const a=boundary(-10,z),b=boundary(10,z);pixel(c,a[0],a[1],b[0]-a[0],Math.max(1,W*.01/z),'#e9f4c5');
   for(const x of [-3.1,3.1]){const p=boundary(x,z);pixel(c,p[0]-W*.03/z,p[1]-2,W*.07/z,2,'#e9f4c5');}
  }
  for(const side of [-1,1]){const a=boundary(side*10,4),b=boundary(side*10,80);poly(c,[[a[0]-3,a[1]],[a[0]+3,a[1]],[b[0]+1,b[1]],[b[0]-1,b[1]]],'#f2efc5');}
  // Distant stands and a low rail keep the camera visibly at player eye level.
  pixel(c,0,horizon-55,W,55,'#34475b');for(let row=0;row<4;row++)pixel(c,0,horizon-50+row*13,W,2,'#859ab2');
  for(let x=0;x<W;x+=60)pixel(c,x,horizon-57,3,60,'#cad2ce');pixel(c,0,horizon-2,W,5,'#ffe3a0');
  // Two small sideline benches and the original fieldhouse.
  pixel(c,W*.81,horizon-105,W*.17,44,'#16395c');pixel(c,W*.8,horizon-110,W*.19,8,'#1d2b53');for(let i=0;i<6;i++)pixel(c,W*.815+i*W*.026,horizon-94,W*.018,19,'#ffce62');
  const postY=horizon-14,postW=W*.085,postH=Math.min(90,H*.19);pixel(c,W/2-2,postY-postH*.4,4,postH*.6,'#ffe76a');pixel(c,W/2-postW/2,postY-postH*.4,postW,4,'#ffe76a');pixel(c,W/2-postW/2,postY-postH,4,postH*.6,'#ffe76a');pixel(c,W/2+postW/2-4,postY-postH,4,postH*.6,'#ffe76a');
  for(const x of [W*.13,W*.87]){pixel(c,x-2,horizon-135,4,130,'#ccd3bf');pixel(c,x-30,horizon-150,62,32,'#163c5f');for(let row=0;row<3;row++)for(let col=0;col<6;col++)pixel(c,x-26+col*9,horizon-146+row*9,6,6,'#fff4d8');
   const glow=c.createRadialGradient(x,horizon-135,2,x,horizon-135,80);glow.addColorStop(0,'#ffedac55');glow.addColorStop(1,'#ffedac00');c.fillStyle=glow;c.fillRect(x-80,horizon-215,160,160);}
  // Deterministic grass blades are cached with the field, not regenerated per frame.
  let seed=921;for(let i=0;i<1600;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const x=seed%W;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const y=horizon+12+seed%Math.max(1,Math.floor(H-horizon-12));pixel(c,x,y,1+Math.floor((y-horizon)/120),1,i%3?'#6bc04c88':'#155c2e88');}
 }
 function helmet(c,x,y,back,trim,uniform){
  // Hard stepped silhouette, shell highlights, center stripe and steel faceguard.
  poly(c,[[x-22,y+5],[x-17,y-3],[x+15,y-3],[x+23,y+5],[x+25,y+27],[x+17,y+36],[x-16,y+36],[x-25,y+26]],'#071a32');
  poly(c,[[x-19,y+5],[x-14,y],[x+13,y],[x+19,y+5],[x+21,y+25],[x+14,y+31],[x-14,y+31],[x-21,y+25]],uniform);
  pixel(c,x-14,y+2,11,4,'#3b66a0');pixel(c,x-19,y+7,5,12,'#31558c');pixel(c,x-3,y,7,31,trim);pixel(c,x+4,y+2,3,26,'#bb8d22');
  pixel(c,x-23,y+17,5,10,trim);pixel(c,x+19,y+17,5,10,trim);
  if(!back){pixel(c,x-15,y+14,30,13,'#08162b');pixel(c,x-13,y+15,9,3,'#a6744c');pixel(c,x+5,y+15,7,3,'#a6744c');pixel(c,x-17,y+20,34,3,'#c3cccf');pixel(c,x-16,y+27,32,3,'#c3cccf');for(const dx of [-12,-2,10])pixel(c,x+dx,y+19,2,12,'#a4b7c4');}
  else{pixel(c,x-15,y+26,11,3,'#c3cccf');pixel(c,x+6,y+26,10,3,'#c3cccf');pixel(c,x-12,y+32,24,3,'#fff4d8');}
 }
 function player(c,at,options){
  const {back,number,name,step,engaged,down,missed,qb,teamColor,preview,temporary,accent}=options;
  const scale=at.scale/100,trim=back?(accent||'#ffd447'):'#ff7a18',uniform=back?teamColor:'#fff4d8',pants=back?(accent||'#ffd447'):'#173e6d';
  c.save();c.translate(Math.round(at.x),Math.round(at.y));c.scale(scale,scale);
  c.fillStyle='#063f2b77';c.beginPath();c.ellipse(0,-1,58,8,0,0,Math.PI*2);c.fill();
  if(down){poly(c,[[-60,-13],[-34,-26],[20,-22],[55,-9],[38,0],[-45,0]],uniform);pixel(c,-57,-16,23,19,pants);helmet(c,42,-25,!back,trim,back?'#092a59':'#fff4d8');c.restore();return;}
  const breath=Math.sin(step*.5)*1.2,walk=preview?Math.sin(step)*1.5:Math.sin(step)*4,bodyY=-126+breath,stance=back&&!qb?9:0;
  if(qb){c.scale(1.1,1.1);}
  // Bent thighs and calves, with a wide three-point blocking stance.
  poly(c,[[-33,-55],[-8,-49],[-16,-24],[-37,-14],[-49,-21]],pants);poly(c,[[8,-49],[33,-55],[49,-21],[37,-14],[16,-24]],pants);
  pixel(c,-42,-22+walk,16,12,'#ae7652');pixel(c,26,-22-walk,16,12,'#d49a69');pixel(c,-44,-14+walk,18,11,'#fff4d8');pixel(c,26,-14-walk,18,11,'#fff4d8');
  poly(c,[[-47,-6+walk],[-28,-6+walk],[-23,0+walk],[-23,5+walk],[-53,5+walk],[-53,0+walk]],'#071e39');poly(c,[[28,-6-walk],[47,-6-walk],[53,0-walk],[53,5-walk],[23,5-walk],[23,0-walk]],'#071e39');pixel(c,-50,2+walk,27,3,'#e4e9d6');pixel(c,24,2-walk,27,3,'#e4e9d6');
  // Gold hip pads and navy jersey overlap a dark belt.
  poly(c,[[-34,-68],[-25,-80],[25,-80],[34,-68],[33,-46],[0,-40],[-33,-46]],pants);pixel(c,-28,-69,56,7,'#092a59');pixel(c,-3,-68,6,5,'#fff4d8');pixel(c,-29,-60,11,15,'#ffe76a');pixel(c,20,-60,9,15,'#c48f1e');
  // Shoulder pad shape, elbows and articulated forearms use several stepped polygons.
  poly(c,[[-33,bodyY+31],[-50,bodyY+37],[-59,bodyY+57],[-50,bodyY+66],[-32,bodyY+58]],'#c28b5b');poly(c,[[33,bodyY+31],[50,bodyY+37],[59,bodyY+57],[50,bodyY+66],[32,bodyY+58]],'#e2ad7a');
  const handY=engaged?bodyY+24:bodyY+76+walk,elbowY=bodyY+58;
  poly(c,[[-55,elbowY],[-45,elbowY+3],[-43,handY],[-53,handY+5],[-61,elbowY+5]],'#b47a50');poly(c,[[45,elbowY+3],[55,elbowY],[61,elbowY+5],[53,handY+5],[43,handY]],'#dfac7b');
  pixel(c,-56,handY-1,14,12,'#fff4d8');pixel(c,43,handY-1,14,12,'#fff4d8');pixel(c,-54,handY+6,4,7,'#b9c8cb');pixel(c,51,handY+6,4,7,'#b9c8cb');
  poly(c,[[-31,bodyY+21],[-47,bodyY+26],[-49,bodyY+44],[-29,bodyY+48],[-25,bodyY+67],[25,bodyY+67],[29,bodyY+48],[49,bodyY+44],[47,bodyY+26],[31,bodyY+21]],'#061a34');
  poly(c,[[-29,bodyY+22],[-43,bodyY+28],[-45,bodyY+40],[-27,bodyY+43],[-23,bodyY+63],[23,bodyY+63],[27,bodyY+43],[45,bodyY+40],[43,bodyY+28],[29,bodyY+22]],uniform);
  pixel(c,-45,bodyY+32,16,5,trim);pixel(c,30,bodyY+32,16,5,trim);pixel(c,-43,bodyY+39,14,3,back?'#fff4d8':'#092a59');pixel(c,30,bodyY+39,14,3,back?'#fff4d8':'#092a59');
  pixel(c,-23,bodyY+59,46,4,back?'#103f80':'#dfdac0');pixel(c,-43,bodyY+28,11,3,back?'#315b8a':'#ffffff');pixel(c,33,bodyY+28,9,3,back?'#315b8a':'#ffffff');
  // The torso extends down over the belt to provide room for a true jersey nameplate.
  pixel(c,-26,bodyY+43,52,40,uniform);
  if(back){const fontSize=Math.min(8,70/Math.max(1,name.length)*1.1);text(c,name,0,bodyY+52,fontSize,'#fff4d8');text(c,number,1,bodyY+81,25,'#a97213');text(c,number,0,bodyY+79,25,'#ffe76a');}
  else{text(c,number,0,bodyY+67,25,'#092a59');}
  if(back&&temporary)text(c,'TMP',0,bodyY+89,6,'#092a59');
  // Crouched heads sit forward into the shoulder pads, while defenders face the QB.
  helmet(c,0,bodyY+stance,back,trim,back?'#092a59':'#fff4d8');
  if(back){text(c,'LE',0,bodyY+stance+23,7,'#ffd447');}
  if(engaged){pixel(c,-44,bodyY+17,6,9,'#fff4d8');pixel(c,39,bodyY+17,6,9,'#fff4d8');}
  if(missed){text(c,'SHED',0,bodyY-8,9,'#ffbc86');}
  c.restore();
 }
 function draw(s,view={},time=0){
  resize();ctx.drawImage(background,0,0);ctx.imageSmoothingEnabled=false;
  const horizon=H*.34;
  // Fans, flags and sideline figures have staggered original animation.
  for(let i=0;i<Math.floor(W/6);i++){const row=i%4,x=(i*37)%W,y=horizon-12-row*12,bounce=Math.sin(time*2+i)>.8?2:0;pixel(ctx,x,y-bounce,4,7,i%3?'#ffd447':'#ff7a18');pixel(ctx,x,y-3-bounce,4,3,'#b67d52');}
  for(const side of [-1,1]){const x=W/2+side*W*.35;pixel(ctx,x,horizon-82,3,80,'#ffe76a');poly(ctx,[[x+3,horizon-80],[x+40,horizon-74+Math.sin(time*2)*3],[x+38,horizon-54],[x+3,horizon-58]],'#ffd447');text(ctx,'LE',x+21,horizon-61,12,'#092a59');}
  text(ctx,(view.brand||'LITTLE ELM').toUpperCase(),W/2,horizon+16,Math.max(9,W*.012),'#ffe76a');
  const preview=!s,line=s?.line||[-3.6,-1.8,0,1.8,3.6].map((x,i)=>({x,y:.7,steps:time*1.8+i,position:['LT','LG','C','RG','RT'][i]}));
  const defenders=s?.defenders||[-3.6,-1.8,0,1.8,3.6,0].map((x,i)=>({x,y:i===5?-4:-1.2}));
  // Camera follows half the line's lateral displacement while keeping its center
  // directly ahead of the quarterback, rather than letting edge players leave frame.
  const lateral=s?.assignment?.correct&&s.call.dir?line[2].x*.55:0;
  const actors=defenders.map((p,i)=>({p,i,back:false})).concat(line.map((p,i)=>({p,i,back:true}))).sort((a,b)=>a.p.y-b.p.y);
  const color=view.team==='navy'?'#103f80':'#092a59',accent=['#e7b94a','#344a7a'].includes(view.color)||!view.color?'#ffd447':view.color;
  for(const actor of actors){const {p,i,back}=actor,at=project(p.x-lateral,p.y,W,H),person=view.lineup?.[i];
   player(ctx,at,{back,number:back?(person?.number||String(i+1).padStart(2,'0')):[94,97,96,93,92,44][i],name:back?(person?.jerseyName||p.position):'',temporary:back&&!person?.number,accent,step:back?p.steps||time*2:time*4+i,engaged:p.engaged,down:back?p.pancake:p.down,missed:p.missed,teamColor:color,preview});
   if(back&&!view.preview){pixel(ctx,at.x-25,at.y+12,50,4,'#0b462c');pixel(ctx,at.x-25,at.y+12,50*(p.stamina??100)/100,4,'#ffe76a');text(ctx,p.position,at.x,at.y+30,Math.max(9,W*.009),'#fff4d8');}
   if(!back&&p.blitzer&&!p.engaged&&s?.phase==='live'){text(ctx,'!',at.x,at.y-at.scale*1.5,Math.max(20,W*.025),'#ff7a18');}
   if(back&&p.pancake)text(ctx,'PANCAKE',at.x,at.y-35,Math.max(9,W*.01),'#ffe76a');
  }
  // Foreground quarterback: head and padded shoulders crop naturally at the bottom.
  // He stays central under the center; no elevated view of the line is introduced.
  const qb=project(-lateral*.15,5.4,W,H);qb.y=H+100*(W/1280);qb.scale=W*.00135*100;
  player(ctx,qb,{back:true,number:'00',name:'QB',temporary:true,accent,step:s?.playTime||time,engaged:false,qb:true,teamColor:color,preview:true});
  if(s?.phase==='live'&&s.call.dir&&s.assignment?.correct&&s.playTime>1.8){const rb=project(s.runner.x-lateral,s.runner.y,W,H);player(ctx,rb,{back:true,number:'00',name:'RB',temporary:true,accent,step:s.playTime*8,teamColor:color});}
  // Ball begins under center and travels back on the snap.
  const center=project(line[2].x-lateral,line[2].y,W,H),t=s&&s.phase!=='presnap'?Math.min(1,s.playTime/.3):0;
  const bx=center.x+(W/2-center.x)*t,by=center.y-30+(H-90-center.y+30)*t;
  if(!s||s.phase==='presnap'||s.playTime<.3){poly(ctx,[[bx-9,by-4],[bx-4,by-13],[bx+4,by-13],[bx+9,by-4],[bx+7,by+6],[bx,by+11],[bx-7,by+6]],'#86422c');pixel(ctx,bx-1,by-6,2,12,'#fff4d8');pixel(ctx,bx-4,by-3,8,2,'#fff4d8');}
 }
 return{draw};
}
root.TrenchesArt={create,project};
})(window);
