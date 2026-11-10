import {makeHandler} from './core.mjs';
Deno.serve(makeHandler({env:(key:string)=>Deno.env.get(key)}));
