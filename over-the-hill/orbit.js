/* Pointer orbit is independent of driving input, including simultaneous touches. */
window.HillOrbit=function(canvas,isPlaying){
 const state={yaw:0,elevation:.3,distance:21,auto:true,drag:null,last:0};
 canvas.addEventListener('pointerdown',e=>{if(!isPlaying()||e.button!==0||state.drag)return;state.drag={id:e.pointerId,x:e.clientX,y:e.clientY};state.last=performance.now();canvas.setPointerCapture(e.pointerId);e.preventDefault();});
 canvas.addEventListener('pointermove',e=>{if(state.drag?.id!==e.pointerId)return;state.yaw-=(e.clientX-state.drag.x)*.007;state.elevation=Math.max(.1,Math.min(1.2,state.elevation+(e.clientY-state.drag.y)*.005));state.drag.x=e.clientX;state.drag.y=e.clientY;state.last=performance.now();e.preventDefault();});
 const release=e=>{if(state.drag?.id===e.pointerId){state.drag=null;state.last=performance.now();}};for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,release);
 canvas.addEventListener('wheel',e=>{if(!isPlaying()||e.ctrlKey)return;e.preventDefault();state.distance=Math.max(6,Math.min(45,state.distance*Math.exp(Math.max(-300,Math.min(300,e.deltaY))*.002)));state.last=performance.now();},{passive:false});
 state.update=(dt,now)=>{if(state.auto&&!state.drag&&now-state.last>3000){const f=1-Math.exp(-2*dt);state.yaw-=Math.atan2(Math.sin(state.yaw),Math.cos(state.yaw))*f;state.elevation+=(.3-state.elevation)*f;}};
 state.cancel=()=>{state.drag=null;};return state;
};
