(function(root){
  'use strict';
  const minimumView=1.8,landingHold=.22,fadeDuration=.45,slowScale=.28;
  const smooth=t=>t*t*(3-2*t);
  function create(){return{phase:'idle',elapsed:0,landedFor:0,fade:0,blend:0,orbitTime:0,timeScale:1};}
  function reset(s){Object.assign(s,create());}
  function start(s){s.phase='hold';s.elapsed=0;s.landedFor=0;s.fade=0;s.timeScale=slowScale;if(s.blend<.01)s.orbitTime=0;}
  // This clock uses unscaled playing time. A short, fast jump gets the same
  // viewing window as any other jump, without changing its flight trajectory.
  function update(s,dt,airborne,enabled=true,playing=true){
    if(!enabled){reset(s);return;}
    if(!playing||s.phase==='idle')return;
    s.elapsed+=dt;s.orbitTime+=dt;
    if(s.phase==='hold'){
      s.landedFor=airborne?0:s.landedFor+dt;s.blend+=(1-s.blend)*(1-Math.exp(-dt*9));s.timeScale=slowScale;
      if(!airborne&&s.elapsed>=minimumView&&s.landedFor>=landingHold){s.phase='out';s.fade=0;s.exitBlend=s.blend;}
    }else{
      s.fade=Math.min(fadeDuration,s.fade+dt);const t=smooth(s.fade/fadeDuration);
      s.blend=s.exitBlend*(1-t);s.timeScale=slowScale+(1-slowScale)*t;
      if(s.fade>=fadeDuration)reset(s);
    }
  }
  const api={create,start,reset,update,minimumView,landingHold,fadeDuration,slowScale};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DriftCinema=api;
})(typeof window!=='undefined'?window:globalThis);
