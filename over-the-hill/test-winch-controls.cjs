'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');

// A DOM-only page runs the production UI; only its network boundary is controlled.
// Wrong anchors, input bubbling, premature attachment, or accepting the wrong request
// must change a user-visible result or an actual action payload below.
const markup=`<base href="http://winch.test/"><div id="parking-state"></div><div id="touch"><button data-key="brake"></button></div>
<div id="chat"><div id="chat-log"></div><form id="chat-form" hidden><input id="chat-input"><button>Send</button></form><div id="chat-error"></div></div>
<button id="people-toggle">People</button><section id="people-panel" hidden><button id="people-close">Close</button><div id="people-list"></div></section>
<button id="winch-toggle">Winch</button><section id="winch-panel" hidden><button id="winch-close">Close</button><select id="winch-end"><option>front</option><option>rear</option></select><select id="target-end"><option>rear</option><option>front</option></select><div id="tow-requests"></div><div id="winch-status"></div><button data-reel="-1">Reel in</button><button data-reel="1">Reel out</button><button id="winch-detach">Detach</button></section>
<div id="tow-prompt" hidden role="status"><span id="tow-prompt-text"></span><button id="tow-accept">Accept · Right Ctrl</button><button id="tow-decline">Decline</button></div>
<div id="player-labels"><button id="nameplate">Birch</button></div><textarea id="notes"></textarea><div id="editor" contenteditable="true" tabindex="0">Notes</div><div id="playfield" tabindex="0">Drive</div>`;

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  let page=await browser.newPage();const errors=[];
  async function reset(){
   await page.close();page=await browser.newPage();page.on('pageerror',error=>errors.push(error.message));
   await page.setContent(markup);
   await page.addScriptTag({content:`
    var $=selector=>document.querySelector(selector),connected=true,userToken='test-token',session='self',mode='playing',car={x:0,y:1,z:0,heading:0},remote=new Map(),netStats={rtt:20};
    var sentActions=[],receivedSnapshots=[],inputCount=0,clearCount=0,bubbledPointers=0,bubbledClicks=0,bubbledKeys=0,cables=[],pendingFetches=[];
    function sendInput(){inputCount++;}function clear(){clearCount++;}function showLocation(text){window.lastLocation=text;}
    function receiveSnapshot(data){receivedSnapshots.push(data);cables=data.cables||[];if(data.players)updateMultiplayer(data);}
    window.fetch=(url,options)=>{sentActions.push(JSON.parse(options.body));return new Promise(resolve=>pendingFetches.push(resolve));};
    window.finishAction=(ok,data)=>pendingFetches.shift()({ok,json:async()=>data});
    window.fixture=(extra={})=>({serverTime:10000,players:[{id:'self',name:'Amber',car:{x:0,y:1,z:0,heading:0}},{id:'peer',name:'Birch',car:{x:0,y:1,z:10,heading:0}}],requests:[],cables:[],chat:[],...extra});
    addEventListener('pointerdown',()=>bubbledPointers++);addEventListener('click',()=>bubbledClicks++);addEventListener('keydown',()=>bubbledKeys++);
   `});
   await page.addScriptTag({path:path.join(__dirname,'multiplayer-ui.js')});
   await page.evaluate(()=>{if(typeof wireNameplate==='function')wireNameplate($('#nameplate'),'peer');remote.set('peer',{label:$('#nameplate')});updateMultiplayer(fixture());});
  }
  async function actions(){return page.evaluate(()=>sentActions);}
  async function incoming(requests=[{id:'tow-1',a:'peer',b:'self',endA:'rear',endB:'front',expires:25000}]){await page.evaluate(requests=>updateMultiplayer(fixture({requests})),requests);}
  async function finish(data){await page.evaluate(data=>finishAction(true,fixture(data)),data);await page.waitForTimeout(0);}

  await reset();await page.click('#nameplate');
  assert.deepEqual(await actions(),[{token:'test-token',type:'towRequest',target:'peer',endA:'front',endB:'rear'}],'clicking a nameplate requests the bumpers facing one another');
  assert.equal(await page.evaluate(()=>bubbledPointers+bubbledClicks),0,'nameplate events do not reach driving or camera controls');
  assert.equal(await page.evaluate(()=>clearCount),1,'nameplate activation releases held driving controls');
  assert.deepEqual(await page.evaluate(()=>cables),[],'a request never creates a local cable');
  await finish({});
  await page.evaluate(()=>{car={x:0,y:1,z:0,heading:Math.PI};updateMultiplayer(fixture({players:[{id:'self',name:'Amber',car},{id:'peer',name:'Birch',car:{x:0,y:1,z:10,heading:Math.PI}}]}));});
  await page.click('#nameplate');assert.deepEqual((await actions()).at(-1),{token:'test-token',type:'towRequest',target:'peer',endA:'rear',endB:'front'});await finish({});
  await page.evaluate(()=>{car={x:0,y:1,z:0,heading:Math.PI/2};updateMultiplayer(fixture({players:[{id:'self',name:'Amber',car},{id:'peer',name:'Birch',car:{x:10,y:1,z:0,heading:-Math.PI/2}}]}));});
  await page.focus('#nameplate');await page.keyboard.press('Enter');assert.deepEqual((await actions()).at(-1),{token:'test-token',type:'towRequest',target:'peer',endA:'front',endB:'front'},'native keyboard activation uses car headings');await finish({});
  console.log('PASS nameplate click/keyboard facing anchors, isolated input and consent boundary');

  await reset();await page.evaluate(()=>updateMultiplayer(fixture({players:[{id:'self',name:'Amber',car},{id:'peer',name:'Birch',car:{x:0,y:1,z:21,heading:0}}]})));
  assert.equal(await page.locator('#nameplate').isDisabled(),true,'out-of-range labels cannot request');assert.match(await page.locator('#nameplate').getAttribute('aria-label'),/Birch.*21.*20/i);
  await page.evaluate(()=>updateMultiplayer(fixture({players:[{id:'self',name:'Amber',car}]})));assert.equal(await page.locator('#nameplate').isDisabled(),true,'departed players cannot receive requests');
  await reset();await page.evaluate(()=>connected=false);await page.click('#nameplate');assert.deepEqual(await actions(),[],'disconnected UI cannot emit tow requests');
  console.log('PASS range, departed-player and reconnect guards');

  await reset();await incoming();assert.equal(await page.locator('#tow-prompt').isVisible(),true);assert.match(await page.locator('#tow-prompt-text').innerText(),/Birch/);assert.equal(await page.locator('#winch-panel').isHidden(),true,'incoming tow leaves the large panel closed');
  await page.focus('#playfield');await page.keyboard.press('ControlLeft');assert.deepEqual(await actions(),[],'Left Ctrl never accepts');
  await page.keyboard.press('ControlRight');assert.deepEqual(await actions(),[{token:'test-token',type:'towReply',request:'tow-1',accept:true}]);
  assert.equal(await page.evaluate(()=>bubbledKeys),1,'Right Ctrl is consumed before the driving listener');
  assert.deepEqual(await page.evaluate(()=>cables),[],'acceptance waits for the API snapshot');
  await page.keyboard.press('ControlRight');assert.equal((await actions()).length,1,'one pending acceptance sends one request');
  await finish({cables:[{id:'cable-1',a:'peer',b:'self',owner:'peer',length:8,tension:0}]});assert.equal(await page.locator('#tow-prompt').isHidden(),true);assert.equal(await page.evaluate(()=>cables.length),1);
  console.log('PASS Right Ctrl-only consent, pending guard and authoritative attachment');

  await reset();await incoming();
  for(const selector of ['#chat-input','#notes','#winch-end','#editor']){
   await page.evaluate(selector=>{const element=document.querySelector(selector);if(selector==='#chat-input')document.querySelector('#chat-form').hidden=false;if(selector==='#winch-end')document.querySelector('#winch-panel').hidden=false;element.focus();},selector);
   await page.keyboard.press('ControlRight');
  }
  await page.evaluate(()=>{chatOpen=true;$('#playfield').focus();});await page.keyboard.press('ControlRight');assert.deepEqual(await actions(),[],'chat, inputs, selects and contenteditable ignore acceptance');
  await page.evaluate(()=>{chatOpen=false;mode='paused';});await page.keyboard.press('ControlRight');assert.deepEqual(await actions(),[],'paused game ignores the shortcut');
  console.log('PASS chat/form/paused keyboard isolation');

  await reset();await incoming([{id:'old',a:'peer',b:'self',endA:'rear',endB:'front',expires:24000},{id:'new',a:'peer',b:'self',endA:'front',endB:'front',expires:25000}]);
  await page.click('#tow-decline');assert.deepEqual((await actions()).at(-1),{token:'test-token',type:'towReply',request:'new',accept:false},'inline decline targets the newest request');await finish({});
  await incoming();await page.click('#tow-accept');assert.equal((await actions()).at(-1).accept,true,'touch-sized inline Accept uses consent API');await finish({});
  await incoming();await page.click('#winch-toggle');await page.getByRole('button',{name:'Accept',exact:true}).click();assert.equal((await actions()).at(-1).request,'tow-1','existing panel acceptance is retained');await finish({});
  await incoming();await page.evaluate(()=>updateMultiplayer(fixture({serverTime:26000,requests:[{id:'tow-1',a:'peer',b:'self',endA:'rear',endB:'front',expires:25000}]})));assert.equal(await page.locator('#tow-prompt').isHidden(),true,'expired snapshot requests cannot be offered');
  await incoming();await page.evaluate(()=>updateMultiplayer(fixture()));assert.equal(await page.locator('#tow-prompt').isHidden(),true,'snapshot removal clears the prompt');
  await incoming();await page.evaluate(()=>connected=false);await page.focus('#playfield');await page.keyboard.press('ControlRight');assert.equal((await actions()).length,3,'reconnect cannot accept stale consent');
  console.log('PASS latest request, decline, inline/panel touch acceptance and snapshot cleanup');

  await reset();await incoming([{id:'brief',a:'peer',b:'self',endA:'rear',endB:'front',expires:10300}]);
  await page.waitForTimeout(180);await page.click('#people-toggle');await page.waitForTimeout(180);
  assert.equal(await page.locator('#tow-prompt').isHidden(),true,'redrawing People does not extend the authoritative expiry clock');
  await page.focus('#playfield');await page.keyboard.press('ControlRight');assert.deepEqual(await actions(),[],'a locally expired request cannot be accepted between snapshots');
  console.log('PASS real-time expiry survives local panel redraws');

  await reset();await incoming();await page.click('#tow-accept');
  await page.evaluate(()=>finishAction(false,{error:'Vehicles moved out of range.'}));await page.waitForTimeout(0);
  assert.deepEqual(await page.evaluate(()=>cables),[],'rejected consent never creates a cable');assert.equal(await page.locator('#tow-accept').isEnabled(),true,'failed requests release the pending guard');assert.match(await page.locator('#chat-error').innerText(),/out of range/);
  await page.click('#tow-accept');assert.equal((await actions()).length,2,'an API error allows a fresh authoritative attempt');await finish({});
  console.log('PASS API rejection, no local attachment and retry');

  await reset();await page.click('#winch-toggle');await page.selectOption('#winch-end','rear');await page.selectOption('#target-end','front');await page.click('#people-toggle');await page.getByRole('button',{name:'Request tow',exact:true}).click();assert.deepEqual((await actions()).at(-1),{token:'test-token',type:'towRequest',target:'peer',endA:'rear',endB:'front'},'People preserves explicit anchor selection');await finish({});
  await page.focus('#playfield');await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>parkingBrake),false);await page.keyboard.down('e');assert.equal(await page.evaluate(()=>winchReel),-1);await page.keyboard.up('e');assert.equal(await page.evaluate(()=>winchReel),0);await page.keyboard.down('q');assert.equal(await page.evaluate(()=>winchReel),1);await page.keyboard.up('q');await page.keyboard.press('x');assert.equal((await actions()).at(-1).type,'towDetach');
  assert.deepEqual(errors,[]);console.log('PASS explicit anchor controls, parking, E/Q reel, X detach and no script errors');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
