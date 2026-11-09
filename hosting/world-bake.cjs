/* Build-time evaluation of the one fixed world. Runtime receives identical IEEE float data. */
'use strict';const vm=require('node:vm');
function leanWorld(source){const start=source.indexOf('const clamp='),end=source.indexOf('let groups=[]');if(start<0||end<=start)throw Error('Fixed-world module boundaries changed');return source.slice(start,end);}
function bootWorld(lean,baked){const context=vm.createContext({Float32Array,Uint8Array,atob,performance,__ASHEN_FIXED_WORLD__:baked}),start=process.cpuUsage();vm.runInContext(lean+'\nglobalThis.result={WORLD_ID,BOUNDS,roads,route,landformGrid,rockProfiles,height,surface,nearest,spawnPoint};',context);const used=process.cpuUsage(start);return{world:context.result,cpuMs:(used.user+used.system)/1000};}
function bakeWorld(lean){const {world}=bootWorld(lean),g=world.landformGrid,encode=a=>Buffer.from(a.buffer,a.byteOffset,a.byteLength).toString('base64');return{world:world.WORLD_ID,roads:world.roads,route:world.route,rockProfiles:world.rockProfiles,landformGrid:{...g,extension:encode(g.extension),crown:encode(g.crown)}};}
module.exports={leanWorld,bootWorld,bakeWorld};
