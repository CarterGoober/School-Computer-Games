/* Small delivery state helpers. No transport mocks or authentication shortcuts. */
(function(root){'use strict';
class Outbox{
 constructor(uuid=()=>crypto.randomUUID()){this.uuid=uuid;this.pending=null;this.sending=false}
 begin(room,body,reply){if(this.sending)return null;const signature=JSON.stringify([room,body,reply||null]);if(this.pending?.signature!==signature)this.pending={room,body,reply:reply||null,signature,nonce:this.uuid()};this.sending=true;return this.pending}
 finish(ok,item=this.pending){if(item!==this.pending)return;this.sending=false;if(ok)this.pending=null}
 reset(){this.pending=null;this.sending=false}
}
function ordered(rows){return [...new Map(rows.map(row=>[String(row.id),row])).values()].sort((a,b)=>BigInt(a.id)<BigInt(b.id)?-1:BigInt(a.id)>BigInt(b.id)?1:0)}
function merged(history,rows){return ordered([...history,...rows])}
function authStorage(tabStorage,sharedStorage){const verifier='afterclass-chat-auth-code-verifier';const target=key=>key===verifier?sharedStorage:tabStorage;return{getItem:key=>target(key).getItem(key),setItem:(key,value)=>target(key).setItem(key,value),removeItem:key=>target(key).removeItem(key)}}
const api={Outbox,ordered,merged,authStorage};root.ChatDelivery=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
