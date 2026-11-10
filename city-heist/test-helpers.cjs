const base=require('./base.js');
function atService(p,id){const b=base.buildings.find(b=>b.id===id);Object.assign(p,{x:b.x+b.w/2,y:b.y+b.h-30});}
function deploy(w,p,b={},now=0){atService(p,'deployment');w.action(p,{type:'deploy',...b},now)}
module.exports={atService,deploy};
