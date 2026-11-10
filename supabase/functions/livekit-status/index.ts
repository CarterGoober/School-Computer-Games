import {makeHandler} from './core.mjs';
// Public GET reveals only configuration presence. POST validates the active owner via existing trusted RPC.
// No media tokens, capture, room creation, participant data or recording endpoint.
Deno.serve(makeHandler({env:(key:string)=>Deno.env.get(key)}));
