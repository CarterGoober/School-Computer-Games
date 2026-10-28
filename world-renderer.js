'use strict';
// Depth-tested 3D surfaces keep rising roads from painting over the vehicles.
// Canvas fallback remains available on devices without WebGL.
window.createWorldRenderer = function () {
 const canvas = document.createElement('canvas');
 const gl = canvas.getContext('webgl', {alpha:true, antialias:true, premultipliedAlpha:true});
 if (!gl) return null;
 let program, buffer, position, color, scale, available = true;
 function initialize() {
  function shader(type, source) {
   const value = gl.createShader(type);
   gl.shaderSource(value, source);
   gl.compileShader(value);
   if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error('3D shader compilation failed');
   return value;
  }
  const vertex = shader(gl.VERTEX_SHADER, `
   attribute vec3 position;
   attribute vec4 color;
   uniform vec2 scale;
   varying vec4 faceColor;
   void main() {
    float near = 0.7;
    float far = 1800.0;
    gl_Position = vec4(position.x * scale.x,
      position.y * scale.y + 0.02 * position.z,
      (far + near) / (far - near) * position.z - 2.0 * far * near / (far - near),
      position.z);
    faceColor = color;
   }`);
  const fragment = shader(gl.FRAGMENT_SHADER, `
   precision mediump float;
   varying vec4 faceColor;
   void main() { gl_FragColor = faceColor; }`);
  program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('3D shader linking failed');
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  buffer = gl.createBuffer();
  position = gl.getAttribLocation(program, 'position');
  color = gl.getAttribLocation(program, 'color');
  scale = gl.getUniformLocation(program, 'scale');
  available = true;
 }
 try { initialize(); } catch { return null; }
 canvas.addEventListener('webglcontextlost', event => {event.preventDefault(); available=false;});
 canvas.addEventListener('webglcontextrestored', () => {try {initialize();} catch {available=false;}});
 const colors = new Map();
 function rgba(hex) {
  if (colors.has(hex)) return colors.get(hex);
  const value=hex.slice(1), channels=value.length===3?value.split('').map(v=>parseInt(v+v,16)):value.match(/../g).map(v=>parseInt(v,16));
  const result=[channels[0]/255,channels[1]/255,channels[2]/255,(channels[3]??255)/255];
  colors.set(hex,result);
  return result;
 }
 return {
  draw(ctx, polygons, width, height, dpr) {
   if (!available || gl.isContextLost()) return false;
   const pixelWidth=Math.floor(width*dpr),pixelHeight=Math.floor(height*dpr);
   if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight;}
   gl.viewport(0,0,canvas.width,canvas.height);
   gl.clearColor(0,0,0,0);
   gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
   gl.useProgram(program);
   gl.enable(gl.DEPTH_TEST);
   gl.depthFunc(gl.LEQUAL);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
   gl.enableVertexAttribArray(position);
   gl.enableVertexAttribArray(color);
   gl.vertexAttribPointer(position,3,gl.FLOAT,false,28,0);
   gl.vertexAttribPointer(color,4,gl.FLOAT,false,28,12);
   const focal=Math.min(width,height)*.93;
   gl.uniform2f(scale,2*focal/width,2*focal/height);
   const solid=[],transparent=[];
   for(const p of polygons){const color=rgba(p.color);(color[3]<1?transparent:solid).push({points:p.cameraPoints,color,depth:p.depth});}
   function batch(faces){
    const data=[];
    for(const face of faces)for(let i=1;i<face.points.length-1;i++)for(const vertex of [face.points[0],face.points[i],face.points[i+1]])data.push(vertex.x,vertex.y,vertex.z,...face.color);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.TRIANGLES,0,data.length/7);
   }
   gl.depthMask(true);
   gl.disable(gl.BLEND);
   batch(solid);
   transparent.sort((a,b)=>b.depth-a.depth);
   gl.enable(gl.BLEND);
   gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
   gl.depthMask(false);
   batch(transparent);
   gl.depthMask(true);
   ctx.drawImage(canvas,0,0,width,height);
   return true;
  }
 };
};
