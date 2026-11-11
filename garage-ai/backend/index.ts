import { handle } from './gateway.js';
// Controlled validation release: student requests remain disabled regardless of secrets.
Deno.serve((request:Request)=>handle(request,(name:string)=>name==='GARAGE_AI_ENABLED'?'false':Deno.env.get(name)));
