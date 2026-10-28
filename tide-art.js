(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const rand = n => { const v = Math.sin(n * 127.1 + 91.7) * 43758.5453; return v - Math.floor(v); };
  window.createTideRenderer = function (canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });
    let width = 1, height = 1, dpr = 1, zoom = 1, center = 0, waterline = 0, cameraX = 0;
    const X = x => center + (x - cameraX) * zoom, Y = y => waterline - y * zoom;
    function resize() { width = innerWidth; height = innerHeight; dpr = Math.min(devicePixelRatio || 1, 1.5); canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr); }
    function path(points, fill, stroke, lineWidth = 1) { ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); } }
    function line(x1, y1, x2, y2, color, size = 1) { ctx.strokeStyle = color; ctx.lineWidth = size; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    function rect(x, y, w, h, color, radius = 0) { ctx.fillStyle = color; if (radius) { ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fill(); } else ctx.fillRect(x, y, w, h); }
    function circle(x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    function text(label, x, y, size, color, align = 'left', font = 'Arial') { ctx.font = `${size}px ${font}`; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(label, x, y); }
    function ellipse(x, y, rx, ry, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill(); }
    function cloud(x, y, scale, opacity) {
      ctx.save(); ctx.globalAlpha = opacity; ctx.translate(x, y); ctx.scale(scale, scale);
      ctx.fillStyle = '#fcfbed'; ctx.beginPath(); ctx.moveTo(-80, 5); ctx.bezierCurveTo(-85,-8,-68,-17,-52,-12); ctx.bezierCurveTo(-56,-38,-13,-46,0,-22); ctx.bezierCurveTo(20,-43,55,-26,54,-11); ctx.bezierCurveTo(79,-22,94,-3,82,8); ctx.bezierCurveTo(30,17,-35,13,-80,5); ctx.fill(); ctx.restore();
    }
    function scenery(s) {
      const sky = ctx.createLinearGradient(0,0,0,waterline); sky.addColorStop(0,'#96ccd8'); sky.addColorStop(.6,'#d7e8e1'); sky.addColorStop(1,'#f0eee1'); rect(0,0,width,height,sky);
      circle(width * .79, height * .23, 62, '#fff5d41d'); circle(width * .79, height * .23, 44, '#fff5d42a'); circle(width * .79,height * .23,29,'#fff2ce');
      for (let i = -1; i < 7; i++) { const x = i * 260 - (cameraX * .025 + s.time * 1.7) % 260; cloud(x, height * (.19 + rand(i + 15) * .12), .7 + rand(i + 7) * .7, .5); }
      const horizon = waterline - 39 * zoom;
      for (let layer = 0; layer < 3; layer++) {
        const base = horizon - (2-layer) * 31 * zoom;
        const pts = [[-20,horizon+40]];
        for (let x = -20; x <= width+25; x += 9) {
          const u = x + cameraX * (.028 + layer * .035);
          const ridge = Math.sin(u * .0038 + layer * 1.7) * .55 + Math.sin(u * .008 + layer) * .25 + Math.cos(u*.014) * .08;
          pts.push([x, base - (50 + ridge * 64) * zoom * (1 - layer*.19)]);
        }
        pts.push([width+25,horizon+40]); path(pts,['#adc8cc','#96b6ba','#7fa6a5'][layer]);
        if (!layer) { ctx.save(); ctx.beginPath(); pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.clip(); const snow = [[-20,0],[width+25,0]]; for(let x=width+25;x>=-20;x-=9)snow.push([x,base-62*zoom+Math.sin((x+cameraX*.028)*.015)*8*zoom]);path(snow,'#e4ece4');ctx.restore(); }
      }
      // A quiet ribbon of coastal houses, evergreens, and a lighthouse moves in parallax.
      const offset = cameraX * .19, start = Math.floor((offset - 100) / 58);
      for (let i = start; i < start + Math.ceil(width/58) + 5; i++) {
        const x = i * 58 - offset, base = horizon + 13 * zoom, r = rand(i + 600), h = (20+r*25)*zoom;
        if (r < .55) {
          rect(x,base-h,29*zoom,h,['#ddd3bb','#b4cac2','#e6dfcc'][Math.abs(i)%3]); path([[x-4*zoom,base-h],[x+14*zoom,base-h-14*zoom],[x+33*zoom,base-h]],'#738e8d');
          for(let w=0;w<3;w++)rect(x+(4+w*9)*zoom,base-h+8*zoom,4*zoom,7*zoom,'#8fa5a0');
        } else { line(x,base,x,base-h,'#698a83',2*zoom); for(let t=0;t<3;t++)path([[x,base-h-8*zoom+t*10*zoom],[x-(10+t*2)*zoom,base-5*zoom+t*2*zoom],[x+(10+t*2)*zoom,base-5*zoom+t*2*zoom]],'#729a8e'); }
      }
      const lx = width*.82-cameraX*.07%width;
      path([[lx-8*zoom,horizon+16*zoom],[lx-5*zoom,horizon-53*zoom],[lx+7*zoom,horizon-53*zoom],[lx+12*zoom,horizon+16*zoom]],'#e5e4cf');rect(lx-9*zoom,horizon-54*zoom,20*zoom,13*zoom,'#5d8182');path([[lx-12*zoom,horizon-54*zoom],[lx+zoom,horizon-67*zoom],[lx+14*zoom,horizon-54*zoom]],'#b6775d');circle(lx+zoom,horizon-48*zoom,3*zoom,'#ffe6a2');
      const haze=ctx.createLinearGradient(0,horizon-40*zoom,0,waterline+20);haze.addColorStop(0,'#dae7dc00');haze.addColorStop(1,'#c1dace');rect(0,horizon-40*zoom,width,100*zoom,haze);
      for(let i=0;i<7;i++){const x=((i*217+s.time*(6+i%3)-cameraX*.06)%(width+90)+width+90)%(width+90)-45,y=height*(.27+rand(i+9)*.14);ctx.strokeStyle='#678d8c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-7,y-2);ctx.quadraticCurveTo(x-3,y-5-Math.sin(s.time*3+i)*2,x,y);ctx.quadraticCurveTo(x+4,y-5-Math.sin(s.time*3+i)*2,x+8,y-2);ctx.stroke();}
    }
    function waterPath(s, offset=0) { ctx.beginPath(); ctx.moveTo(-15,height+10); for(let px=-15;px<=width+15;px+=9)ctx.lineTo(px,Y(Tide.sea(s,cameraX+(px-center)/zoom))+offset);ctx.lineTo(width+15,height+10);ctx.closePath(); }
    function ocean(s, foreground=false) {
      waterPath(s);
      if(foreground){ctx.fillStyle='#177b8825';ctx.fill();}
      else{const g=ctx.createLinearGradient(0,waterline-150*zoom,0,height);g.addColorStop(0,'#64b5ad');g.addColorStop(.36,'#328f92');g.addColorStop(1,'#164b63');ctx.fillStyle=g;ctx.fill();}
      ctx.save(); waterPath(s);ctx.clip();
      if(!foreground){
        const light=ctx.createLinearGradient(0,waterline,0,height);light.addColorStop(0,'#d9f3c91a');light.addColorStop(1,'#d9f3c900');
        for(let i=-1;i<9;i++){const x=i*190-cameraX*.15%190;path([[x,waterline-180],[x+60,waterline-180],[x-65,height],[x-160,height]],light);}
        for(let i=0;i<50;i++){const x=(rand(i+21)*width-cameraX*.07%width+width)%width,y=waterline+25+rand(i+71)*(height-waterline);circle(x,y,rand(i+81)*1.1+.4,'#b8e4d72a');}
      }else{
        for(let row=0;row<7;row++){
          const y=waterline+24+row*29*zoom;
          for(let j=-2;j<Math.ceil(width/110)+2;j++){
            const x=j*110+Math.sin(row*2)*40-(cameraX*.6-s.time*(row+3)*3)%110;
            ctx.strokeStyle=row%2?'#8bd2c21d':'#a8dfc52a';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y+Math.sin(x*.018+s.time)*4);ctx.quadraticCurveTo(x+20,y-4,x+42,y);ctx.stroke();
          }
        }
      }
      ctx.restore();
      ctx.strokeStyle=foreground?'#d8f3dfb0':'#95d7c8';ctx.lineWidth=foreground?1.3:3;ctx.beginPath();for(let px=-10;px<=width+10;px+=8){const y=Y(Tide.sea(s,cameraX+(px-center)/zoom));px===-10?ctx.moveTo(px,y):ctx.lineTo(px,y);}ctx.stroke();
      if(foreground)for(const w of s.waves){const wx=X(w.x);if(wx< -200||wx>width+200)continue;const wy=Y(Tide.sea(s,w.x));ctx.strokeStyle='#e8f4dfc0';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(wx-w.width*zoom*.55,wy+28*zoom);ctx.quadraticCurveTo(wx,wy-11*zoom,wx+w.width*zoom*.42,wy+18*zoom);ctx.stroke();for(let i=0;i<10;i++){const spread=(rand(i+w.id)*2-1)*w.width*.7;circle(wx+spread*zoom,wy+(rand(i+5)*20-8)*zoom,1.1*zoom,'#edf8e8b0');}}
    }
    function container(x,y,color) { rect(x,y,46,31,color,1);rect(x+1,y+2,44,3,'#ffffff22');for(let i=0;i<7;i++)line(x+4+i*6,y+5,x+4+i*6,y+28,'#142f3b28');rect(x+33,y+8,9,4,'#ecdfbe99');rect(x+3,y+3,2,25,'#122b3320'); }
    function person(x,y,color='#e1ad65',scale=1) { ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);circle(0,-15,3,'#d6b38f');line(0,-11,0,-4,color,5);line(-1,-4,-3,1,'#345b66',2);line(1,-4,4,1,'#345b66',2);ctx.restore(); }
    function harbor(s,destination) {
      const world=destination?s.destination:s.source,xx=X(world),yy=waterline;
      if(xx < -650*zoom || xx>width+650*zoom)return;
      ctx.save();ctx.translate(xx,yy);ctx.scale(zoom,zoom);
      const side=destination?1:-1;
      // Timber quay, rubber fenders, bollards, and a warehouse behind the berth.
      rect(-310,1,620,17,'#718e88');rect(-310,1,620,4,'#b3b79c');
      for(let i=-300;i<=300;i+=45){rect(i,18,9,57,'#456e70');line(i+1,24,i+7,70,'#75938b',1);circle(i+4,6,6,'#304e53');rect(i+1,-7,6,10,'#344e50');}
      for(let i=-310;i<310;i+=20)line(i,2,i,14,'#385e612f');
      const bx=side<0?-310:190;
      rect(bx,-90,115,90,'#d0d1bd');path([[bx-10,-90],[bx+57,-123],[bx+125,-90]],'#718f8a');rect(bx+30,-42,54,43,'#8ba29a');
      for(let i=0;i<5;i++)line(bx+32,-37+i*7,bx+82,-37+i*7,'#aabaae');for(let i=0;i<3;i++)rect(bx+15+i*35,-76,18,17,'#769393',2);
      rect(bx+17,-56,78,12,'#f1e4c8');text(destination?'NORTHSTAR':'WESTHAVEN',bx+56,-47,8,'#537471','center');
      const cx=destination?240:-250;
      rect(cx-7,-178,14,177,'#bdaa72');line(cx-4,-169,cx+4,-5,'#f0db99',2);rect(cx-18,-180,260,10,'#c5b57c');
      line(cx,-185,cx+175,-175,'#597e7b',2);line(cx,-185,cx,-215,'#597e7b',3);line(cx,-215,cx+175,-175,'#597e7b');
      for(let i=0;i<7;i++)path([[cx+15+i*28,-179],[cx+28+i*28,-170],[cx+42+i*28,-179]],null,'#7c8d76',1);
      line(cx-21,-178,cx-21,-122,'#577774',1);rect(cx-33,-122,23,18,'#9ca799',2);
      let hookX=cx+135,hookY=-54;
      if(s.stage==='loading'&&!destination&&s.vessel==='cargo'&&s.load>0&&s.load<1){const f=s.load*6%1;hookX=-185+Math.min(1,f*1.6)*215;hookY=-108+Math.max(0,f-.6)*140;}
      line(hookX,-170,hookX,hookY,'#516f6b',1);line(hookX-3,hookY,hookX+3,hookY+4,'#263f46',2);
      if(s.vessel==='cargo'&&((s.stage==='loading'&&s.load>0&&s.load<1&&!destination)||(destination&&s.unload>0&&s.unload<1)))container(hookX-23,hookY+4,'#d99d54');
      for(let i=0;i<3;i++)container((destination?-290:-185)+i*47,-33,['#ac7860','#648f89','#bea46b'][i]);
      const signX=destination?-250:250;rect(signX-2,-102,4,103,'#75928a');rect(signX-50,-102,100,25,'#f0ebd4',2);text(destination?'NORTHSTAR PIER':'WESTHAVEN DOCK',signX,-87,8,'#3a6668','center');
      if(s.vessel==='cruise')for(let i=0;i<6;i++){const moving=s.stage==='loading'&&!destination?s.load*6%1:0;person(-135+i*20+moving*15,-17,['#ba7959','#6c9c93','#e2b66c'][i%3],.85);}
      ctx.restore();
      if(destination&&s.stage==='sailing'&&Math.abs(s.ship.x-world)<750){ctx.save();ctx.setLineDash([6,6]);ctx.strokeStyle='#e5edbbaa';ctx.lineWidth=2;ctx.strokeRect(X(world-115),waterline+42*zoom,230*zoom,19*zoom);ctx.restore();text('SLOW / HOLD E TO DOCK',X(world),waterline+86*zoom,9*zoom,'#b6ded2','center');}
    }
    function ship(s) {
      const x=X(s.ship.x),y=Y(s.ship.y),v=s.vessel;
      ctx.save();ctx.translate(x,y);ctx.rotate(-s.ship.angle);ctx.scale(zoom,zoom);
      // Engine exhaust and a small wind-tossed flag, both drawn from simulation time.
      if(s.ship.engine&&Math.abs(s.ship.vx)>3)for(let i=0;i<13;i++){const age=(s.time*1.25+i/2)%6;circle(-94-age*19,-112-age*8+Math.sin(age+i)*2,3+age*2,`rgba(66,84,83,${Math.max(0,.15-age*.025)})`);}
      if(v==='cargo'){
        ctx.fillStyle='#253f4c';ctx.beginPath();ctx.moveTo(-154,-24);ctx.lineTo(148,-29);ctx.quadraticCurveTo(168,-30,151,-4);ctx.quadraticCurveTo(137,24,108,30);ctx.lineTo(-126,30);ctx.quadraticCurveTo(-149,23,-154,-24);ctx.fill();
        path([[-150,4],[146,4],[131,25],[110,31],[-124,31],[-143,21]],'#ad6554');line(-152,-20,151,-25,'#f4d5a2',3);line(-145,0,146,-4,'#9db3a5',1);
        rect(-139,-72,58,45,'#e2ddc6',2);rect(-130,-98,52,29,'#eae4d1',2);rect(-135,-101,65,5,'#43646a',1);
        for(let i=0;i<4;i++){rect(-126+i*12,-93,9,13,'#567e84',1);line(-125+i*12,-92,-121+i*12,-82,'#c6e2d066',1);}
        rect(-135,-57,15,25,'#77908c',1);circle(-123,-43,1,'#e7d9b5');rect(-94,-66,9,14,'#67858a');rect(-115,-121,14,20,'#45626c',1);rect(-115,-118,14,6,'#c57553');
        rect(-88,-131,3,30,'#6c8686');line(-104,-119,-70,-119,'#5c7d7d');line(-87,-132,-87,-146,'#446a73');
        for(let i=0;i<Math.max(0,Math.round(s.onboard)-Math.floor(s.unload*6));i++)container(-70+(i%3)*49,-57-Math.floor(i/3)*33,['#d5a45c','#728f89','#bc785f','#7a9a9c','#c5b17b','#ba7c63'][i]);
        // Deck gun rotates toward the cursor; ammunition is unlimited.
        ellipse(98,-31,14,5,'#a7b5a5');ctx.save();ctx.translate(98,-37);ctx.rotate(-s.ship.gunAngle);rect(0,-3,25,6,'#4c6a6d',2);rect(20,-4,8,8,'#334f56',2);ctx.restore();circle(98,-37,7,'#587675');
        for(let i=0;i<7;i++){circle(-140+i*43,-15,7,'#1d3541');circle(-140+i*43,-15,3,'#47636a');}
        text('WAYFARER',48,0,8,'#e4ddc2');
      }else{
        ctx.fillStyle='#e7e6d5';ctx.beginPath();ctx.moveTo(-168,-36);ctx.lineTo(170,-36);ctx.quadraticCurveTo(176,-25,149,11);ctx.quadraticCurveTo(137,28,108,31);ctx.lineTo(-131,31);ctx.quadraticCurveTo(-155,27,-168,-36);ctx.fill();
        path([[-160,-7],[160,-9],[141,17],[110,30],[-130,30],[-150,17]],'#294f5c');path([[-151,15],[143,15],[131,26],[110,32],[-127,32]],'#bb765d');line(-159,-9,162,-11,'#c1b375',2);
        for(let deck=0;deck<3;deck++){
          const xx=-142+deck*16,ww=275-deck*21,yy=-57-deck*23;
          rect(xx,yy,ww,23,'#efeee0',3);rect(xx-3,yy+19,ww+6,3,'#9cb7b1');
          for(let w=0;w<Math.floor(ww/14)-1;w++){rect(xx+7+w*14,yy+6,8,9,'#5f9299',2);rect(xx+8+w*14,yy+7,3,3,'#b3d6cd');}
          line(xx,yy+3,xx+ww,yy+3,'#faf6df',2);
        }
        rect(-85,-116,77,14,'#dfe5d4',2);rect(-80,-128,16,14,'#446c76',2);rect(-57,-128,16,14,'#446c76',2);rect(-80,-125,16,5,'#ce825b');rect(-57,-125,16,5,'#ce825b');
        ellipse(55,-104,27,6,'#4d99a7');ellipse(55,-105,23,4,'#8ad3cb');rect(114,-92,36,23,'#e8e9db',2);path([[116,-87],[147,-85],[144,-76],[116,-76]],'#4b7e86');
        circle(-6,-117,7,'#f1edda');rect(-8,-112,4,8,'#b1c8bd');line(10,-104,10,-144,'#5d8688',2);line(-5,-133,25,-133,'#648787');
        for(let i=0;i<3;i++){ellipse(-85+i*59,-45,22,8,'#c77952');rect(-104+i*59,-49,38,5,'#edaf72',2);line(-103+i*59,-53,-103+i*59,-39,'#6c8b89');line(-66+i*59,-53,-66+i*59,-39,'#6c8b89');}
        for(let i=0;i<18;i++)circle(-128+i*15,-24,2.5,'#668a90');text('SUNDANCER',80,3,8,'#dae5cf');
      }
      const len=s.spec.length/2;for(let i=-len+8;i<len-10;i+=18)line(i,-25,i,-35,'#a7bcb2',.8);line(-len+8,-35,len-10,-35,'#bdc9b8',.8);
      line(-len+15,-28,-len+15,-61,'#527778',1.5);path([[-len+15,-61],[-len+39,-57+Math.sin(s.time*3)*3],[-len+15,-48]],'#d58d65');
      if(!s.ship.engine){for(let i=0;i<4;i++)line(-100+i*11,-130-Math.sin(s.time*9+i)*3,-96+i*11,-138,'#e4a562',2);}
      if(s.ship.hull<45){ctx.globalAlpha=(45-s.ship.hull)/65;for(let i=0;i<8;i++){const a=(s.time+i*.7)%4;circle(-40+a*7,-50-a*16,5+a*2,'#34434a');}ctx.globalAlpha=1;}
      ctx.restore();
      // Surface wake trails behind the hull, growing with throttle.
      if(Math.abs(s.ship.vx)>4){const direction=Math.sign(s.ship.vx);for(let i=0;i<18;i++){const age=(s.time*1.8+i/5)%3;const wx=s.ship.x-direction*(s.spec.length/2+age*Math.abs(s.ship.vx)*.45);ellipse(X(wx),Y(Tide.sea(s,wx))+3*zoom,(4+age*5)*zoom,(1+age*.5)*zoom,`rgba(220,244,222,${.32-age*.09})`);}}
    }
    function pirate(s,p) {
      const front=Tide.sea(s,p.x+30),back=Tide.sea(s,p.x-30),angle=Math.atan2(front-back,60);
      ctx.save();ctx.translate(X(p.x),Y(p.y)+(p.sunk||0)*20*zoom);ctx.rotate(-angle+(p.sunk||0)*.18);ctx.scale(zoom,zoom);ctx.globalAlpha=1-(p.sunk||0)/2.5;
      path([[-43,-11],[48,-15],[36,8],[-31,11]],'#39464a');path([[-39,-3],[43,-7],[36,7],[-31,10]],'#b16f50');rect(-20,-32,28,20,'#707b71',3);rect(-13,-29,20,10,'#213e48',2);line(-24,-10,-24,-54,'#3e4e4c',2);
      path([[-24,-54],[4,-50+Math.sin(s.time*5)*2],[-24,-36]],'#293c43');circle(-17,-45,3,'#e8e0c3');rect(-19,-45,1,1,'#293c43');rect(-16,-45,1,1,'#293c43');person(20,-13,'#bb7052',.85);circle(-30,0,4,'#253d43');circle(13,-1,4,'#253d43');ctx.restore();
      if(p.hp>0){const py=Y(p.y)-68*zoom;rect(X(p.x)-29*zoom,py,58*zoom,4*zoom,'#234d54b0',1);rect(X(p.x)-29*zoom,py,58*zoom*p.hp/s.config.pirateHP,4*zoom,'#dd9970',1);if(p.boarding>5)text(`BOARDING ${Math.ceil(p.boarding)}%`,X(p.x),py-7*zoom,8*zoom,'#8f4f3a','center');}
    }
    function swimmer(s) {
      if(!s.swimmer)return;
      const sw=s.swimmer,x=X(sw.x),y=Y(Tide.sea(s,sw.x));
      ellipse(x,y+3*zoom,14*zoom,4*zoom,'#b5e3ca');ellipse(x,y-2*zoom,12*zoom,5*zoom,'#e69758');ellipse(x,y-2*zoom,6*zoom,2.5*zoom,'#427e83');circle(x,y-11*zoom,3.5*zoom,'#edc494');line(x,y-7*zoom,x-6*zoom,y-3*zoom,'#f4d1a0',2*zoom);line(x,y-6*zoom,x+7*zoom,y-13*zoom-Math.sin(s.time*6)*2,'#f4d1a0',2*zoom);
      const marker=Tide.clamp(x,60,width-60),my=Math.min(y-42*zoom,waterline-30*zoom);rect(marker-44,my-17,88,23,'#f5e9d7ed',3);text(`${x<30?'← ':x>width-30?'→ ':''}RESCUE · ${Math.ceil(sw.time)}s`,marker,my-2,9,'#a76a46','center');path([[marker-4,my+7],[marker+4,my+7],[marker,my+12]],'#f5e9d7ed');
      if(sw.progress>0){rect(marker-32,my-12,64*sw.progress,2,'#6a9c87');line(X(s.ship.x),Y(s.ship.y+6),x,y-3,'#e8d9a2',1.3);}
    }
    function effects(s,aim) {
      if(s.spray){
        for(const side of [-1,1]){
          const target=s.pirates.find(p=>p.hp>0&&Math.sign(p.x-s.ship.x)===side&&Math.abs(p.x-s.ship.x)<s.spec.length/2+340);
          const start={x:X(s.ship.x+side*(s.spec.length/2-20)),y:Y(s.ship.y+9)},end={x:X(target?target.x:s.ship.x+side*(s.spec.length/2+290)),y:Y(Tide.sea(s,target?target.x:s.ship.x+side*400))+4};
          ctx.strokeStyle='#b4e6e5a0';ctx.lineWidth=7*zoom;ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.quadraticCurveTo((start.x+end.x)/2,start.y-57*zoom,end.x,end.y);ctx.stroke();ctx.strokeStyle='#f2fff7cc';ctx.lineWidth=2*zoom;ctx.stroke();
          for(let j=0;j<9;j++){const t=(j/9+s.time*2)%1,px=(1-t)**2*start.x+2*(1-t)*t*(start.x+end.x)/2+t*t*end.x,py=(1-t)**2*start.y+2*(1-t)*t*(start.y-57*zoom)+t*t*end.y;circle(px,py+Math.sin(s.time*20+j)*2,1.8*zoom,'#eefbf1');}
          for(let j=0;j<9;j++)line(end.x+(rand(j+s.nextId)-.5)*25*zoom,end.y,end.x+(rand(j+s.nextId)-.5)*35*zoom,end.y-(6+rand(j+3)*15)*zoom,'#b5e8ddaa',1);
        }
      }
      for(const shot of s.shots){line(X(shot.px),Y(shot.py),X(shot.x),Y(shot.y),'#fff0b6',3*zoom);circle(X(shot.x),Y(shot.y),2*zoom,'#fff7dc');}
      for(const e of s.effects){for(let i=0;i<10;i++){const a=-Math.PI*i/9,r=e.age*70;const x=X(e.x)+Math.cos(a)*r*zoom,y=Y(e.y)+Math.sin(a)*r*zoom+e.age**2*90*zoom;circle(x,y,(2-e.age)*zoom,e.kind==='hit'?'#ffe0a3':'#d2f3df');}}
      if(s.vessel==='cargo'&&s.stage==='sailing'&&aim){const x=X(aim.x),y=Y(aim.y);ctx.strokeStyle='#f9edd4b0';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,10,0,TAU);ctx.stroke();line(x-16,y,x-6,y,'#f9edd4');line(x+6,y,x+16,y,'#f9edd4');line(x,y-16,x,y-6,'#f9edd4');line(x,y+6,x,y+16,'#f9edd4');}
    }
    function draw(s,mode='playing',aim=null) {
      ctx.setTransform(dpr,0,0,dpr,0,0);zoom=Tide.clamp(Math.min(width/1200,height/750),.57,1.3);center=width*(mode==='menu'&&width>560?.73:.49);waterline=height*(width<560?.49:height<500?.57:.58);cameraX=s.ship.x;
      scenery(s);ocean(s);harbor(s,false);harbor(s,true);
      // Navigation buoys are fixed to the route, making forward and reverse motion legible.
      const first=Math.floor((cameraX-center/zoom)/650);for(let i=first;i<first+Math.ceil(width/zoom/650)+2;i++){const bx=650*i+510;if(bx<650||bx>s.destination-450)continue;const xx=X(bx),yy=Y(Tide.sea(s,bx));path([[xx-6*zoom,yy],[xx+6*zoom,yy],[xx+4*zoom,yy-10*zoom],[xx-4*zoom,yy-10*zoom]],'#d69962');line(xx,yy-10*zoom,xx,yy-30*zoom,'#e5c491',2*zoom);circle(xx,yy-31*zoom,2*zoom,'#f5df9a');}
      for(const p of s.pirates)pirate(s,p);ship(s);ocean(s,true);swimmer(s);effects(s,aim);
      const storm=s.waves.some(w=>w.tsunami&&Math.abs(w.x-s.ship.x)<500);
      if(storm){rect(0,0,width,height,'#355e700d');for(let i=0;i<35;i++){const x=(rand(i+60)*width+s.time*90)%width,y=(rand(i+160)*height+s.time*210)%height;line(x,y,x-4,y+11,'#e0f1ed33',1);}}
    }
    resize(); return { resize, draw, worldFromScreen(x,y) { return { x: cameraX+(x-center)/zoom, y: (waterline-y)/zoom }; }, screenFromWorld(x,y) { return {x:X(x),y:Y(y)}; } };
  };
})();
