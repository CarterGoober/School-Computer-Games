import { handle } from './gateway.js';
// Public release: the operator's enable switch and all provider/account gates apply.
// GARAGE_AI_ENABLED=false remains the immediate server-side kill switch.
Deno.serve((request:Request)=>handle(request,(name:string)=>Deno.env.get(name)));
