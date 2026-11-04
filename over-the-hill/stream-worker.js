/* Deterministic fixed geography. Build and pack geometry away from the main thread. */
self.window=self;importScripts('world.js');
self.onmessage=({data:p})=>{const start=performance.now(),groups=AmberWorld.buildChunk(p.a,p.b,p.lod),transfer=[],normals=new Map();let vertices=0;
const groundNormal=(x,z)=>{const key=x+','+z;if(!normals.has(key)){const dx=(AmberWorld.height(x+1,z)-AmberWorld.height(x-1,z))/2,dz=(AmberWorld.height(x,z+1)-AmberWorld.height(x,z-1))/2,n=Math.hypot(dx,1,dz);normals.set(key,[-dx/n,1/n,-dz/n]);}return normals.get(key);};
for(const g of groups){if(!g.faces.length)continue;g.ground=g.faces[0].terrain===1;const pos=[],color=[],normal=[],uv=[],depth=[];
for(const f of g.faces){const ps=f.points,a=ps[0],b=ps[1],c=ps[2],ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];let nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz)||1;nx/=len;ny/=len;nz/=len;
 const hex=parseInt(f.color.slice(1),16),rgb=[hex>>16,(hex>>8)&255,hex&255].map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
 for(let i=1;i<ps.length-1;i++){const ids=(f.terrain===1||f.waterDepths)&&ny<0?[0,i+1,i]:[0,i,i+1];for(const j of ids){const q=ps[j];pos.push(...q);uv.push(q[0]*.05,q[2]*.05);depth.push(f.waterDepths?.[j]||.1);color.push(...(f.vertexColors?f.vertexColors[j].map(v=>v**2.2):rgb));if(f.terrain===1){normal.push(...groundNormal(q[0],q[2]));}else normal.push(nx,ny,nz);}}}
 vertices+=pos.length/3;g.packed={};for(const [key,array]of Object.entries({position:pos,color,normal,uv,waterDepth:depth})){const data=new Float32Array(array);g.packed[key]=data;transfer.push(data.buffer);}g.faces=[];
}
self.postMessage({key:p.key,groups,vertices,bytes:transfer.reduce((sum,b)=>sum+b.byteLength,0),ms:performance.now()-start},transfer);};
