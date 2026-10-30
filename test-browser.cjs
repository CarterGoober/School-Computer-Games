'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8000';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 let submitMode='fail',submitted=[],queries=[];
 await context.route('https://gvurobdhsvcvdywdsgne.supabase.co/**',async route=>{
  const request=route.request();if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}});return;}
  const payload=request.postDataJSON();const headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  if(request.url().includes('submit_')){submitted.push(payload);await route.fulfill({status:submitMode==='fail'?503:200,headers,body:JSON.stringify(submitMode==='fail'?{message:'Temporarily unavailable'}:submitMode==='unconfirmed'?{}:{id:payload.p_id,created_at:new Date().toISOString()})});return;}
  queries.push(payload);await route.fulfill({status:200,headers,body:JSON.stringify({total:1,rating_count:1,average:4,entries:[{id:'local-fixture',username:'<img src=x onerror=alert(1)>',game:'basketball',kind:'review',rating:4,title:'<script>window.unsafe=true</script>',message:'A local browser fixture, never sent to the server.',created_at:'2026-10-30T12:00:00Z'}]})});
 });
 await page.goto(base+'/');await page.waitForFunction(()=>document.querySelector('#feedback-list article'));
 assert.equal(await page.locator('#feedback-list script,#feedback-list img').count(),0);assert.equal(await page.evaluate(()=>window.unsafe),undefined);
 assert.match(await page.locator('#feedback-average').innerText(),/4 \/ 5/);
 await page.selectOption('#feedback-game-filter','basketball');await page.selectOption('#feedback-kind-filter','bug');await page.waitForTimeout(150);assert(queries.some(q=>q.p_kind==='bug'&&q.p_game==='basketball'));
 await page.fill('[name=username]','Browser tester');await page.selectOption('[name=rating]','5');await page.fill('[name=title]','Local fixture');await page.fill('[name=message]','This is a local browser test only.');
 await page.click('#feedback-form [type=submit]');await page.waitForFunction(()=>document.querySelector('#feedback-status').textContent.includes('draft is still here'));assert.equal(await page.inputValue('[name=message]'),'This is a local browser test only.');
 await page.reload();assert.equal(await page.inputValue('[name=title]'),'Local fixture');submitMode='unconfirmed';await page.click('#feedback-form [type=submit]');await page.waitForFunction(()=>document.querySelector('#feedback-status').textContent.includes('did not confirm'));assert.equal(submitted[0].p_id,submitted[1].p_id);
 submitMode='success';await page.click('#feedback-form [type=submit]');await page.waitForFunction(()=>document.querySelector('#feedback-status').textContent.startsWith('Posted.'));assert.equal(await page.inputValue('[name=message]'),'');assert.equal(submitted[0].p_id,submitted[2].p_id);
 await page.evaluate(()=>{Progression.event('apex','browser-test',1,1000);});assert.match(await page.locator('.hub-shared-wallet').innerText(),/850 GARAGE POINTS/);
 for(const game of ['apex','drift','tide']){
  await page.goto(base+'/'+game+'.html');await page.waitForSelector('.p-wallet');await page.click('.p-wallet');assert.match(await page.locator('.g-balance').innerText(),/850/);assert.match(await page.locator('.g-balance').innerText(),/Garage Points/);await page.click('.g-close');assert.equal(await page.locator('canvas').count()>0,true);
 }
 await page.goto(base+'/basketball.html');
 // Observe the real simulation through wrappers injected by the test only.
 await page.evaluate(()=>{const step=RumblePhysics.step,press=RumblePhysics.press;window.testPresses=[];RumblePhysics.step=(s,dt)=>{window.testState=s;return step(s,dt);};RumblePhysics.press=(s,i)=>{window.testPresses.push(i);return press(s,i);};});
 await page.click('#start');await page.waitForTimeout(200);await page.keyboard.down('KeyW');await page.waitForTimeout(500);assert(await page.evaluate(()=>testState.players[0].held&&testState.players[0].arm>.15));await page.keyboard.up('KeyW');assert(await page.evaluate(()=>!testState.players[0].held));await page.keyboard.press('ArrowUp');assert.deepEqual(await page.evaluate(()=>testPresses),[0,1]);
 await page.keyboard.press('Escape');const frozen=await page.evaluate(()=>JSON.stringify(testState));await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>JSON.stringify(testState)),frozen);assert.match(await page.locator('#start').innerText(),/Resume/);await page.click('#start');await page.click('#pause');
 await page.selectOption('#mode','4');await page.waitForFunction(()=>testState.mode===4);await page.locator('#mode').blur();for(const key of ['KeyW','KeyR','KeyI','KeyP'])await page.keyboard.press(key);assert.deepEqual(await page.evaluate(()=>testPresses.slice(-4)),[0,1,2,3]);
 await page.evaluate(()=>{testState.scores[0]=4;RumblePhysics.score(testState,0);});await page.waitForTimeout(60);assert.match(await page.locator('#overlay').innerText(),/Sage wins/);await page.click('#start');assert.equal(await page.locator('#blue-score').innerText(),'0');
 await page.screenshot({path:'/tmp/garage-basketball-desktop.png',fullPage:true});
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});await mobile.route('https://gvurobdhsvcvdywdsgne.supabase.co/**',r=>r.abort());const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto(base+'/basketball.html');await phone.selectOption('#mode','4');await phone.click('#start');
 await phone.evaluate(()=>{const press=RumblePhysics.press;window.testPresses=[];RumblePhysics.press=(s,i)=>{testPresses.push(i);return press(s,i);};});
 const touch=phone.locator('#touch-controls button');for(let i=0;i<4;i++)await touch.nth(i).tap();assert.deepEqual(await phone.evaluate(()=>testPresses),[0,1,2,3]);
 // Actual simultaneous multi-touch through Chromium's input protocol.
 await touch.first().scrollIntoViewIfNeeded();const boxes=await Promise.all([touch.nth(0).boundingBox(),touch.nth(3).boundingBox()]);const cdp=await mobile.newCDPSession(phone);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:boxes.map((b,i)=>({x:b.x+b.width/2,y:b.y+b.height/2,id:i+1}))});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.deepEqual(await phone.evaluate(()=>testPresses.slice(-2)),[0,3]);
 assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight));await phone.screenshot({path:'/tmp/garage-basketball-mobile.png',fullPage:true});
 await phone.goto(base+'/');assert(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await phone.screenshot({path:'/tmp/garage-hub-mobile.png',fullPage:true});
 await page.goto(base+'/');await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);
 for(const game of ['basketball','apex','drift','tide']){await page.goto(base+'/'+game+'.html');assert(await page.locator('canvas').count()>0,game+' cached');}
 await page.goto(base+'/basketball.html');await page.click('#start');await page.keyboard.press('KeyW');assert(await page.locator('#overlay').isHidden());
 await page.goto(base+'/');await page.fill('[name=message]','Offline draft remains available.');await page.reload();assert.equal(await page.inputValue('[name=message]'),'Offline draft remains available.');
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS desktop/mobile browser: safe feedback rendering, filters, failed/unconfirmed/retried submissions, drafts, shared shops, 2/4-player keys, pause/win/restart, four touch buttons and simultaneous touch, layout, all games offline; upright basketball, hold/release controls and full-viewport layout');
})().catch(e=>{console.error(e);process.exit(1);});
