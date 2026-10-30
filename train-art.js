/* Original faceted mountain scenery; locomotive proportions/colors follow Sunday Slide. */
(function(root){
 'use strict';
 const P=SummitPhysics,TAU=Math.PI*2;
 root.createSummitArt=function(canvas){
  const ctx=canvas.getContext('2d');let w=0,h=0,dpr=1,faces=[],s,camX,camZ,camY,focal,horizon,night=0;
  const curve=z=>Math.sin(z/170)*9+Math.sin(z/410)*16;
  function resize(){w=canvas.clientWidth;h=canvas.clientHeight;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
  function point(x,y,z){const depth=z-s.z+camZ;return{x:w/2+(x+curve(z)-camX)*focal/depth,y:horizon-(y-(z-s.z)*.12-camY)*focal/depth,z:depth};}
  function poly(vertices,color){const projected=vertices.map(v=>point(...v));if(projected.some(p=>p.z<1))return;faces.push({p:projected,color,depth:projected.reduce((a,p)=>a+p.z,0)/projected.length});}
  function box(x,y,z,bw,bh,bd,colors,heading=0){
   const sin=Math.sin(heading),cos=Math.cos(heading),v=(a,b,c)=>[x+a*cos+c*sin,y+b,z+c*cos-a*sin];
   const a=v(-bw/2,0,-bd/2),b=v(bw/2,0,-bd/2),c=v(bw/2,0,bd/2),d=v(-bw/2,0,bd/2),e=v(-bw/2,bh,-bd/2),f=v(bw/2,bh,-bd/2),g=v(bw/2,bh,bd/2),j=v(-bw/2,bh,bd/2);
   poly([a,b,f,e],colors[1]);poly([b,c,g,f],colors[0]);poly([c,d,j,g],colors[0]);poly([d,a,e,j],colors[1]);poly([e,f,g,j],colors[2]);
  }
  function wheel(x,y,z,r,angle,spin){
   const transform=(a,b,c)=>[x+a*Math.cos(angle)+c*Math.sin(angle),y+b,z+c*Math.cos(angle)-a*Math.sin(angle)];
   const ring=(side,radius)=>Array.from({length:8},(_,i)=>transform(side,Math.cos(i*TAU/8+spin)*radius,Math.sin(i*TAU/8+spin)*radius));
   const a=ring(-.13,r),b=ring(.13,r);for(let i=0;i<8;i++)poly([a[i],a[(i+1)%8],b[(i+1)%8],b[i]],i%2?'#273b3a':'#354744');poly(a,'#223633');poly(b,'#263c38');poly(ring(x>s.x?.145:-.145,r*.48),'#b7aa81');
  }
  function locomotive(p,wagon=false){
   const yaw=Math.atan2(p.vx||0,s.speed)*.8,x=p.x,z=p.z,y=p.y+.43;
   const b=(ox,oy,oz,bw,bh,bd,colors)=>{const sin=Math.sin(yaw),cos=Math.cos(yaw);box(x+ox*cos+oz*sin,y+oy,z+oz*cos-ox*sin,bw,bh,bd,colors,yaw);};
   if(wagon){b(0,0,0,2,.7,3.5,['#997644','#84673d','#bb965e']);b(0,.7,0,1.7,.6,3,['#d4b574','#bca064','#e5c98b']);for(const offset of[-1,0,1])b(0,1.3,offset,1.72,.1,.09,['#9b7748','#84673d','#bf9a61']);}
   else{
    const red=['#b34d3f','#823d35','#d57958'];
    b(0,0,0,2,.9,4,red);b(0,.8,-1.1,1.8,1.8,1.5,red);b(0,2.6,-1.1,2.2,.2,1.9,['#594e42','#594e42','#73614c']);b(0,1,.8,.7,1.6,.7,['#463e35','#514538','#74614b']);b(0,.9,0,1.5,.7,1.6,['#394e4c','#394e4c','#647469']);
    b(0,1.45,-1.87,1.25,.8,.035,['#7ca8a1','#567b77','#aad0b9']);b(.92,1.45,-1.1,.035,.8,1.05,['#7ca8a1','#567b77','#aad0b9']);b(-.92,1.45,-1.1,.035,.8,1.05,['#7ca8a1','#567b77','#aad0b9']);b(0,.35,2.1,1.7,.22,.35,['#66513d','#4f4536','#b5a078']);
    for(let i=0;i<5;i++){const age=(s.time*.9+i*.2)%1,bsize=.24+age*.75;b(Math.sin(i*2+s.time)*age*.8,2.8+age*3,.8-age*3,bsize,bsize*.65,bsize,['#dedec9aa','#c9d4c5aa','#ede7d1aa']);}
   }
   for(const side of[-1,1])for(const axle of[-1.2,1.2])wheel(x+Math.cos(yaw)*side+Math.sin(yaw)*axle,y-.07,z-Math.sin(yaw)*side+Math.cos(yaw)*axle,.42,yaw,s.z*.7);
   b(0,.2,-2.25,.25,.15,.9,['#4d5745','#454a3b','#81806a']);
  }
  function mix(a,b,t){const color=n=>[1,3,5].map(i=>parseInt(n.slice(i,i+2),16));const x=color(a),y=color(b);return'#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('');}
  function sky(){
   const cycle=(s.time%210)/210;
   const keys=[{t:0,top:'#8badb6',mid:'#e9cda7',low:'#efdfbd',night:0},{t:.18,top:'#679fae',mid:'#b8d7d3',low:'#e8ead5',night:0},{t:.46,top:'#606789',mid:'#dc9985',low:'#f3ce9d',night:.12},{t:.64,top:'#17273e',mid:'#344b64',low:'#6e8595',night:1},{t:.84,top:'#17273e',mid:'#344b64',low:'#6e8595',night:1},{t:1,top:'#8badb6',mid:'#e9cda7',low:'#efdfbd',night:0}];
   let a=keys[0],b=keys[1];for(let i=0;i<keys.length-1;i++)if(cycle>=keys[i].t&&cycle<=keys[i+1].t){a=keys[i];b=keys[i+1];break;}
   let t=(cycle-a.t)/(b.t-a.t);t=t*t*(3-2*t);night=a.night+(b.night-a.night)*t;
   const grad=ctx.createLinearGradient(0,0,0,h);grad.addColorStop(0,mix(a.top,b.top,t));grad.addColorStop(.5,mix(a.mid,b.mid,t));grad.addColorStop(1,mix(a.low,b.low,t));ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
   if(night>.1){ctx.globalAlpha=night*.85;ctx.fillStyle='#f6efdb';for(let i=0;i<64;i++){const x=((i*73.13)%101)/101*w,y=((i*37.91)%97)/97*h*.43,r=i%5===0?1.6:1;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();}ctx.globalAlpha=1;}
   const sunX=w*(.72+Math.sin(cycle*TAU)*.13),sunY=h*(.25-Math.sin(cycle*TAU)*.14),radius=Math.min(w,h)*.045;
   if(night<.95){ctx.globalAlpha=1-night;const halo=ctx.createRadialGradient(sunX,sunY,radius*.7,sunX,sunY,radius*4);halo.addColorStop(0,'#ffe3a455');halo.addColorStop(1,'#ffe3a400');ctx.fillStyle=halo;ctx.fillRect(sunX-radius*4,sunY-radius*4,radius*8,radius*8);ctx.fillStyle='#f7e2b4';ctx.beginPath();ctx.arc(sunX,sunY,radius,0,TAU);ctx.fill();ctx.globalAlpha=1;}
   if(night>.05){ctx.globalAlpha=night;ctx.fillStyle='#ecead4';ctx.beginPath();ctx.arc(w*.29,h*.19,radius*.65,0,TAU);ctx.fill();ctx.fillStyle=mix(a.top,b.top,t);ctx.beginPath();ctx.arc(w*.29+radius*.29,h*.19-radius*.15,radius*.6,0,TAU);ctx.fill();ctx.globalAlpha=1;}
   for(let layer=0;layer<3;layer++)for(let i=-1;i<8;i++){
    const base=w/5,ox=i*base+Math.sin(i*4+layer)*base*.4-s.z*(.008+layer*.004)%base,peak=h*(.22+layer*.065)+Math.sin(i*19)*h*.09,foot=h*(.68+layer*.08);
    ctx.fillStyle=mix(['#b0c6be','#94b3ab','#7e9f95'][layer],['#3c536b','#354f61','#2e4854'][layer],night);ctx.beginPath();ctx.moveTo(ox-base,foot);ctx.lineTo(ox,peak);ctx.lineTo(ox+base*1.2,foot);ctx.fill();
    ctx.fillStyle=mix(['#a1bab5','#85a69f','#73958b'][layer],'#253d52',night);ctx.beginPath();ctx.moveTo(ox,peak);ctx.lineTo(ox+base*.25,foot);ctx.lineTo(ox+base*1.2,foot);ctx.fill();
    ctx.fillStyle=mix(['#e9e9d7','#d9e1cf','#c8d6bf'][layer],'#9caeba',night);ctx.beginPath();ctx.moveTo(ox,peak);ctx.lineTo(ox-base*.3,peak+(foot-peak)*.3);ctx.lineTo(ox-base*.05,peak+(foot-peak)*.23);ctx.lineTo(ox+base*.15,peak+(foot-peak)*.35);ctx.lineTo(ox+base*.36,peak+(foot-peak)*.3);ctx.fill();
   }
   // Clouds sit immediately below the running surface, with distant summits poking through.
   for(let layer=0;layer<4;layer++){
    const y=h*(.58+layer*.125),drift=s.time*(2+layer),radius=w*.18;
    ctx.fillStyle=mix(['#e0e5d6','#e7e8d8','#efecdc','#f3eddd'][layer],['#647d91','#6c8799','#7891a0','#849dab'][layer],night);ctx.beginPath();ctx.moveTo(0,h);
    for(let x=-radius;x<w+radius;x+=radius*.6){const px=x-(drift%(radius*.6)),py=y+Math.sin(x*.012+layer)*h*.026;ctx.lineTo(px,py);ctx.bezierCurveTo(px+radius*.12,py-h*.03,px+radius*.3,py-h*.025,px+radius*.6,py+h*.006);}
    ctx.lineTo(w+radius,h);ctx.fill();
   }
  }
  function rampY(z){const p=((z%P.LENGTH)+P.LENGTH)%P.LENGTH;return p>=93&&p<105?Math.min(1,(p-93)/8):0;}
  function terrain(){
   const near=s.z-16,far=s.z+340,breaks=new Set();for(let z=Math.floor(near/6)*6;z<=far+6;z+=6)breaks.add(z);
   for(let i=Math.floor(near/P.LENGTH);i<=Math.ceil(far/P.LENGTH);i++)for(const offset of[0,93,101,105,125])breaks.add(i*P.LENGTH+offset);
   const rows=[...breaks].filter(z=>z>=near-6&&z<=far+6).sort((a,b)=>a-b);
   for(let i=0;i<rows.length-1;i++){
    const a=rows[i],b=rows[i+1],mid=(a+b)/2;
    for(let lane=0;lane<3;lane++){
     if(!P.rail(mid,lane,s.seed))continue;const x=P.laneX(lane),half=2.3,ya=rampY(a+.001),yb=rampY(b-.001),bottom=-120-Math.sin(mid*.04)*38;
     poly([[x-half,0,a],[x+half,0,a],[x+half,0,b],[x-half,0,b]],Math.floor(mid/6)%3===0?'#89946d':'#98a17a');
     const jut=8+Math.sin(mid*.07+lane)*3;poly([[x-half,0,a],[x-half,0,b],[x-jut,bottom,b]],'#7d8268');poly([[x-half,0,a],[x-jut,bottom,b],[x-jut,bottom,a]],Math.floor(mid/18)%2?'#717b64':'#85866b');
     poly([[x+half,0,b],[x+half,0,a],[x+6,bottom,a],[x+6,bottom,b]],Math.floor(mid/18)%2?'#a2a184':'#96987a');
     if(!P.rail(a-.1,lane,s.seed))poly([[x-half,0,a],[x-8,bottom,a],[x+9,bottom,a],[x+half,0,a]],'#717c65');
     poly([[x-1.55,ya+.02,a],[x+1.55,ya+.02,a],[x+1.55,yb+.02,b],[x-1.55,yb+.02,b]],ya||yb?'#c7a75e':'#9a9475');
     for(const side of[-.68,.68])poly([[x+side-.065,ya+.13,a],[x+side+.065,ya+.13,a],[x+side+.065,yb+.13,b],[x+side-.065,yb+.13,b]],'#d8d8bb');
     for(let tie=Math.ceil(a/2.6)*2.6;tie<b;tie+=2.6){const y=rampY(tie)+.07;poly([[x-1.2,y,tie-.13],[x+1.2,y,tie-.13],[x+1.2,y,tie+.13],[x-1.2,y,tie+.13]],'#615a44');}
    }
   }
   for(let i=Math.max(0,Math.floor(near/P.LENGTH));i<=Math.ceil(far/P.LENGTH);i++){
    const seg=P.section(i,s.seed);
    if(seg.rock){const x=P.laneX(seg.rock.lane),z=seg.rock.z;poly([[x-1.2,.1,z-1],[x+1.1,.1,z-1],[x+.4,2.1,z]],'#606e65');poly([[x+1.1,.1,z-1],[x+1.1,.1,z+1.3],[x+.4,2.1,z]],'#89917d');poly([[x+1.1,.1,z+1.3],[x-1.3,.1,z+.7],[x+.4,2.1,z]],'#a4a68c');poly([[x-1.3,.1,z+.7],[x-1.2,.1,z-1],[x+.4,2.1,z]],'#727e6e');}
    for(let lane=0;lane<3;lane++){
     const x=P.laneX(lane),z=seg.gapStart-26,allowed=!!(seg.mask&(1<<lane));
     box(x-1.9,0,z,.12,2.6,.12,['#666b52','#505c48','#a2a57e']);box(x-1.9,1.8,z,.95,.72,.13,allowed?['#46674b','#3d5744','#7e9b69']:['#a85f40','#8a4d35','#d49861']);
     const pt=point(x-1.9,2.17,z-.09);if(pt.z>2&&pt.z<150)faces.push({text:allowed?'↑':'×',p:[pt],color:'#f6e9c6',depth:pt.z-.1,size:Math.max(4,.6*focal/pt.z)});
     // Snow on the outside edge emphasizes the narrow rocky summit.
     if(i%2===0&&lane!==1)poly([[x+1.3,.04,z+10],[x+2.28,.04,z+8],[x+2.28,.04,z+18],[x+.8,.04,z+14]],'#e5e4d1');
    }
   }
  }
  function draw(state){
   s=state;if(!w||w!==canvas.clientWidth||h!==canvas.clientHeight)resize();ctx.setTransform(dpr,0,0,dpr,0,0);
   camZ=w<600?18:24;camX=curve(s.z)+s.x+3.3;camY=8.5+Math.max(0,s.y)*.22;focal=Math.min(w*1.18,h*1.12);horizon=h*.35;
   sky();faces=[];terrain();
   for(const offset of[10,5])locomotive(P.trailer(s,offset),true);locomotive({x:s.x,y:s.y,z:s.z,vx:s.vx});
   faces.sort((a,b)=>b.depth-a.depth);
   for(const f of faces){ctx.globalAlpha=Math.max(.22,1-Math.max(0,f.depth-90)/400);ctx.fillStyle=night>0?mix(f.color.slice(0,7),'#3d5365',night*.35)+(f.color.length===9?f.color.slice(7):''):f.color;
    if(f.text){ctx.font=`bold ${f.size}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(f.text,f.p[0].x,f.p[0].y);continue;}
    ctx.beginPath();f.p.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();
   }
   ctx.globalAlpha=1;
   const mist=ctx.createLinearGradient(0,h*.86,0,h);mist.addColorStop(0,'#e3e5d800');mist.addColorStop(1,mix('#e3e5d8','#7b95a7',night)+'66');ctx.fillStyle=mist;ctx.fillRect(0,h*.86,w,h*.14);
  }
  return{draw,resize};
 };
})(window);
