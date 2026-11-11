import { handle } from './gateway.js';
Deno.serve((request:Request)=>handle(request,(name:string)=>Deno.env.get(name)));
