/* One authoritative, persistent world. No accounts, room codes or hosted-by-player sessions. */
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const P=require('./physics.js'),W=require('./world.js');
const ROOT=path.resolve(__dirname,'..'),PORT=Number(process.env.PORT||8001),HOST=process.env.HOST||'0.0.0.0',DATA=path.resolve(process.env.WORLD_DATA||path.join(ROOT,'work','hill-world.json'));
const saved=new Map(),players=new Map();let dirty=false;
try{const raw=JSON.parse(fs.readFileSync(DATA,'utf8'));for(const p of raw.players||[])if(typeof p.token==='string'&&/^[a-f0-9]{48}$/.test(p.token)&&[p.x,p.z,p.heading].every(Number.isFinite)&&Math.abs(p.x)<=310&&p.z>=-140&&p.z<=530)saved.set(p.token,p);}catch(e){if(e.code!=='ENOENT')console.warn('World save unavailable; starting a fresh world.');}
function persist(){if(!dirty)return;fs.mkdirSync(path.dirname(DATA),{recursive:true});const data={version:1,world:'ashen-vale-v1',players:[...saved.values()].slice(-5000)};fs.writeFileSync(DATA+'.tmp',JSON.stringify(data));fs.renameSync(DATA+'.tmp',DATA);dirty=false;}
function remember(p){saved.set(p.token,{token:p.token,x:p.car.x,z:p.car.z,heading:p.car.heading});dirty=true;}
function pack(p){return{id:p.id,name:p.name,car:p.car};}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
function body(req){return new Promise((resolve,reject)=>{let text='';req.on('data',c=>{text+=c;if(text.length>2048){reject(Error('Too large'));req.destroy();}});req.on('end',()=>{try{resolve(JSON.parse(text));}catch{reject(Error('Invalid JSON'));}});req.on('error',reject);});}
const server=http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');
if(url.pathname==='/over-the-hill'){res.writeHead(308,{Location:'/over-the-hill/'});res.end();return;}
if(url.pathname==='/over-the-hill/api/health'){json(res,200,{world:'ashen-vale-v1',players:[...players.values()].filter(p=>p.stream).length,persistent:true});return;}
if(url.pathname.startsWith('/over-the-hill/api/')){
 // Same-origin input only. Browser clients never supply positions or velocities.
 if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`){json(res,403,{error:'Same-origin required'});return;}
 try{
 if(url.pathname.endsWith('/join')&&req.method==='POST'){const b=await body(req);let p=typeof b.token==='string'?players.get(b.token):null;if(!p){if(players.size>=40){json(res,503,{error:'The valley is full. Try again soon.'});return;}const old=saved.get(b.token),token=old?b.token:crypto.randomBytes(24).toString('hex');const n=players.size;const start=old||{x:(n%3-1)*2.5,z:-Math.floor(n/3)*6,heading:0};p={token,id:crypto.createHash('sha256').update(token).digest('hex').slice(0,12),name:'Explorer '+crypto.createHash('sha256').update(token).digest('hex').slice(0,4).toUpperCase(),car:P.spawn(W.height,start.x,start.z,start.heading),input:{},lastInput:0,lastSeen:Date.now(),stream:null};players.set(token,p);}p.lastSeen=Date.now();json(res,200,{id:p.id,token:p.token,car:p.car,world:'ashen-vale-v1'});return;}
 if(url.pathname.endsWith('/events')&&req.method==='GET'){const p=players.get(url.searchParams.get('token'));if(!p){json(res,401,{error:'Join again'});return;}p.stream?.end();p.stream=res;p.lastSeen=Date.now();res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 1500\n\n');res.write('data: '+JSON.stringify({players:[...players.values()].filter(v=>v.stream).map(pack)})+'\n\n');res.on('close',()=>{if(p.stream===res){p.stream=null;p.input={};p.car.speed=0;p.lastSeen=Date.now();remember(p);}});return;}
 if(url.pathname.endsWith('/input')&&req.method==='POST'){const b=await body(req),p=players.get(b.token);if(!p){json(res,401,{error:'Join again'});return;}const now=Date.now();if(now-p.lastInput<25&&!b.recover){json(res,429,{error:'Slow down'});return;}p.input={};for(const k of ['up','down','left','right','brake'])p.input[k]=b.input?.[k]===true;p.lastInput=now;p.lastSeen=now;p.park=b.park===true;if(p.park)p.car.speed=0;if(b.recover==='trailhead')p.car=P.spawn(W.height);else if(b.recover===true){const n=W.nearest(p.car.x,p.car.z,true);p.car=P.spawn(W.height,n.x,n.z,n.heading);}json(res,200,{ok:true});return;}
 json(res,404,{error:'Unknown endpoint'});return;
 }catch{if(!res.headersSent)json(res,400,{error:'Invalid request'});return;}}
if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400);res.end();return;}
if(pathname.includes('\0')){res.writeHead(400);res.end();return;}
if(pathname.endsWith('/'))pathname+='index.html';const target=path.resolve(ROOT,'.'+pathname),relative=path.relative(ROOT,target);const ext=path.extname(target).toLowerCase();const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
if(relative.startsWith('..')||relative.split(path.sep).some(p=>p.startsWith('.')||p==='work'||p==='node_modules')||!mime[ext]){res.writeHead(404);res.end('Not found');return;}
fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':mime[ext],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:data);});
});
let last=performance.now(),acc=0;const tick=setInterval(()=>{const now=performance.now();acc=Math.min(acc+(now-last)/1000,.1);last=now;while(acc>=1/60){for(const p of players.values())if(p.stream){if(p.park)p.car.speed=0;P.step(p.car,p.park?{brake:true}:Date.now()-p.lastInput<400?p.input:{brake:true},1/60,W.height,W.obstacles);}acc-=1/60;}},1000/60);
const broadcast=setInterval(()=>{const now=Date.now(),active=[...players.values()].filter(p=>p.stream),message='data: '+JSON.stringify({players:active.map(pack)})+'\n\n';for(const p of players.values()){if(p.stream){if(p.stream.writableLength>128*1024){p.stream.end();continue;}p.stream.write(message);remember(p);}else if(now-p.lastSeen>30000){remember(p);players.delete(p.token);}}},100);
const save=setInterval(()=>{try{persist();}catch(e){console.error('World save failed:',e.code);}},5000);
server.listen(PORT,HOST,()=>console.log(`Over the Hill shared world listening on ${HOST}:${PORT}; one Ashen Vale, authoritative 60 Hz, snapshots 10 Hz.`));
function shutdown(){clearInterval(tick);clearInterval(broadcast);clearInterval(save);for(const p of players.values()){remember(p);p.stream?.end();}try{persist();}catch(e){console.error('Final save failed:',e.code);}server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),2000).unref();}process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
