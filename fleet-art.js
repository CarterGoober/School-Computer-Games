(function(root){
  'use strict';
  const C=root.GarageCatalog,cache=new Map();
  function shade(hex,f){return'#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*f)).toString(16).padStart(2,'0')).join('');}
  const palette=p=>p?[shade(p.body,.87),shade(p.body,.68),p.body]:null;
  function motifs(p){
    if(!p)return[];if(cache.has(p.id))return cache.get(p.id);const out=[],a=p.accent,d=p.detail;
    const poly=(points,color)=>out.push({points,color});
    const rect=(x,y,w,h,color)=>poly([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],color);
    const diamond=(x,y,r,color)=>poly([[x,y-r],[x+r*.6,y],[x,y+r],[x-r*.6,y]],color);
    const rand=n=>{const f=Math.sin(n*127.1+p.seed*13.7)*43758.5453;return f-Math.floor(f)};
    switch(p.pattern){
      case'checker':for(let y=0;y<8;y++)for(let x=0;x<6;x++)if((x+y)%2===0)rect(-.48+x*.16,-.48+y*.12,.15,.11,a);rect(-.055,-.5,.11,1,d);break;
      case'stripe':for(let i=0;i<5;i++)poly([[-.5,-.5+i*.23],[.5,-.24+i*.23],[.5,-.13+i*.23],[-.5,-.39+i*.23]],i%2?a:d);break;
      case'flame':for(let i=0;i<7;i++){const x=-.46+i*.14;poly([[x,.5],[x+.12,.5],[x+.16,.12],[x+.08,-.1-rand(i)*.35],[x+.045,.13],[x-.02,-.05]],i%2?a:d);}break;
      case'circuit':for(let i=0;i<7;i++){const x=-.44+i*.14,y=-.4+rand(i)*.5;rect(x,-.5,.025,y+.5,a);rect(x,y,.08,.022,a);rect(x+.06,y,.025,.5-y,a);diamond(x+.07,y,.045,d);}rect(-.17,-.16,.34,.32,a);rect(-.12,-.11,.24,.22,p.body);break;
      case'galaxy':for(let i=0;i<7;i++)poly([[-.5,-.5+i*.16],[.5,-.28+i*.16],[.5,-.22+i*.16],[-.5,-.44+i*.16]],shade(a,.7));for(let i=0;i<26;i++)diamond(rand(i)-.5,rand(i+71)-.5,.013+rand(i+4)*.025,i%3?a:d);poly([[-.25,.3],[.25,-.1],[.12,.04]],d);break;
      case'lightning':for(const sign of[-1,1])poly([[sign*.33,-.5],[sign*.02,-.09],[sign*.19,-.09],[sign*-.1,.5],[sign*.39,-.02],[sign*.21,-.02],[sign*.49,-.5]],a);rect(-.035,-.5,.07,1,d);break;
      case'ribbon':for(let i=0;i<6;i++){const pts=[];for(let t=0;t<=10;t++)pts.push([-.5+t*.1,-.48+i*.17+Math.sin(t*.6+p.seed)*.07]);for(let t=10;t>=0;t--)pts.push([-.5+t*.1,-.42+i*.17+Math.sin(t*.6+p.seed)*.07]);poly(pts,i%2?a:d);}break;
      case'prism':for(let i=0;i<12;i++){const x=-.5+i%4*.25,y=-.5+Math.floor(i/4)*.33;poly([[x,y],[x+.25,y],[x+.13,y+.33]],i%3===0?d:i%3===1?a:shade(a,.6));}break;
      case'spooky':for(let i=0;i<4;i++){const x=-.29+(i%2)*.56,y=-.23+Math.floor(i/2)*.49;poly([[x-.14,y],[x-.1,y-.15],[x+.07,y-.17],[x+.14,y],[x+.14,y+.17],[x+.07,y+.1],[x,y+.17],[x-.07,y+.1],[x-.14,y+.17]],i%2?a:d);rect(x-.07,y-.035,.035,.06,p.body);rect(x+.03,y-.035,.035,.06,p.body);}break;
      case'heart':for(let i=0;i<7;i++){const x=(i%3)*.32-.32,y=Math.floor(i/3)*.31-.32;poly([[x,y-.03],[x-.04,y-.1],[x-.13,y-.07],[x-.12,y+.02],[x,y+.14],[x+.12,y+.02],[x+.13,y-.07],[x+.04,y-.1]],i%2?a:d);}break;
      case'hazard':for(let i=-3;i<4;i++)poly([[-.5,i*.25-.5],[.5,i*.25+.5],[.5,i*.25+.62],[-.5,i*.25-.38]],a);rect(-.18,-.23,.36,.46,d);poly([[-.11,.02],[0,-.13],[.11,.02],[.04,.02],[.04,.15],[-.04,.15],[-.04,.02]],p.body);break;
      default:for(let i=0;i<9;i++){const x=-.34+i%3*.33,y=-.34+Math.floor(i/3)*.33;diamond(x,y,.15,i%2?a:d);rect(x-.05,y-.025,.025,.04,p.body);rect(x+.025,y-.025,.025,.04,p.body);rect(x-.035,y+.055,.07,.018,p.body);}break;
    }
    // A model-specific racing ribbon makes related motifs visibly distinct.
    if(p.seed%3===0)rect(-.49,-.5,.055,1,d);cache.set(p.id,out);return out;
  }
  function pattern(ctx,p,x,y,w,h){if(!p)return;ctx.fillStyle=p.body;ctx.fillRect(x,y,w,h);ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();for(const m of motifs(p)){ctx.beginPath();m.points.forEach(([u,v],i)=>i?ctx.lineTo(x+(u+.5)*w,y+(v+.5)*h):ctx.moveTo(x+(u+.5)*w,y+(v+.5)*h));ctx.closePath();ctx.fillStyle=m.color;ctx.fill();}ctx.restore();}
  function world(car,x,y,z){const s=Math.sin(car.heading),c=Math.cos(car.heading);return{x:car.x+x*c+z*s,y:car.y+y,z:car.z+z*c-x*s};}
  function paintVehicle(api,car,id,p,override){
    if(!p)return;const kind=C.models[id]?.kind||'car';
    let surfaces=kind==='truck'?[{w:1.75,d:1.65,y:1.92,z:.65},{w:1.55,d:1.4,y:.94,z:-1.3}]:kind==='train'?[{w:2.15,d:1.75,y:2.82,z:-1.1}]:kind==='crate'?[{w:2.1,d:3.35,y:1.72,z:0}]:kind==='supercar'?[{w:1.2,d:1.1,y:.91,z:-.15},{w:1.65,d:.7,y:.45,z:1.23}]:kind==='heart'?[{w:1.4,d:1.6,y:.67,z:-.1}]:kind==='landboat'?[{w:1.65,d:1.6,y:.78,z:.5}]:kind==='plane'?[{w:4.9,d:.7,y:.65,z:0},{w:.75,d:1.1,y:.77,z:1}]:kind==='hybrid'?[{w:5.2,d:.65,y:.81,z:-.45},{w:1.25,d:1.2,y:1.33,z:0}]:[{w:1.2,d:1.05,y:id==='apex'?1.17:kind==='gt3'?1.17:1.22,z:-.15},{w:1.65,d:.65,y:kind==='gt3'?.57:.62,z:1.2}];
    if(override)surfaces=[override];
    for(const surface of surfaces)for(const m of motifs(p)){const points=m.points.map(([u,v])=>world(car,Math.max(-.5,Math.min(.5,u))*surface.w,surface.y,surface.z+Math.max(-.5,Math.min(.5,v))*surface.d));api.poly(points,m.color);}
    const sideWidth=kind==='crate'?1.08:kind==='train'?1.02:kind==='landboat'?1.02:.92;
    for(const side of[-1,1])for(const m of motifs(p).slice(0,36))api.poly(m.points.map(([u,v])=>world(car,side*sideWidth,.34+Math.max(-.5,Math.min(.5,v))*.4,Math.max(-.5,Math.min(.5,u))*2.7)),m.color);
  }
  function drawVehicle(api,car,id,p){
    const v=C.models[id],colors=palette(p)||v.color;
    const box=(x,y,z,w,h,d,col=colors)=>{const a=world(car,x,y,z);api.box(a.x,a.y,a.z,w,h,d,col,car.heading);};
    const face=(coords,color)=>api.poly(coords.map(a=>world(car,...a)),color);
    const glass=['#527b89','#315569','#9ac6cc'];
    if(v.kind==='gt3'){box(0,0,0,2,.55,4.1);box(0,.55,-.15,1.5,.6,1.7,glass);box(0,.08,1.95,2.2,.12,.4,['#263d48','#263d48','#526d75']);for(const x of[-.7,.7])box(x,.55,-1.65,.1,.55,.15);box(0,1.05,-1.65,2.45,.13,.6);for(const x of[-.7,.7])box(x,.35,2.05,.45,.12,.06,['#f5edc7','#f5edc7','#fff5d8']);}
    else if(v.kind==='crate'){box(0,0,0,2.15,1.7,3.4);for(const z of[-1.65,0,1.65])box(0,1.7,z,2.25,.09,.15,['#745937','#745937','#bd9b67']);for(const x of[-1.08,1.08])for(const z of[-1.6,1.6])box(x,0,z,.12,1.75,.13,['#655039','#655039','#ddbf7b']);box(0,.65,1.71,1.4,.5,.04,glass);}
    else if(v.kind==='heart'){
      const shape=[[0,2.05],[-1.25,.35],[-1.45,-.6],[-1.1,-1.45],[-.5,-1.65],[0,-1.1],[.5,-1.65],[1.1,-1.45],[1.45,-.6],[1.25,.35]];
      face(shape.map(([x,z])=>[x,.65,z]),colors[2]);for(let i=0;i<shape.length;i++){const a=shape[i],b=shape[(i+1)%shape.length];face([[a[0],0,a[1]],[b[0],0,b[1]],[b[0],.65,b[1]],[a[0],.65,a[1]]],colors[i%2]);}box(0,.65,-.35,.8,.33,.9,glass);
    }else{
      const boat=v.kind==='landboat'||v.kind==='hybrid',hybrid=v.kind==='hybrid',plane=v.kind==='plane';
      if(boat){face([[-1.1,.65,-2],[1.1,.65,-2],[1.08,.65,.8],[0,.65,2.5],[-1.08,.65,.8]],colors[2]);face([[-1.1,.65,-2],[-1.08,.65,.8],[0,.65,2.5],[0,0,2],[-.75,0,-2]],colors[0]);face([[1.1,.65,-2],[1.08,.65,.8],[0,.65,2.5],[0,0,2],[.75,0,-2]],colors[1]);box(0,.65,0,1.4,.12,2.8);box(0,.77,hybrid?0:-.7,1.25,hybrid?.55:.35,hybrid?1.4:1.1,glass);}
      if(plane){box(0,.1,0,.85,.65,4.6);box(0,.75,-.25,.65,.35,1.4,glass);box(0,.2,2.4,.08,.75,.1,['#3c515b','#3c515b','#b6c9bf']);box(0,.55,2.4,1.45,.08,.1,['#3c515b','#3c515b','#b6c9bf']);}
      if(plane||hybrid){const y=hybrid?.75:.59,z=hybrid?-.45:0;face([[-.45,y,z+.6],[-2.9,y,z-.1],[-2.9,y,z-.6],[-.45,y,z-.6]],colors[2]);face([[.45,y,z+.6],[2.9,y,z-.1],[2.9,y,z-.6],[.45,y,z-.6]],colors[2]);box(0,y+.1,-1.9,2.5,.08,.5);box(0,y+.1,-1.95,.08,.85,.65);}
    }
    const axle=v.kind==='crate'?1.15:1.3,offset=v.kind==='heart'?1.14:v.kind==='crate'?1.18:1.02;
    for(const side of[-1,1])for(const z of[-axle,axle]){
      const x=side*offset,r=.38,n=12;
      for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;face([[x-.16,.06+Math.cos(a)*r,z+Math.sin(a)*r],[x+.16,.06+Math.cos(a)*r,z+Math.sin(a)*r],[x+.16,.06+Math.cos(b)*r,z+Math.sin(b)*r],[x-.16,.06+Math.cos(b)*r,z+Math.sin(b)*r]],'#25313a');}
      for(const [rr,color,extra]of[[r,'#283b45',.001],[r*.6,'#b1c2c8',.01]]){const pts=[];for(let i=0;i<n;i++)pts.push([x+side*(.17+extra),.06+Math.cos(i/n*Math.PI*2)*rr,z+Math.sin(i/n*Math.PI*2)*rr]);face(pts,color);}
    }
    paintVehicle(api,car,id,p);
  }
  function preview(canvas,id,p){
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,v=C.models[id];ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w/2,h*.55);const scale=Math.min(w/240,h/140);ctx.scale(scale,scale);
    ctx.fillStyle='#15334122';ctx.beginPath();ctx.ellipse(0,35,95,13,0,0,Math.PI*2);ctx.fill();
    const boat=['cargo','cruise','landboat','hybrid'].includes(v.kind),ship=v.kind==='cargo'||v.kind==='cruise';
    ctx.beginPath();if(ship||boat){ctx.moveTo(-95,-8);ctx.lineTo(99,-8);ctx.quadraticCurveTo(84,31,53,34);ctx.lineTo(-70,34);ctx.closePath();}
    else if(v.kind==='plane'){ctx.moveTo(-100,-8);ctx.lineTo(-24,-17);ctx.lineTo(-60,-53);ctx.lineTo(-25,-53);ctx.lineTo(20,-15);ctx.lineTo(100,-8);ctx.lineTo(100,11);ctx.lineTo(22,17);ctx.lineTo(-17,52);ctx.lineTo(-47,52);ctx.lineTo(-21,19);ctx.lineTo(-100,14);ctx.closePath();}
    else if(v.kind==='heart'){ctx.moveTo(93,0);ctx.bezierCurveTo(32,-75,-52,-62,-48,-9);ctx.bezierCurveTo(-100,-36,-105,29,-52,38);ctx.closePath();}
    else ctx.roundRect(-83,v.kind==='crate'?-55:-19,167,v.kind==='crate'?83:47,8);
    ctx.fillStyle=p?.body||v.color[0];ctx.fill();ctx.save();ctx.clip();if(p)pattern(ctx,p,-100,ship?-65:-55,200,ship?103:100);ctx.restore();
    function paintedRect(x,y,w,h){ctx.fillStyle=p?.body||'#ede9dd';ctx.fillRect(x,y,w,h);if(p){ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();pattern(ctx,p,-100,-65,200,103);ctx.restore();}}
    if(ship){paintedRect(-70,-54,36,47);if(v.kind==='cargo'){for(let i=0;i<6;i++){ctx.fillStyle=C.models.coupe.color[i%3];ctx.fillRect(-23+i%3*30,-33-Math.floor(i/3)*23,28,22);}}else{paintedRect(-65,-40,139,31);paintedRect(-48,-58,110,18);for(let i=0;i<10;i++){ctx.fillStyle=p?shade(p.body,.38):'#4c7e8e';ctx.fillRect(-57+i*12,-32,7,7);ctx.fillRect(-39+i*9,-51,5,5);}}}
    else if(v.kind!=='crate'&&v.kind!=='heart'){ctx.fillStyle='#92bdc8';ctx.beginPath();ctx.moveTo(-27,-18);ctx.lineTo(-10,-42);ctx.lineTo(34,-42);ctx.lineTo(52,-18);ctx.closePath();ctx.fill();}
    else if(v.kind==='crate'){ctx.strokeStyle='#6e533b';ctx.lineWidth=5;ctx.strokeRect(-81,-53,163,78);for(let i=-60;i<80;i+=35){ctx.beginPath();ctx.moveTo(i,-51);ctx.lineTo(i,24);ctx.stroke();}}
    if(v.kind==='gt3'){ctx.fillStyle=p?.accent||'#31556a';ctx.fillRect(-81,-42,8,27);ctx.fillRect(-96,-46,39,6);}
    if(v.kind==='hybrid'){ctx.fillStyle=p?.accent||'#9eb5d4';ctx.beginPath();ctx.moveTo(-10,0);ctx.lineTo(-40,-50);ctx.lineTo(-5,-43);ctx.lineTo(35,3);ctx.fill();ctx.fillRect(-83,-40,8,33);}
    if(v.kind==='train'){ctx.fillStyle=p?.body||v.color[0];ctx.fillRect(-74,-66,48,53);ctx.fillRect(37,-55,12,38);}
    if(!ship){for(const x of[-53,55]){ctx.fillStyle='#233942';ctx.beginPath();ctx.arc(x,27,17,0,Math.PI*2);ctx.fill();ctx.fillStyle=p?.detail||'#bdc9c4';ctx.beginPath();ctx.arc(x,27,8,0,Math.PI*2);ctx.fill();}}
    ctx.restore();
  }
  root.FleetArt={shade,palette,motifs,pattern,paintVehicle,drawVehicle,preview,isCustom:id=>C.newVehicles.some(v=>v.id===id)};
})(typeof window!=='undefined'?window:globalThis);
