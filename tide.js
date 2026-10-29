'use strict';
const $ = selector => document.querySelector(selector);
const canvas = $('#sea'), art = createTideRenderer(canvas);
let vessel = 'cargo', difficulty = 'easy', voyage = Tide.create(), mode = 'menu', menuSea = Tide.create();
let last = performance.now(), accumulator = 0, hudTimer = 0, aimPoint = null, mouseDown = false, sound = false;
const keys = new Set(), holds = new Set();
let storageAvailable = true, records = {};
try { const saved = JSON.parse(localStorage.getItem('tideline-voyages') || '{}'); if (saved && typeof saved === 'object' && !Array.isArray(saved)) records = saved; } catch { storageAvailable = false; }
let audio = null, engineOsc = null, engineGain = null;
const pad = n => String(n).padStart(2, '0');
const clock = t => `${pad(Math.floor(t / 60))}:${pad(Math.floor(t % 60))}`;
const distance = n => n >= 1000 ? `${(n/1000).toFixed(1)} km` : `${Math.round(n)} m`;
const countLabel = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;
const craneLoading = () => voyage.stage === 'loading' && !!voyage.crane;
function resetMenuSea() { menuSea = Tide.create(vessel, difficulty, 42); menuSea.load = 1; menuSea.onboard = menuSea.spec.capacity; }
resetMenuSea();
function clearInputs() { keys.clear(); holds.clear(); mouseDown = false; document.querySelectorAll('.pressed').forEach(el => el.classList.remove('pressed')); }
function setMode(next) {
  mode = next; clearInputs(); accumulator = 0;
  $('#menu').hidden = next !== 'menu'; $('#preview-label').hidden = next !== 'menu'; $('#hud').hidden = next === 'menu';
  $('#pause-panel').hidden = next !== 'paused'; $('#result-panel').hidden = next !== 'result'; $('#pause').hidden = next === 'menu';
  document.body.classList.toggle('playing', next === 'playing');
  document.body.classList.toggle('crane-mode', next !== 'menu' && craneLoading());
  if (engineGain && next !== 'playing') engineGain.gain.setTargetAtTime(0, audio.currentTime, .08);
}
function start() { voyage = Tide.create(vessel, difficulty); aimPoint = null; setMode('playing'); hudTimer = 0; updateHud(); canvas.focus(); if (audio && sound) audio.resume().catch(() => {}); }
function pause() { if (mode !== 'playing') return; setMode('paused'); $('#resume').focus(); }
function resume() { if (mode !== 'paused') return; setMode('playing'); canvas.focus(); }
function menu() { setMode('menu'); resetMenuSea(); $('#depart').focus(); }
function finish() {
  const won = voyage.stage === 'complete', key = `${vessel}-${difficulty}`;
  const old = Number.isFinite(records[key]) && records[key] > 0 ? records[key] : 0;
  let record = false;
  if (won && voyage.score > old) { records[key] = voyage.score; record = true; try { localStorage.setItem('tideline-voyages', JSON.stringify(records)); } catch { storageAvailable = false; } }
  setMode('result');
  $('#result-eyebrow').textContent = won ? 'MANIFEST DELIVERED / ALL ACCOUNTED FOR' : 'VOYAGE ENDED';
  $('#result-title').textContent = won ? 'Safe harbor.' : voyage.ship.hull <= 0 ? 'Lost at sea.' : 'Try another tide.';
  $('#result-description').textContent = won ? (vessel === 'cargo' ? `All six containers delivered. ${countLabel(voyage.stats.pirates, 'pirate boat')} repelled along the way.` : `All 24 passengers delivered safely. ${countLabel(voyage.stats.rescues, 'rescue')} and ${countLabel(voyage.stats.restarts, 'engine restart')}.`) : voyage.failure;
  $('#result-score').textContent = voyage.score.toLocaleString(); $('#result-hull').textContent = `${Math.round(voyage.ship.hull)}%`; $('#result-time').textContent = clock(voyage.voyageTime);
  $('#result-record').textContent = won ? `${record ? 'A new personal best for this ship and difficulty.' : `Personal best: ${old.toLocaleString()}.`}${storageAvailable ? '' : ' Records are saved for this session only.'}` : 'Every crossing is a fresh start. Your ship and supplies will be restored.';
  $('#again').focus();
}
$('#depart').onclick = start; $('#retry').onclick = start; $('#again').onclick = start; $('#pause').onclick = pause; $('#resume').onclick = resume; $('#quit').onclick = menu; $('#result-quit').onclick = menu;
document.querySelectorAll('[data-vessel]').forEach(button => button.onclick = () => {
  vessel = button.dataset.vessel;
  document.querySelectorAll('[data-vessel]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  $('#vessel-brief').textContent = vessel === 'cargo' ? 'Operate the swinging crane to load six containers. Deliver them to Northstar Pier and keep pirates off your ship.' : 'Welcome 24 passengers. Keep the engines running, rescue anyone overboard, and bring everybody home.';
  $('#preview-name').textContent = Tide.vessels[vessel].callsign; $('#preview-spec').textContent = vessel === 'cargo' ? '6 containers / 5.4 km crossing' : '24 passengers / 5.9 km crossing'; resetMenuSea();
});
const difficultyBrief = { easy: 'Room to learn. Occasional trouble, gentler waves, three repair kits.', medium: 'Stay sharp. More incidents, stronger swells, two repair kits.', hard: 'A captain’s test. Frequent trouble, powerful tsunamis, two repair kits.' };
document.querySelectorAll('[data-difficulty]').forEach(button => button.onclick = () => { difficulty = button.dataset.difficulty; document.querySelectorAll('[data-difficulty]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); }); $('#difficulty-brief').textContent = difficultyBrief[difficulty]; resetMenuSea(); });
$('#instructions').onclick = () => $('#handbook').showModal();
for (const id of ['close-handbook', 'handbook-done']) $('#' + id).onclick = () => $('#handbook').close();
function input() {
  const up = holds.has('up') || keys.has('w') || keys.has('ArrowUp'), down = holds.has('down') || keys.has('s') || keys.has('ArrowDown');
  return { right: holds.has('right') || keys.has('d') || keys.has('ArrowRight') || (!craneLoading() && up), left: holds.has('left') || keys.has('a') || keys.has('ArrowLeft'), up, down, brake: holds.has('brake') || (!craneLoading() && down), interact: holds.has('interact') || keys.has('e'), cannon: holds.has('cannon') || keys.has('f'), repair: holds.has('repair') || keys.has('r'), fire: mouseDown, aim: aimPoint ? art.worldFromScreen(aimPoint.x, aimPoint.y) : null };
}
addEventListener('keydown', e => {
  if ($('#handbook').open) return;
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (['playing','paused'].includes(mode) && [' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) e.preventDefault();
  if (!e.repeat && (key === 'Escape' || key === 'p')) { if (mode === 'playing') pause(); else if (mode === 'paused') resume(); return; }
  if (mode !== 'playing') return;
  if (key === 'e' && craneLoading() && Tide.depart(voyage)) { clearInputs(); updateHud(); return; }
  if (key === ' ' && !e.repeat) { if(craneLoading()) Tide.craneAction(voyage); else Tide.tapRestart(voyage); updateHud(); }
  keys.add(key);
});
addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
addEventListener('blur', pause); document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
canvas.addEventListener('pointermove', e => { aimPoint = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerdown', e => { if (mode !== 'playing' || e.button !== 0) return; e.preventDefault(); canvas.focus(); canvas.setPointerCapture(e.pointerId); aimPoint = { x: e.clientX, y: e.clientY }; mouseDown = true; });
for (const event of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(event, () => { mouseDown = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
function bindHold(button, action) {
  const release = () => { holds.delete(action); button.classList.remove('pressed'); };
  button.addEventListener('pointerdown', e => { if (mode !== 'playing') return; e.preventDefault(); button.setPointerCapture(e.pointerId); holds.add(action); button.classList.add('pressed'); });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event, release);
}
document.querySelectorAll('[data-hold]').forEach(button => bindHold(button, button.dataset.hold)); bindHold($('#context-action'), 'interact'); bindHold($('#repair-button'), 'repair');
$('#restart-engine').onclick = () => { if (mode === 'playing') { Tide.tapRestart(voyage); updateHud(); } };
$('#crane-grab').onclick = () => { if (mode === 'playing' && craneLoading()) { Tide.craneAction(voyage); updateHud(); } };
$('#context-action').onclick = () => { if (mode === 'playing' && craneLoading() && Tide.depart(voyage)) { clearInputs(); updateHud(); } };
$('#sound').onclick = () => {
  try {
    if (!audio) {
      audio = new (window.AudioContext || window.webkitAudioContext)(); engineOsc = audio.createOscillator(); engineOsc.type = 'triangle'; engineGain = audio.createGain(); engineGain.gain.value = 0;
      const filter = audio.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 170; engineOsc.connect(filter); filter.connect(engineGain); engineGain.connect(audio.destination); engineOsc.start();
    }
    sound = !sound; audio.resume().catch(() => {}); $('#sound').textContent = sound ? 'SOUND ON' : 'SOUND OFF'; $('#sound').setAttribute('aria-pressed', String(sound)); if (!sound) engineGain.gain.setTargetAtTime(0, audio.currentTime, .06);
  } catch { $('#sound').textContent = 'SOUND UNAVAILABLE'; }
};
function updateHud() {
  const s = voyage, ship = s.ship, cargo = s.vessel === 'cargo', context = Tide.interaction(s), remaining = Math.abs(s.destination - ship.x);
  const loadingCrane = craneLoading(); document.body.classList.toggle('crane-mode',loadingCrane); $('#crane-panel').hidden = !loadingCrane;
  if(loadingCrane){
    const c=s.crane,held=c.held!==null,canGrab=Tide.Crane.grabCandidate(c),done=s.onboard===6;
    $('#crane-count').textContent=`${s.onboard} / 6 SECURED`;
    $('#crane-swing').textContent=`${Math.round(Math.abs(c.angle)*180/Math.PI)}° SWING`;
    $('#crane-state').textContent=done?'All cargo aboard. Ready to sail.':c.blocked?'Lift higher to clear the stack.':held?'Cargo attached. Lift, move, lower, release.':canGrab?'Hook aligned. Tap Space to grab.':'Move above a dock box and lower the hook.';
    $('#crane-grab-label').textContent=done?'ALL LOADED':held?'RELEASE CARGO':canGrab?'GRAB CARGO':'GRAB / RELEASE';
    $('#crane-grab').classList.toggle('ready',!!canGrab||held);$('#crane-grab').disabled=done;
    $('#crane-load-bar').style.width=`${s.load*100}%`;
  }
  $('#mission-title').textContent = cargo ? 'CARGO RUN / 06 CONTAINERS' : 'COASTAL CRUISE / 24 PASSENGERS'; $('#difficulty-badge').textContent = s.config.name.toUpperCase(); $('#callsign').textContent = s.spec.callsign.toUpperCase();
  $('#objective').textContent = s.stage === 'loading' ? cargo ? 'Load the ship.' : 'Welcome aboard.' : s.swimmer ? 'Bring them back.' : remaining < 550 ? 'Make your delivery.' : 'Next stop, Northstar.';
  $('#objective-detail').textContent = s.stage === 'loading' ? context.hint + '.' : s.swimmer ? 'Return to the life ring, stop, and hold E.' : remaining < 550 ? context.hint + '.' : cargo ? 'Keep the cargo safe. Watch for pirates and rough seas.' : 'Look after your passengers and keep an eye on the engines.';
  $('#route-dot').style.left = `${Tide.clamp((ship.x-s.source)/(s.destination-s.source)*100,0,100)}%`; $('#remaining').textContent = `${distance(remaining)} ${ship.x > s.destination ? '← to dock' : 'to dock →'}`;
  $('#manifest-count').textContent = `${s.onboard} / ${s.spec.capacity} ${cargo ? 'CONTAINERS' : 'ABOARD'}`;
  $('#speed-value').textContent = Math.round(Math.abs(ship.vx) * .21); $('#speed-arc').style.strokeDasharray = `${Math.abs(ship.vx)/s.spec.maxSpeed*100} 100`;
  $('#hull-value').textContent = `${Math.ceil(ship.hull)}%`; $('#hull-bar').style.width = `${ship.hull}%`; $('#hull-bar').style.background = ship.hull < 35 ? '#e6a26a' : '#8cc6ac';
  $('#hull-hint').textContent = s.repairActive ? 'Repair crew working…' : ship.hull < 65 ? 'Stop and hold R to repair.' : 'Slow down for heavy seas.';
  $('#systems-title').textContent = cargo ? 'WATER PRESSURE' : 'ENGINE STATUS'; $('#systems-value').textContent = cargo ? `${Math.round(ship.pressure)}%` : ship.engine ? 'ONLINE' : `${Math.round(ship.restart*100)}%`;
  $('#systems-bar').style.width = `${cargo ? ship.pressure : ship.engine ? 100 : ship.restart*100}%`; $('#systems-bar').style.background = !cargo && !ship.engine ? '#e6a26a' : '#8ac3d2';
  $('#systems-hint').textContent = cargo ? 'Hold F · release to recharge' : ship.engine ? 'Standing by for your orders.' : 'Tap Space to restart engines'; $('#repair-kits').textContent = s.repairKits;
  $('#repair-progress').style.width = `${s.repair*100}%`; $('#repair-button').disabled = s.repairKits === 0; $('#voyage-clock').textContent = clock(s.voyageTime);
  $('#role-control').textContent = cargo ? 'AIM + CLICK · DECK GUN' : 'TAP SPACE · ENGINE RESTART';
  $('#touch-cannon').hidden = !cargo; $('#restart-engine').hidden = cargo || ship.engine;
  $('#context-action').hidden = loadingCrane ? s.onboard !== 6 : !(s.stage === 'loading' || s.swimmer || remaining < 550); $('#context-action').disabled = !context.ready;
  $('#action-title').textContent = context.label; $('#action-hint').textContent = context.hint; $('#action-percent').textContent = `${Math.floor(context.progress*100)}%`; $('#action-progress').style.width = `${context.progress*100}%`;
  let alert = null;
  const board = Math.max(0,...s.pirates.map(p => p.boarding)), wave = s.waves.find(w => !w.hit && w.x > ship.x-w.width && w.x-ship.x < 1300), pirates = s.pirates.filter(p => p.hp > 0);
  if (!ship.engine) alert = { title: 'ENGINE OFFLINE', detail: 'Tap Space repeatedly to restart. Holding it won’t work.', progress: ship.restart, danger: true };
  else if (s.swimmer) alert = { title: `PERSON OVERBOARD · ${Math.ceil(s.swimmer.time)}s`, detail: 'Brake, return to the life ring, then hold E.', progress: s.swimmer.time/s.config.rescueTime, danger: true };
  else if (board > 5) alert = { title: `BOARDING RISK · ${Math.ceil(board)}%`, detail: 'Aim + click at the pirate boats, or hold F to repel them.', progress: board/100, danger: true };
  else if (wave) alert = { title: wave.tsunami ? 'TSUNAMI APPROACHING' : 'LARGE WAVE APPROACHING', detail: 'Hold ↓ or S to brake. Lower speed means less hull damage.' };
  else if (pirates.length) alert = { title: 'PIRATES IN PURSUIT', detail: 'Aim + click to shoot. Hold F for nearby water cannons.', danger: true };
  $('#alert').hidden = !alert;
  if (alert) { $('#alert').classList.toggle('danger',!!alert.danger); $('#alert-title').textContent = alert.title; $('#alert-detail').textContent = alert.detail; $('.alert-track').hidden = alert.progress === undefined; $('#alert-progress').style.width = `${(alert.progress||0)*100}%`; }
  const notice = s.notice && s.notice.until > s.time; $('#notice').hidden = !notice;
  if (notice) { $('#notice').textContent = s.notice.text; $('#notice').dataset.tone = s.notice.tone; }
}
addEventListener('resize', () => art.resize());
function frame(now) {
  const elapsed = Math.min((now-last)/1000,.12); last = now;
  if (mode === 'menu' && !$('#handbook').open) { menuSea.time += elapsed; menuSea.ship.y = Tide.sea(menuSea,menuSea.source)*.4; }
  if (mode === 'playing') {
    accumulator += elapsed;
    while (accumulator >= 1/60) {
      const controls = input();
      if (controls.aim) { const origin = Tide.gunPosition(voyage); voyage.ship.gunAngle = Math.atan2(controls.aim.y-origin.y,controls.aim.x-origin.x); }
      const wasCrane=craneLoading();Tide.step(voyage, controls, 1/60); accumulator -= 1/60;
      if(wasCrane&&!craneLoading()){clearInputs();aimPoint=null;updateHud();}
      if (voyage.stage === 'complete' || voyage.stage === 'failed') { finish(); break; }
    }
    hudTimer -= elapsed; if (hudTimer <= 0) { updateHud(); hudTimer = .08; }
    if (sound && engineGain) { engineGain.gain.setTargetAtTime(voyage.ship.engine ? .025+Math.abs(voyage.ship.vx)/7000 : 0,audio.currentTime,.12); engineOsc.frequency.setTargetAtTime(34+Math.abs(voyage.ship.vx)*.4,audio.currentTime,.12); }
  }
  art.draw(mode === 'menu' ? menuSea : voyage, mode, mode === 'playing' && aimPoint ? art.worldFromScreen(aimPoint.x,aimPoint.y) : null);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', e => { if(e.data === 'OFFLINE_READY') $('#offline-status').textContent = 'OFFLINE READY'; });
  navigator.serviceWorker.register('./sw.js').then(async () => { const reg = await navigator.serviceWorker.ready; (reg.active || navigator.serviceWorker.controller)?.postMessage('CACHE_STATUS'); }).catch(() => { $('#offline-status').textContent = 'ONLINE ONLY'; });
} else $('#offline-status').textContent = 'ONLINE ONLY';
