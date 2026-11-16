import {handle} from './gateway.mjs';
Deno.serve((request:Request)=>handle(request,(name:string)=>Deno.env.get(name)));
