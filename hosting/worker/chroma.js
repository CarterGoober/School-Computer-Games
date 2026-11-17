// The original Node/WebSocket simulation remains on its own persistent server.
async function chromaRequest(request, env) {
 const unavailable=()=>Response.json({error:'Chroma Clash arena is not configured. A persistent Node/WebSocket server is required.'},{status:503,headers:{'Cache-Control':'no-store'}});
 if(!env.CHROMA_SERVER_ORIGIN)return unavailable();
 let base;try{base=new URL(env.CHROMA_SERVER_ORIGIN);if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash||base.origin===new URL(request.url).origin)return unavailable()}catch{return unavailable()}
 const incoming=new URL(request.url),path=incoming.pathname.slice('/chroma'.length);
 if(!path.startsWith('/api/')&&path!=='/ws')return new Response('Not found',{status:404});
 const target=new URL(path+incoming.search,base);
 try{return await fetch(new Request(target,request),{redirect:'manual'})}catch{return unavailable()}
}
