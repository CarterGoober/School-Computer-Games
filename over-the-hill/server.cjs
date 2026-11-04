/* One authoritative rigid-body world; local Node deployment. */
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const P=require('./physics.js'),W=require('./world.js'),{Session}=require('./session.js')(P,W);
const ROOT=path.resolve(__dirname,'..'),PORT=Number(process.env.PORT||8001),HOST=process.env.HOST||'0.0.0.0',DATA=path.resolve(process.env.WORLD_DATA||path.join(ROOT,'work','hill-shared-world.json'));
let state=null;try{state=JSON.parse(fs.readFileSync(DATA,'utf8'));if(state.version!==2)state=null;}catch{}
const session=new Session(state);if(state)for(const p of Object.values({...state.players}))session.leave(p.token,Date.now());
try{const legacy=JSON.parse(fs.readFileSync(path.join(ROOT,'work','hill-world.json'),'utf8'));for(const p of legacy.players||[])if(!session.state.records[p.token])session.state.records[p.token]=p;}catch{}
function persist(){fs.mkdirSync(path.dirname(DATA),{recursive:true});fs.writeFileSync(DATA+'.tmp',JSON.stringify(session.state));fs.renameSync(DATA+'.tmp',DATA);}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>12000){reject(Error('Too large'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(raw));}catch{reject(Error('Invalid JSON'));}});req.on('error',reject);});}
const streams=new Map(),timings=[];
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/over-the-hill'){res.writeHead(308,{Location:'/over-the-hill/'});res.end();return;}
if(url.pathname.startsWith('/over-the-hill/api/')){if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`){json(res,403,{error:'Same-origin required'});return;}
try{const route=url.pathname.split('/').at(-1),now=Date.now();session.advance(now);
if(route==='health'){const sorted=timings.slice().sort((a,b)=>a-b);json(res,200,{world:W.WORLD_ID,players:Object.keys(session.state.players).length,persistent:true,physics:'shared-rigid-120hz',transmission:'six-speed-manual',bounds:W.BOUNDS,stepP95:sorted[Math.floor(sorted.length*.95)]||0});return;}
if(route==='events'){const token=url.searchParams.get('token'),p=session.player(token);streams.get(token)?.end();streams.set(token,res);res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 1000\n\n');res.write('data: '+JSON.stringify(session.snapshot(now))+'\n\n');res.on('close',()=>{if(streams.get(token)===res)streams.delete(token);});return;}
if(route==='snapshot'){session.player(url.searchParams.get('token'));json(res,200,session.snapshot(now));return;}
if(req.method!=='POST'){json(res,405,{error:'POST required'});return;}const b=await body(req);
if(route==='join'){const token=/^[a-f0-9]{48}$/.test(b.token||'')?b.token:crypto.randomBytes(24).toString('hex'),id=crypto.createHash('sha256').update(token).digest('hex').slice(0,12),p=session.join(token,id,b,Date.now()),snapshot=session.snapshot(Date.now());json(res,200,{id:p.id,token,name:p.name,car:p.car,world:W.WORLD_ID,transport:'sse',tick:snapshot.tick,nextSeq:p.lastSeq+1,snapshot});return;}
if(route==='input')session.input(b.token,b,Date.now());else if(route==='action')session.action(b.token,b,Date.now());else if(route==='leave'){session.leave(b.token,Date.now());streams.get(b.token)?.end();streams.delete(b.token);}else{json(res,404,{error:'Unknown endpoint'});return;}json(res,200,{...session.snapshot(Date.now()),ok:true});return;
}catch(e){if(!res.headersSent)json(res,e.status||400,{error:e.message});return;}}
if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
if(pathname.includes('\0')){res.writeHead(400);res.end();return;}
if(pathname.endsWith('/'))pathname+='index.html';const target=path.resolve(ROOT,'.'+pathname),relative=path.relative(ROOT,target);const ext=path.extname(target).toLowerCase();const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary','.webmanifest':'application/manifest+json'};
if(relative.startsWith('..')||relative.split(path.sep).some(p=>p.startsWith('.')||p==='work'||p==='node_modules')||!mime[ext]){res.writeHead(404);res.end('Not found');return;}
fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[ext],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:data);});
});
const tick=setInterval(()=>{const start=performance.now();session.advance(Date.now());timings.push(performance.now()-start);if(timings.length>600)timings.shift();},1000/120);
const broadcast=setInterval(()=>{const message='data: '+JSON.stringify(session.snapshot(Date.now()))+'\n\n';for(const [token,res]of streams){try{session.player(token);}catch{res.end();streams.delete(token);continue;}if(res.writableLength>128*1024){res.end();streams.delete(token);continue;}res.write(message);}},50);
const save=setInterval(()=>{try{persist();}catch(e){console.error('World save failed',e.code);}},5000);
server.listen(PORT,HOST,()=>console.log(`Over the Hill ONE shared rigid world at ${HOST}:${PORT}; 120 Hz / 20 Hz snapshots`));
function shutdown(){clearInterval(tick);clearInterval(broadcast);clearInterval(save);try{persist();}catch{}for(const res of streams.values())res.end();server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),1500).unref();}process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
