(function(root){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const geometry=Object.freeze({width:46,height:31,deck:26,left:-70,right:76,gravity:310});
  const half=geometry.width/2;
  const overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c));
  const active=b=>b.status!=='held'&&b.status!=='overboard';

  // Coordinates stay in the loading frame: x-origin is the position on the ship.
  // Contact surfaces stop vertical motion, but never choose a horizontal parking spot.
  function support(c,b,x=b.x,ceiling=b.y+1){
    const surfaces=[{left:c.origin+geometry.left,right:c.origin+geometry.right,y:geometry.deck,onShip:true,vx:0,stability:1}];
    if(!c.sailing)surfaces.push({left:c.origin+177,right:c.origin+355,y:7,onShip:false,vx:0,stability:1});
    for(const other of c.boxes)if(other!==b&&active(other))surfaces.push({left:other.x-half,right:other.x+half,y:other.y+geometry.height,onShip:!!other.onShip,vx:other.vx,stability:other.stability??1});
    const below=surfaces.filter(s=>s.y<=ceiling&&overlap(x-half,x+half,s.left,s.right)>.2);
    if(!below.length)return null;
    const y=Math.max(...below.map(s=>s.y)),contacts=below.filter(s=>Math.abs(s.y-y)<.6),left=Math.min(...contacts.map(s=>s.left)),right=Math.max(...contacts.map(s=>s.right));
    // Merge touching intervals so a box can bridge two adjacent containers.
    const intervals=contacts.map(s=>[Math.max(x-half,s.left),Math.min(x+half,s.right)]).sort((a,b)=>a[0]-b[0]);
    let area=0,end=-Infinity;for(const [a,b]of intervals){area+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}
    const margin=Math.min(x-left,right-x),stability=Math.min(clamp(margin/half,0,1),...contacts.map(s=>s.stability));
    return{y,left,right,margin,coverage:area/geometry.width,stability,vx:contacts.reduce((n,s)=>n+s.vx,0)/contacts.length,onShip:contacts.some(s=>s.onShip)};
  }
  function loaded(c){return c.boxes.filter(b=>b.status==='loaded').length;}
  function ready(c){return c.held===null&&c.boxes.every(b=>b.status==='loaded'&&b.rest>=.3&&Math.abs(b.vx)<5);}
  function risk(c){return c.boxes.some(b=>b.onShip&&b.status!=='overboard'&&(b.stability<.55||b.y>geometry.deck+geometry.height*2.5));}
  function impact(c,strength){
    for(const b of c.boxes){
      if(!active(b)||!b.onShip)continue;
      const floor=support(c,b),stability=floor?.stability??0,exposure=Math.max(0,(b.y-geometry.deck)/geometry.height)*.2;
      const direction=stability<.65&&floor?(b.x<(floor.left+floor.right)/2?-1:1):-1;
      b.vx+=direction*strength*(.12+(1-stability)*1.4+exposure);
      b.vy+=strength*.1*(1-stability);b.rest=0;
    }
  }
  function overboard(c,b,motion){
    const x=b.x-c.origin,y=b.y+geometry.height/2,s=Math.sin(motion.angle),co=Math.cos(motion.angle);
    b.status='overboard';b.rest=0;c.lost++;
    b.world={x:motion.x+x*co-y*s,y:motion.y+x*s+y*co,vx:motion.vx+b.vx*co-b.vy*s,vy:motion.vy+b.vx*s+b.vy*co,angle:motion.angle+b.angle,age:0};
  }
  function step(c,dt,motion=null,recover=null){
    const lost=[];
    for(const b of c.boxes)if(b.status==='overboard'&&b.world){const w=b.world;w.age+=dt;w.vx*=Math.exp(-dt*1.5);w.vy-=75*dt;w.x+=w.vx*dt;w.y+=w.vy*dt;w.angle+=dt*.3;}
    // Two small steps keep falling boxes from tunneling through thin supports.
    for(let pass=0;pass<2;pass++){
      const h=dt/2;
      for(const b of [...c.boxes].sort((a,b)=>a.y-b.y)){
        if(!active(b))continue;
        const oldY=b.y,oldX=b.x,floor=support(c,b),touch=floor&&Math.abs(b.y-floor.y)<1.1&&Math.abs(b.vy)<3;
        let drive=motion?-geometry.gravity*Math.sin(motion.angle)-clamp(motion.accel,-70,70)*.65+clamp(motion.alpha,-2.5,2.5)*(b.y+15.5)*.18:0;
        if(touch){
          const tipping=floor.margin<0,edge=tipping?(b.x<(floor.left+floor.right)/2?-1:1):0;
          if(tipping)drive+=edge*(45-floor.margin*7);
          const grip=(.25+.75*floor.stability)*(tipping?.12:1),relative=b.vx-floor.vx;
          if(Math.abs(relative)<.6&&Math.abs(drive)<geometry.gravity*.62*grip)b.vx=floor.vx;
          else{const v=relative+drive*h;b.vx=floor.vx+Math.sign(v)*Math.max(0,Math.abs(v)-geometry.gravity*.45*grip*h);}
          const target=tipping?-edge*Math.min(.65,-floor.margin*.035):0;b.angle+=(target-b.angle)*(1-Math.exp(-h*8));
        }else{b.vx=(b.vx+drive*h)*Math.exp(-h*.12);b.angle+=(b.omega||0)*h;}
        b.x+=b.vx*h;b.vy-=geometry.gravity*h;b.y+=b.vy*h;
        const landing=support(c,b,b.x,oldY+1);
        if(landing&&b.vy<=0&&b.y<=landing.y&&oldY>=landing.y-1){
          b.y=landing.y;b.vy=b.vy< -110?-b.vy*.08:0;b.onShip=landing.onShip;b.stability=landing.stability;
          b.status=landing.onShip?'loaded':'dock';b.rest=Math.abs(b.vx-landing.vx)<4&&Math.abs(b.vy)<3?(b.rest||0)+h:0;
          if(b.onShip&&b.rest>=.3){
            b.loadedOnce=true;
            if(b.cleanDrop&&!b.perfectAwarded&&landing.coverage>=.94&&landing.stability>=.85){b.perfectAwarded=true;c.perfects++;}
          }
        }else{b.status='falling';b.rest=0;b.stability=0;}
        // Side contact preserves the stack instead of letting boxes pass through each other.
        for(const other of c.boxes){
          if(other===b||!active(other)||Math.abs(b.y-other.y)>=geometry.height-1.5)continue;
          const penetration=geometry.width-Math.abs(b.x-other.x);if(penetration<=0||oldY>=other.y+geometry.height-1)continue;
          const side=oldX<other.x?-1:1;b.x=other.x+side*geometry.width;
          const shared=(b.vx+other.vx)*.45;b.vx=shared;other.vx=shared;
        }
        if(c.sailing&&b.status==='falling'&&b.y<0){overboard(c,b,motion);lost.push(b);}
        else if(!c.sailing&&(b.y< -70||Math.abs(b.x-c.origin)>650))recover?.(c,b);
      }
    }
    return lost;
  }
  const api={geometry,support,loaded,ready,risk,impact,step};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TideCargo=api;
})(typeof window!=='undefined'?window:globalThis);
