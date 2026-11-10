const base=require('./base.js');
function atService(p,id){const b=base.buildings.find(b=>b.id===id);p.car=null;Object.assign(p,{x:b.x+b.w/2,y:b.north?b.y+35:b.y+b.h-30});}
function deploy(w,p,b={},now=0){w.homeCar(p,p.cars.find(c=>c.id===b.car));p.x=1001;p.y=440;w.stepPlayer(p,.025,now,w.active(now))}
module.exports={atService,deploy};
