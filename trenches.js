(() => {
'use strict';
const P=TrenchesCore,D=TrenchesData,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let storage;try{storage=localStorage;}catch{storage={getItem(){return null;},setItem(){throw Error('Storage blocked');}};}
let data=D.load(storage),team=data.settings.team,mode=data.current&&data.current.phase!=='final'?data.current.mode:'season',state=null,meta=null,active=false,paused=false,last=0,accumulator=0,lastSave=0,previousPhase='',audio=null,crowd=null,pendingNewSeason=false,selectedWeek=null;
const art=TrenchesArt.create($('#field')),homeArt=TrenchesArt.create($('#home-preview')),uid=()=>globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
const arrow={ArrowLeft:'←',ArrowRight:'→',ArrowDown:'↓',ArrowUp:'↑'},drills={snap:'Snap timing',run:'Run blocking',pass:'Pass protection',blitz:'Blitz pickup',reaction:'Reaction drill'};
function set(selector,value){const e=$(selector),v=String(value);if(e.textContent!==v)e.textContent=v;}
function save(){if(state&&meta){data.current=state;data.currentMeta=meta;}const ok=D.save(data,storage);set('#save-status',ok?'':'Saving is unavailable. Progress will last only while this page stays open.');return ok;}
function grade(value){return value>=90?'A+':value>=80?'A':value>=70?'B':value>=60?'C':value>=45?'D':'F';}
function announce(value){set('#play-status',value);}
function audioReady(){
 if(!data.settings.sound)return;
 try{if(!audio){audio=new(window.AudioContext||window.webkitAudioContext)();const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),channel=buffer.getChannelData(0);for(let i=0;i<channel.length;i++)channel[i]=(Math.random()*2-1)*.08;crowd=audio.createBufferSource();crowd.buffer=buffer;crowd.loop=true;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=500;const gain=audio.createGain();gain.gain.value=.17;crowd.connect(filter).connect(gain).connect(audio.destination);crowd.start();}audio.resume();}catch{}
}
function tone(kind){if(!data.settings.sound)return;audioReady();if(!audio)return;const o=audio.createOscillator(),g=audio.createGain(),now=audio.currentTime;o.type=kind==='snap'?'square':'sine';o.frequency.setValueAtTime(kind==='snap'?180:kind==='whistle'?1500:660,now);o.frequency.exponentialRampToValueAtTime(kind==='snap'?70:900,now+.13);g.gain.setValueAtTime(.035,now);g.gain.exponentialRampToValueAtTime(.001,now+.2);o.connect(g).connect(audio.destination);o.start();o.stop(now+.21);}
function speak(){if(data.settings.voice&&'speechSynthesis'in window&&state){speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(state.call.code.split('').join(' ')+'! '+state.call.label);u.rate=1.05;speechSynthesis.speak(u);}}
function pause(value=true){if(!active)return;paused=value;$('#paused').hidden=!value;$('#pause').setAttribute('aria-label',value?'Resume game':'Pause game');$('#pause').textContent=value?'▶':'Ⅱ';accumulator=0;save();if(value){audio?.suspend();if('speechSynthesis'in window)speechSynthesis.cancel();}else audioReady();}
function fieldhouse(){active=false;paused=false;$('#home-screen').hidden=false;$('#game-screen').hidden=true;audio?.suspend();$('#paused').hidden=true;$('#result').hidden=true;$('#call-card').hidden=true;$('#reaction').hidden=true;$('#pause').disabled=true;$('#snap').disabled=true;$('#live-badge').innerHTML='<i></i> FIELD PREVIEW';save();updateMenu();}
function selectTeam(value){if(active)fieldhouse();team=value;selectedWeek=null;data.settings.team=value;save();updateMenu();}
function selectMode(value){if(active)fieldhouse();mode=value;updateMenu();}
function openPanel(id){if(active)pause();for(const dialog of $$('dialog[open]'))dialog.close();$('#'+id).showModal();}
function renderTimeline(season){
 const current=Math.min(7,season.week),viewed=selectedWeek??current,week=season.schedule[viewed];
 const timeline=$('#season-timeline');timeline.replaceChildren();
 season.schedule.forEach((w,i)=>{const button=document.createElement('button');button.dataset.week=i;button.className=(i===current&&!season.complete?'current ':'')+(w.result?'played ':'')+(i===viewed?'viewed':'');button.textContent=String(i+1).padStart(2,'0');button.setAttribute('aria-label','Week '+(i+1)+', '+w.name+(w.result?', '+w.result.result:'')+(i===current?', current week':''));button.setAttribute('aria-pressed',String(i===viewed));button.onclick=()=>{selectedWeek=i;updateMenu();};timeline.append(button);});
 set('#home-week',season.complete?'SEASON COMPLETE':viewed===current?'UP NEXT':'WEEK PREVIEW');
 set('#matchup-label','WEEK '+String(viewed+1).padStart(2,'0')+' / 08');
 set('#home-fixture',(week.home?'HOME':'AWAY')+(week.rivalry?' / RIVALRY':''));
 set('#opponent-name',mode==='quick'?'COPPER CREEK SCOUTS':mode==='scrimmage'?data.teams[team==='gold'?'navy':'gold'].name:mode==='practice'?drills[$('#drill').value]:week.name);
 set('#timeline-detail','WEEK '+(viewed+1)+' / '+(week.result?week.result.result+' '+week.result.score+'-'+week.result.against:week.rivalry?'RIVALRY / PRACTICE MATCHUP':'PRACTICE MATCHUP'));
 const previous=season.week?season.schedule[season.week-1].result:null;set('#previous-result',previous?previous.result+' '+previous.score+'-'+previous.against:'READY FOR KICKOFF');
}
function updateMenu(){
 for(const b of $$('[data-team]')){const on=b.dataset.team===team;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));}
 for(const b of $$('[data-mode]')){const on=b.dataset.mode===mode;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on));}
 set('#team-title',data.teams[team].name);
 const marks={wolf:'M12 12 29 21 40 16 51 21 68 12 63 47 51 60 40 69 29 60 17 47Z M20 28 35 34 27 41 M60 28 45 34 53 41 M30 47 40 61 50 47 40 51Z',star:'M40 8 49 29 73 31 55 47 60 71 40 58 20 71 25 47 7 31 31 29Z',mountain:'M7 66 29 22 42 43 53 26 73 66Z M20 40 29 22 39 40Z'};
 const mark=document.querySelector('.unit-mark svg');mark.replaceChildren();const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',marks[data.teams[team].emblem]);path.setAttribute('fill','none');path.setAttribute('stroke','currentColor');path.setAttribute('stroke-width','3');mark.append(path);
 const season=data.season?.team===team?data.season:null,s=season||D.newSeason(team,'');
 const canResume=data.current&&data.current.phase!=='final'&&data.current.team===team;
 const sameMode=canResume&&data.current.mode===mode;
 set('#start',sameMode?'CONTINUE →':mode==='season'?(season?.complete?'SEASON RESULTS →':'PLAY GAME →'):mode==='quick'?'QUICK GAME →':mode==='scrimmage'?'SCRIMMAGE →':'PRACTICE →');
 $('#start').disabled=false;$('#resume').hidden=!canResume||sameMode;
 set('#mode-open',({season:'FRESHMAN SEASON',quick:'QUICK GAME',scrimmage:'NAVY VS. GOLD',practice:'PRACTICE'})[mode]+' →');
 set('#privacy-label',data.settings.realNames?'PRIVATE NAMES / THIS BROWSER':'ALIASES ON / LOCAL SAVE');
 set('#preview-caption',team.toUpperCase()+' / FIELD CAM');
 const standings=$('#standings');standings.replaceChildren();
 for(const t of ['gold','navy']){const row=document.createElement('div');row.className='standing-row'+(t===team?' selected':'');const record=data.season?.team===t?data.season:t===team?s:null;for(const value of [t.toUpperCase(),record?.wins??'—',record?.losses??'—',record?.ties??'—']){const span=document.createElement('span');span.textContent=value;row.append(span);}standings.append(row);}
 set('#record-large',s.wins+' — '+s.losses+(s.ties?' — '+s.ties:''));set('#record-caption',s.complete?'FINAL SEASON RECORD':'YOUR SEASON RECORD');
 const average=s.stats.plays?s.stats.gradeTotal/s.stats.plays:null;set('#home-grade',average===null?'—':grade(average));set('#home-grade-detail',s.stats.plays?s.stats.plays+' SNAPS':'NO SNAPS YET');
 const chemistry=Math.min(99,Math.round(50+data.training[team]*4+(average===null?0:(average-60)*.4)));set('#chemistry',chemistry+'%');$('#chemistry-meter').style.width=chemistry+'%';
 set('#home-pancakes',s.stats.pancakes);set('#home-pickups',s.stats.pickups+' PICKUPS');set('#home-training','TRAINING +'+data.training[team].toFixed(1));
 $('#new-season').hidden=!season;renderTimeline(s);renderSchedule();
}
function renderSchedule(){
 const s=data.season?.team===team?data.season:D.newSeason(team,''),container=$('#schedule');container.replaceChildren();
 s.schedule.forEach((week,i)=>{const e=document.createElement('article');e.className='week-card'+(i===s.week&&!s.complete?' current':'');const top=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('small'),tag=document.createElement('em');top.append(document.createTextNode('WEEK '+String(i+1).padStart(2,'0')+' / '+(week.home?'HOME':'AWAY')));tag.textContent=week.rivalry?'RIVALRY':'';top.append(tag);strong.textContent=week.name;small.textContent=week.result?week.result.result+' · '+week.result.score+'–'+week.result.against+' · LINE '+grade(week.result.grade):i===s.week&&!s.complete?'UP NEXT · PRACTICE MATCHUP':'FICTIONAL PRACTICE MATCHUP';e.append(top,strong,small);container.append(e);});
 const record=$('#season-record');record.querySelector('b').textContent=s.wins+' — '+s.losses+(s.ties?' — '+s.ties:'');record.querySelector('span').textContent=s.complete?'FINAL RECORD · SEASON COMPLETE':s.ties?'WINS / LOSSES / TIES':'FRESHMAN SEASON';
 const stats=$('#season-stats');stats.replaceChildren();for(const [label,val]of [['LINE GRADE',s.stats.plays?grade(s.stats.gradeTotal/s.stats.plays):'—'],['RUSH / PASS YARDS',s.stats.yards],['PANCAKES',s.stats.pancakes],['BLITZ PICKUPS',s.stats.pickups]]){const span=document.createElement('span'),b=document.createElement('b');span.append(document.createTextNode(label+' '));b.textContent=val;span.append(b);stats.append(span);}
 const records=data.practice.filter(p=>p.team===team).slice(0,3);set('#practice-records','TRAINING BONUS +'+data.training[team].toFixed(1)+' / 8'+(records.length?' · RECENT DRILLS: '+records.map(p=>drills[p.drill]+' '+grade(p.grade)).join(' / '):' · PRACTICE TO BUILD YOUR UNIT'));
}
function startGame(force=false,newPractice=false){
 if(!force&&!newPractice&&data.current&&data.current.phase!=='final'&&data.current.team===team&&data.current.mode===mode){resume();return;}
 if(mode==='season'){
  if(data.season&&data.season.team!==team&&!force){pendingNewSeason=true;$('#restart-confirm p').textContent='Starting '+data.teams[team].name+' replaces your '+data.teams[data.season.team].name+' season and its saved game. Rosters, training and Garage Points stay saved.';openPanel('restart-confirm');return;}
  if(!data.season||data.season.team!==team||force){data.season=D.newSeason(team,uid());selectedWeek=null;}
  if(data.season.complete){openPanel('schedule-dialog');return;}
  const id=data.season.id+':'+data.season.week;
  if(data.current?.mode==='season'&&data.current.phase!=='final'&&data.currentMeta?.id===id){resume();return;}
  meta={id,opponent:data.season.schedule[data.season.week].name,completed:false};
 }else meta={id:uid(),opponent:mode==='scrimmage'?data.teams[team==='gold'?'navy':'gold'].name:mode==='practice'?drills[$('#drill').value]:'Copper Creek Scouts',completed:false};
 const ratings=D.lineup(data,team).map(p=>Object.fromEntries(D.SKILLS.map(k=>[k,Math.min(99,p[k]+data.training[team])])));
 state=P.create({team,mode,drill:$('#drill').value,ratings,seed:Date.now()});launch();
}
function launch(){for(const dialog of $$('dialog[open]'))dialog.close();$('#home-screen').hidden=true;$('#game-screen').hidden=false;active=true;paused=false;mode=state.mode;team=state.team;previousPhase='';$('#pause').disabled=false;$('#paused').hidden=true;accumulator=0;audioReady();save();updateMenu();sync();speak();}
function resume(){if(!data.current||data.current.phase==='final')return;state=data.current;meta=data.currentMeta;launch();}
function snap(){if(!active||paused)return;if(P.snap(state)){tone('snap');save();sync();}}
function input(key){
 if(!active||paused)return;
 if(state.phase==='presnap'){announce('Snap first with Space. Assignments only count after the snap.');set('#call-help','SNAP FIRST · SPACE');return;}
 if(state.phase!=='live')return;
 if(!state.assignment){if(P.assign(state,key)){set('#call-help',state.assignment.correct?'UNIT MOVING · WATCH FOR PRESSURE':'WRONG ASSIGNMENT · STAY IN THE PLAY');tone('input');}}
 else if(P.reinforce(state,key)){tone('input');announce('Protection reinforced.');}else if(state.prompt&&!state.prompt.done)announce('Wrong pickup. Read the pressure arrow.');
 sync();
}
function finish(){
 if(meta.completed)return;
 const average=state.stats.gradeTotal/Math.max(1,state.stats.plays);
 if(state.mode==='season')D.recordGame(data.season,state,meta.id);
 if(state.mode==='practice')D.practiceResult(data,state.team,state.drill,average,meta.id);
 // The shared wallet owns reward receipts; retries after a reload cannot double-credit.
 const earned=Progression.awardGarage('trenches',state.mode==='practice'?Math.round(average/5):40+Math.round(average/2),meta.id);
 meta.points=earned.total;meta.completed=true;save();renderSchedule();
}
function next(){
 if(!active)return;
 if(state.phase==='final'){fieldhouse();return;}
 if(P.nextPlay(state)){previousPhase='';sync();save();speak();}
}
function sync(){
 if(!active||!state)return;
 set('#score-team',data.teams[state.team].name.toUpperCase());$('#score-dot').style.background=data.teams[state.team].color;
 set('#score-opponent',state.mode==='practice'?'5-REP DRILL':meta.opponent.toUpperCase());set('#home-score',String(state.score).padStart(2,'0'));set('#away-score',String(state.opponentScore).padStart(2,'0'));
 set('#quarter',state.mode==='practice'?'REP '+Math.min(5,state.stats.plays+1)+'/5':'Q'+state.quarter);set('#clock',Math.floor(state.clock/60)+':'+String(Math.floor(state.clock%60)).padStart(2,'0'));
 set('#game-status',state.mode==='practice'?drills[state.drill].toUpperCase():state.phase==='final'?'FINAL WHISTLE':'FRESHMAN '+state.team.toUpperCase());
 set('#down-distance',['','1ST','2ND','3RD','4TH'][state.down]+' & '+state.toGo+' · '+(state.ball<=50?'OWN '+state.ball:'OPP '+(100-state.ball)));
 $('#call-card').hidden=!['presnap','live'].includes(state.phase);$('#snap').disabled=paused||state.phase!=='presnap';
 set('#call-code',state.call.code+' '+arrow[state.call.key]);set('#call-label',state.call.label);
 $('#meter-needle').style.left=state.meter*100+'%';$('#target-zone').style.left=(state.target-.078)*100+'%';$('#perfect-zone').style.left=(state.target-.024)*100+'%';
 set('#snap-status',state.snapGrade||'FIND YOUR RHYTHM');set('#meter-label',state.phase==='live'?'SNAP GRADE':'SNAP TIMING');
 $('#pressure-alert').hidden=state.blitz.type==='none'||!['presnap','live'].includes(state.phase);
 const p=state.prompt,show=state.phase==='live'&&p&&state.playTime<=p.expires;$('#reaction').hidden=!show;
 if(show){set('#reaction-label',p.label);set('#reaction-key',p.success?'✓ PICKUP':arrow[p.key]);$('#reaction').classList.toggle('success',!!p.success);$('#reaction-time').style.width=Math.max(0,(p.expires-state.playTime)/1.15)*100+'%';}
 if(state.phase!==previousPhase){
  previousPhase=state.phase;$('#live-badge').innerHTML='<i></i> '+(state.phase==='presnap'?'PRE-SNAP':state.phase==='live'?'BALL LIVE':'WHISTLE');
  if(state.phase==='presnap'){set('#call-help','Snap first. Then make your move.');$('#result').hidden=true;announce('QB calls '+state.call.code+'. '+state.call.label+'. Snap with Space.');}
  if(state.phase==='live')announce(state.snapGrade+' snap. Press '+arrow[state.call.key]+' for '+state.call.code+'.');
  if(['result','final'].includes(state.phase)){
   if(state.phase==='final')finish();tone('whistle');$('#result').hidden=false;
   const final=state.phase==='final',r=state.result||{kind:'FINAL',grade:0,yards:0};
   set('#result-kicker',final?(state.mode==='practice'?'DRILL COMPLETE':'FINAL / '+state.score+' — '+state.opponentScore):r.firstDown?'MOVE THE CHAINS':r.turnover?'TURNOVER ON DOWNS':'PLAY COMPLETE');
   set('#result-title',final?(state.mode==='practice'?'UNIT GRADE '+grade(state.stats.gradeTotal/state.stats.plays):state.score>state.opponentScore?'A WIN IN THE TRENCHES.':state.score===state.opponentScore?'EVEN AT THE WHISTLE.':'BACK TO WORK.'):r.kind);
   set('#result-detail',final?(state.mode==='season'&&data.season.complete?'Season complete. '+data.season.wins+' wins, '+data.season.losses+' losses, '+data.season.ties+' ties. ':state.mode==='practice'?'Five reps in the books. Training bonus +'+data.training[team].toFixed(1)+'. ':'')+'+'+(meta.points||0)+' Garage Points earned.':(r.yards>0?'+':'')+r.yards+' yards. '+(r.opponentDrive||'The line moves as one.'));
   set('#result-stats',final?'LINE '+grade(state.stats.gradeTotal/Math.max(1,state.stats.plays))+' / '+state.stats.pancakes+' PANCAKES / '+state.stats.pickups+' PICKUPS':'SNAP '+(r.snap||'—')+' / LINE '+grade(r.grade));
   set('#next',final?'BACK TO FIELDHOUSE →':'NEXT PLAY →');$('#back-fieldhouse').hidden=!final;$('#back-fieldhouse').textContent='RETURN TO MENU';save();announce($('#result-title').textContent+'. '+$('#result-detail').textContent);
  }
 }
 // Special teams is available only when its actual football precondition holds.
 let kick=$('#kick');if(!kick){kick=document.createElement('button');kick.id='kick';kick.className='secondary';kick.addEventListener('click',()=>{if(active&&!paused&&P.kick(state)){previousPhase='';sync();}});$('#snap').after(kick);}kick.hidden=state.phase!=='presnap'||state.down!==4||state.mode==='practice';kick.textContent=state.ball>=60?'KICK FIELD GOAL':'PUNT';
}
function openRoster(){$('#roster-team').value=team;$('#real-names').checked=data.settings.realNames;renderRoster();openPanel('roster-dialog');}
function renderRoster(){
 const t=$('#roster-team').value,obj=data.teams[t];$('#branding-name').value=obj.name;$('#branding-color').value=obj.color;$('#branding-emblem').value=obj.emblem;
 const body=$('#roster-body');body.replaceChildren();
 for(const p of obj.players){const row=document.createElement('tr');row.dataset.id=p.id;
  for(const key of ['alias','number','position',...D.SKILLS]){const td=document.createElement('td');let input;
   if(key==='position'){input=document.createElement('select');for(const pos of ['','T',...P.POSITIONS]){const o=document.createElement('option');o.value=pos;o.textContent=pos||'TBD';input.append(o);}input.value=p.position;}
   else{input=document.createElement('input');input.type=D.SKILLS.includes(key)?'number':'text';input.value=key==='alias'?D.displayName(data,p):p[key];if(D.SKILLS.includes(key)){input.min=1;input.max=99;}else input.maxLength=key==='number'?2:48;if(key==='number')input.inputMode='numeric';}
   input.dataset.field=key;input.setAttribute('aria-label',p.alias+' '+(key==='alias'&&data.settings.realNames?'private name':key));td.append(input);if(key==='alias'){const small=document.createElement('small');small.textContent=p.position==='T'?'TACKLE · SIDE UNCONFIRMED':p.position?'CONFIRMED '+p.position:'POSITION TBD';td.append(small);}row.append(td);
  }body.append(row);
 }
}
function saveRoster(){
 try{
  const next=JSON.parse(JSON.stringify(data)),t=$('#roster-team').value;
  const name=$('#branding-name').value.trim();if(!name)throw Error('Enter a team name.');next.teams[t].name=name.slice(0,48);next.teams[t].color=$('#branding-color').value;next.teams[t].emblem=$('#branding-emblem').value;
  for(const p of next.teams[t].players)p.position='';
  for(const row of $$('#roster-body tr')){const values={};for(const input of row.querySelectorAll('[data-field]'))values[input.dataset.field]=D.SKILLS.includes(input.dataset.field)?Number(input.value):input.value;
   if(data.settings.realNames){next.privateNames[row.dataset.id]=values.alias.trim().slice(0,60);delete values.alias;}
   D.editPlayer(next,t,row.dataset.id,values);
  }
  data=next;const ok=save();set('#roster-status',ok?'Roster & branding saved on this device.':'Storage is unavailable. Edits are active for this session only.');renderRoster();updateMenu();
 }catch(e){set('#roster-status',e.message);}
}
for(const b of $$('[data-team]'))b.onclick=()=>selectTeam(b.dataset.team);
for(const b of $$('[data-mode]'))b.onclick=()=>selectMode(b.dataset.mode);
for(const b of $$('[data-input]'))b.addEventListener('click',()=>input(b.dataset.input));
for(const b of $$('[data-close]'))b.onclick=()=>$('#'+b.dataset.close).close();
$('#drill').onchange=updateMenu;$('#settings-open').onclick=()=>openPanel('settings-dialog');$('#mode-open').onclick=()=>openPanel('settings-dialog');$('#game-settings').onclick=()=>openPanel('settings-dialog');$('#game-roster').onclick=openRoster;$('#practice-open').onclick=()=>openPanel('practice-menu');$('#practice-start').onclick=()=>{mode='practice';if(active)fieldhouse();startGame(false,true);};$('#schedule-open').onclick=()=>openPanel('schedule-dialog');$('#start').onclick=()=>startGame();$('#resume').onclick=resume;$('#snap').onclick=snap;$('#next').onclick=next;$('#back-fieldhouse').onclick=fieldhouse;$('#pause').onclick=()=>pause(!paused);$('#unpause').onclick=()=>pause(false);$('#leave').onclick=fieldhouse;
$('#help-open').onclick=()=>{if(active)pause();openPanel('help');};$('#roster-open').onclick=openRoster;$('#roster-team').onchange=()=>{renderRoster();set('#roster-status','');};$('#roster-save').onclick=saveRoster;
$('#sound').onclick=()=>{data.settings.sound=!data.settings.sound;$('#sound').setAttribute('aria-pressed',String(data.settings.sound));set('#sound',data.settings.sound?'SOUND ON':'SOUND OFF');if(data.settings.sound)audioReady();else audio?.suspend();save();};
$('#voice').checked=data.settings.voice;$('#voice').onchange=()=>{data.settings.voice=$('#voice').checked;save();};
$('#real-names').onchange=()=>{data.settings.realNames=$('#real-names').checked;save();renderRoster();updateMenu();};
$('#forget-private').onclick=()=>{data.privateNames={};data.settings.realNames=false;$('#real-names').checked=false;save();renderRoster();updateMenu();set('#roster-status','Private names removed from this game’s local save.');};
$('#roster-import').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>50000)throw Error('Roster file must be smaller than 50 KB.');data=D.importRoster(data,JSON.parse(await file.text()));save();renderRoster();updateMenu();set('#roster-status','Roster imported on this device. Enable private names to display them.');}catch(error){set('#roster-status','Import failed: '+error.message);}finally{e.target.value='';}};
$('#roster-export').onclick=()=>{const blob=new Blob([JSON.stringify(D.publicExport(data),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='trenches-alias-roster.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#new-season').onclick=()=>{if(active)pause();pendingNewSeason=true;$('#restart-confirm p').textContent='This replaces the saved season and its game. Rosters, training and Garage Points stay saved.';openPanel('restart-confirm');};
$('#confirm-season').onclick=()=>{if(!pendingNewSeason)return;pendingNewSeason=false;$('#restart-confirm').close();mode='season';startGame(true);};
addEventListener('keydown',e=>{
 if(document.querySelector('dialog[open]')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
 if(e.code==='Escape'){e.preventDefault();if(active)pause(!paused);return;}
 if(e.repeat)return;
 if(['Space','Enter'].includes(e.code)&&e.target.closest('button'))return;
 if(!active&&['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(e.code)){const items=$$('.home-actions button').filter(b=>!b.hidden);const i=items.indexOf(document.activeElement),dir=['ArrowRight','ArrowDown'].includes(e.code)?1:-1;items[(i+dir+items.length)%items.length].focus();e.preventDefault();return;}
 if(active&&['Space','Enter','ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(e.code)){
  e.preventDefault();if(paused)return;
  if(e.code==='Space'||e.code==='Enter'){if(['result','final'].includes(state.phase))next();else if(e.code==='Space')snap();}
  else input(e.code);
 }
});
addEventListener('blur',()=>{if(active&&!paused)pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)pause();});addEventListener('pagehide',save);
function rosterView(selected){return D.lineup(data,selected).map(p=>{const name=D.displayName(data,p);const words=name.trim().split(/\s+/);const jerseyName=p.id?(/player [A-Z]$/i.test(name)?'PLAYER '+words.at(-1):words.slice(words.length>2?-2:-1).join(' ').toUpperCase()):p.position;return{...p,name,jerseyName:jerseyName.slice(0,14)};});}
function frame(t){
 const dt=Math.min(.05,(t-last)/1000||0);last=t;
 if(active&&!paused){accumulator+=dt;while(accumulator>=1/120){P.step(state,1/120);accumulator-=1/120;}sync();if(t-lastSave>1000){save();lastSave=t;}}
 const selected=active?state.team:team,view={team:selected,color:data.teams[selected].color,emblem:data.teams[selected].emblem,brand:data.teams[selected].name,lineup:rosterView(selected)};
 if(active)art.draw(state,view,t/1000);else homeArt.draw(null,{...view,preview:true},t/1000);
 requestAnimationFrame(frame);
}
$('#sound').setAttribute('aria-pressed',String(data.settings.sound));set('#sound',data.settings.sound?'SOUND ON':'SOUND OFF');updateMenu();save();requestAnimationFrame(frame);
})();
