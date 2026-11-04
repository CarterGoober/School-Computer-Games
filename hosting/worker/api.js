const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const sharedAPI=HillSession(AmberPhysics,{height,obstacles,nearest,spawnPoint,WORLD_ID});
let hostedScene=null;
async function api(request,env){const url=new URL(request.url),route=url.pathname.split('/').pop(),db=env.DB;if(!db)return json({error:'World storage unavailable'},503);if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json({error:'Same origin required'},403);
 if(route==='health')return json({world:WORLD_ID,storage:'D1',transport:'exchange',physics:'shared-rigid-120hz',transmission:'six-speed-manual',bounds:BOUNDS});
 if(!['join','input','snapshot','action','leave'].includes(route))return json({error:'Not found'},404);
 if(request.method!=='POST'&&route!=='snapshot')return json({error:'POST required'},405);
 let b={};if(request.method==='POST'){const raw=await request.text();if(raw.length>12000)return json({error:'Too large'},413);try{b=JSON.parse(raw);}catch{return json({error:'Invalid request'},400);}}else b.token=url.searchParams.get('token');
 const now=Date.now();let token=b.token;if(route==='join'&&!/^[a-f0-9]{48}$/.test(token||''))token=Array.from(crypto.getRandomValues(new Uint8Array(24)),v=>v.toString(16).padStart(2,'0')).join('');
 let id=null;if(route==='join'){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));id=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('').slice(0,12);}
 let legacy=null;if(route==='join'&&/^[a-f0-9]{48}$/.test(token||'')){const row=await db.prepare('SELECT car FROM hill_players WHERE token=?').bind(token).first();if(row)try{legacy=JSON.parse(row.car);}catch{}}
 for(let retry=0;retry<8;retry++){
  let row=await db.prepare('SELECT * FROM hill_shared_world WHERE id=1').first();if(!row){const initial=new sharedAPI.Session().state;await db.prepare('INSERT OR IGNORE INTO hill_shared_world (id,revision,state,updated) VALUES (1,0,?,?)').bind(JSON.stringify(initial),now).run();row=await db.prepare('SELECT * FROM hill_shared_world WHERE id=1').first();}
  const session=new sharedAPI.Session(JSON.parse(row.state),hostedScene);hostedScene=session.scene;
  try{session.advance(now);let player;
   if(route==='join')player=session.join(token,id,b,now,legacy);
   else if(route==='leave')session.leave(token,now);
   else{player=session.player(token);if(route==='input')session.input(token,b,now);else if(route==='action')session.action(token,b,now);}
   const result=await db.prepare('UPDATE hill_shared_world SET state=?,updated=?,revision=revision+1 WHERE id=1 AND revision=?').bind(JSON.stringify(session.state),now,row.revision).run();if(!result.meta.changes)continue;
   const snapshot=session.snapshot(Date.now());if(route==='join')return json({token,id:player.id,name:player.name,car:player.car,transport:'exchange',world:WORLD_ID,nextSeq:player.lastSeq+1,tick:snapshot.tick,snapshot});
   return json({...snapshot,ok:true});
  }catch(e){return json({error:e.message||'World unavailable'},e.status||500);}
 }
 return json({error:'World busy; retrying'},429);
}
