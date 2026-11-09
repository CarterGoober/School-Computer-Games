/* Visual work budgets only. Physics and world geography never depend on this module. */
(function(root){'use strict';
function compactInstances(source,view,matrices,colors){
 const eye=view.eye,min=view.min||0,max=view.max??Infinity,planes=view.planes||[],shadow2=(view.shadowRadius||0)**2;let count=0;
 for(let i=0;i<source.count;i++){
  const j=i*4,x=source.bounds[j],y=source.bounds[j+1],z=source.bounds[j+2],r=source.bounds[j+3],dx=x-eye.x,dz=z-eye.z,d2=dx*dx+dz*dz;
  if(d2>(max+r)**2||min>r&&d2<(min-r)**2)continue;
  let visible=true;if(!shadow2||d2>shadow2){const margin=r+Math.sqrt(d2)*.04;for(let p=0;p<planes.length;p+=4)if(planes[p]*x+planes[p+1]*y+planes[p+2]*z+planes[p+3]<-margin){visible=false;break;}}
  if(!visible)continue;
  for(let k=0;k<16;k++)matrices[count*16+k]=source.matrices[i*16+k];
  if(colors&&source.colors)for(let k=0;k<3;k++)colors[count*3+k]=source.colors[i*3+k];count++;
 }
 return count;
}
class QualityController{
 constructor(){this.mode='auto';this.target=0;this.scale=1;this.effects=0;this.goal=60;this.frames=[];this.work=[];this.clock=0;this.sinceCheck=0;this.pressure=0;this.headroom=0;this.lastChange=0;this.lastEffect=0;}
 setMode(mode){this.mode=mode==='fixed'?'fixed':'auto';this.frames=[];this.work=[];this.pressure=this.headroom=0;if(this.mode==='fixed'){this.scale=1;this.effects=0;this.goal=this.target||60;}return this;}
 setTarget(fps){this.target=[30,60].includes(fps)?fps:0;this.goal=this.target||60;this.frames=[];this.work=[];this.pressure=this.headroom=0;}
 update(sample){if(sample.hidden){this.frames=[];this.work=[];this.pressure=this.headroom=0;return this;}if(this.mode==='fixed'){this.scale=1;this.effects=0;this.goal=this.target||60;return this;}const frame=Number(sample.frameMs);if(!Number.isFinite(frame)||frame<=0)return this;const dt=Math.min(frame,250);this.clock+=dt;this.sinceCheck+=dt;const work=Math.max(Number(sample.cpuMs)||0,Number(sample.gpuMs)||0);this.work.push(work);this.frames.push(Math.max(frame,work));if(this.frames.length>21){this.frames.shift();this.work.shift();}if(this.sinceCheck<500||this.frames.length<5)return this;const elapsed=this.sinceCheck;this.sinceCheck=0;const sorted=this.frames.slice().sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)],target=1000/(this.target||this.goal);this.median=median;
 if(median>target*1.12){this.pressure+=elapsed;this.headroom=0;if(this.pressure>=1500&&this.clock-this.lastChange>=1000){this.scale=Math.max(.5,+(this.scale-.08).toFixed(2));this.lastChange=this.clock;}if(!this.target&&this.pressure>=3000&&this.scale<=.82)this.goal=30;const desired=this.scale<=.51&&this.pressure>6000?3:this.scale<=.67&&this.pressure>4500?2:this.scale<=.83&&this.pressure>3000?1:0;if(desired>this.effects){this.effects=desired;this.lastEffect=this.clock;}}
 else if(median<=target*1.04&&this.work.slice().sort((a,b)=>a-b)[Math.floor(this.work.length/2)]<target*.74){this.pressure=0;this.headroom+=elapsed;if(this.headroom>=8000&&this.clock-this.lastChange>=2000){this.scale=Math.min(1,+(this.scale+.04).toFixed(2));this.lastChange=this.clock;}if(this.headroom>=8000&&this.effects&&this.clock-this.lastEffect>=8000){this.effects--;this.lastEffect=this.clock;}if(!this.target&&this.scale===1&&this.effects===0&&this.headroom>16000&&median<18)this.goal=60;}
 else{this.pressure=Math.max(0,this.pressure-elapsed);this.headroom=0;}return this;
 }
}
function pixelRatio(device,preset,scale=1){const cap=Math.min(Number(device)||1,Number(preset)||1);return Math.max(Math.min(cap,.4),Math.min(cap,cap*scale));}
class GpuTimer{
 constructor(gl){this.gl=gl;this.ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');this.supported=!!(this.ext&&gl.beginQuery);this.pending=[];this.active=null;this.ms=null;this.updated=0;}
 begin(frame){this.poll();if(!this.supported||this.active||this.pending.length>=4||frame%7)return;try{this.active=this.gl.createQuery();this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT,this.active);}catch{this.supported=false;}}
 end(){if(!this.active)return;this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);this.pending.push(this.active);this.active=null;}
 poll(){if(!this.supported)return null;const gl=this.gl;if(gl.getParameter(this.ext.GPU_DISJOINT_EXT)){for(const q of this.pending)gl.deleteQuery(q);this.pending=[];this.ms=null;return null;}while(this.pending.length&&gl.getQueryParameter(this.pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=this.pending.shift();this.ms=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;this.updated=performance.now();gl.deleteQuery(q);}return this.ms;}
}
function distribution(values){values=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!values.length)return null;return{count:values.length,mean:values.reduce((a,b)=>a+b,0)/values.length,p50:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)],p99:values[Math.floor(values.length*.99)],max:values.at(-1)};}
class FrameRecorder{
 constructor(capacity=1800){this.capacity=capacity;this.frames=[];this.cursor=0;this.lastTime=null;this.work={};}
 record(frame){if(!Number.isFinite(frame.frameMs)||frame.frameMs<=0)return;const copy={...frame};if(this.frames.length<this.capacity)this.frames.push(copy);else{this.frames[this.cursor]=copy;this.cursor=(this.cursor+1)%this.capacity;}}
 addWork(key,value){if(Number.isFinite(value)&&value>=0)this.work[key]=(this.work[key]||0)+value;}
 capture(time,frame){if(this.lastTime!==null&&time>this.lastTime)this.record({...frame,...this.work,frameMs:time-this.lastTime});this.lastTime=time;this.work={};}
 suspend(){this.lastTime=null;this.work={};}
 recent(count){const n=Math.max(0,Math.min(this.frames.length,count));if(!n)return[];if(this.frames.length<this.capacity)return this.frames.slice(-n);const start=(this.cursor-n+this.capacity)%this.capacity;return start<this.cursor?this.frames.slice(start,this.cursor):this.frames.slice(start).concat(this.frames.slice(0,this.cursor));}
 report(metadata={}){const frames=this.frames.length<this.capacity?this.frames.slice():this.frames.slice(this.cursor).concat(this.frames.slice(0,this.cursor)),summary={};for(const key of ['frameMs','cpuMs','physicsMs','snapshotMs','renderMs','cullMs','uploadMs','streamMs','gpuMs','draws','triangles'])summary[key]=distribution(frames.map(f=>f[key]));return{format:'ashen-vale-performance-v1',capturedAt:new Date().toISOString(),metadata,summary,fps:summary.frameMs?1000/summary.frameMs.mean:null,frames};}
}
class FramePacer{constructor(){this.next=null;this.fps=null;}due(now,fps){fps=Math.max(1,Number(fps)||60);if(this.fps!==fps){this.next=null;this.fps=fps;}const period=1000/fps;if(this.next===null)this.next=now;if(now+.01<this.next)return false;this.next+=Math.max(1,Math.floor((now-this.next+.01)/period)+1)*period;return true;}}
function compactCommands(commands){const out=[];let start=0,last='';for(let i=0;i<=commands.length;i++){const signature=i<commands.length?JSON.stringify(commands[i].input):null;if(i>start&&(i===commands.length||signature!==last||commands[i].tick<commands[i-1].tick)){out.push(commands[start]);if(i-start>1)out.push(commands[i-1]);start=i;}last=signature;}return out;}
class LatestTask{constructor(){this.pending=null;}push(value){this.pending=value;}clear(){this.pending=null;}flush(fn){if(this.pending===null)return false;const value=this.pending;this.pending=null;fn(value);return true;}}
const api={compactInstances,QualityController,pixelRatio,GpuTimer,FrameRecorder,distribution,compactCommands,LatestTask,FramePacer};if(typeof module!=='undefined')module.exports=api;root.HillPerformance=api;
})(typeof window==='undefined'?globalThis:window);
