(function (root) {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const difficulties = {
    easy: { name: 'Easy', eventEvery: 23, waveEvery: 26, waveHeight: 36, tsunamiChance: .22, damage: 4, pirateHP: 32, boarding: 4, restartTaps: 8, rescueTime: 50, repairKits: 3 },
    medium: { name: 'Medium', eventEvery: 17, waveEvery: 19, waveHeight: 52, tsunamiChance: .4, damage: 7, pirateHP: 42, boarding: 6, restartTaps: 12, rescueTime: 40, repairKits: 2 },
    hard: { name: 'Hard', eventEvery: 12, waveEvery: 13, waveHeight: 70, tsunamiChance: .62, damage: 10, pirateHP: 54, boarding: 8, restartTaps: 16, rescueTime: 32, repairKits: 2 }
  };
  const vessels = {
    cargo: { name: 'Cargo ship', callsign: 'M.V. Wayfarer', length: 300, maxSpeed: 106, acceleration: 29, destination: 5600, capacity: 6, loadTime: 4.5 },
    cruise: { name: 'Cruise ship', callsign: 'M.S. Sundancer', length: 340, maxSpeed: 116, acceleration: 26, destination: 6100, capacity: 24, loadTime: 4 }
  };
  function random(s) { s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0; return s.seed / 4294967296; }
  function notify(s, text, tone = 'info') { s.notice = { text, tone, until: s.time + 4.5 }; }
  function create(vessel = 'cargo', difficulty = 'easy', seed = Date.now()) {
    if (!vessels[vessel]) vessel = 'cargo';
    if (!difficulties[difficulty]) difficulty = 'easy';
    const spec = vessels[vessel], config = difficulties[difficulty];
    return {
      vessel, difficulty, spec, config, seed: seed >>> 0, time: 0, voyageTime: 0, stage: 'loading',
      ship: { x: 200, y: 0, vy: 0, angle: 0, angular: 0, vx: 0, hull: 100, pressure: 100, engine: true, restart: 0, gunAngle: 0 },
      source: 200, destination: spec.destination, load: 0, unload: 0, onboard: 0, repair: 0, repairKits: config.repairKits,
      eventIn: config.eventEvery * .56, waveIn: config.waveEvery * .65, eventNumber: 0, waves: [], pirates: [], shots: [], effects: [],
      swimmer: null, shotCooldown: 0, spray: false, repairActive: false, notice: null, failure: '', score: 0, nextId: 1,
      stats: { pirates: 0, rescues: 0, restarts: 0, events: 0, waves: 0, tsunamis: 0, shots: 0, damage: 0 }
    };
  }
  function sea(s, x) {
    const shelter = clamp(Math.min(Math.abs(x - s.source), Math.abs(x - s.destination)) / 480, .12, 1);
    let y = (Math.sin(x * .007 - s.time * 1.15) * 8 + Math.sin(x * .015 + s.time * 1.8) * 4) * shelter;
    for (const w of s.waves) {
      const d = (x - w.x) / w.width;
      y += w.height * (Math.exp(-d * d * 1.7) - .24 * Math.exp(-((d - 1.25) ** 2) * 2)) * shelter;
    }
    return y;
  }
  function damage(s, amount) {
    s.ship.hull = clamp(s.ship.hull - amount, 0, 100);
    s.stats.damage += amount;
    if (s.ship.hull <= 0) fail(s, 'The hull could not take any more. Slow down before large waves and use your repair kits.');
  }
  function fail(s, reason) { s.stage = 'failed'; s.failure = reason; s.spray = false; }
  function spawnPirates(s) {
    const count = s.difficulty === 'hard' ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1;
      const x = s.ship.x + side * (540 + i * 100);
      s.pirates.push({ id: s.nextId++, x, y: sea(s, x), hp: s.config.pirateHP, boarding: 0, sunk: 0, side });
    }
    notify(s, 'PIRATES APPROACHING · Aim and click, or hold F for water cannons.', 'danger');
  }
  function triggerIncident(s, kind) {
    if (s.stage !== 'sailing') return false;
    if (kind === 'pirates' && s.vessel === 'cargo') {
      if (s.pirates.filter(p => p.hp > 0).length >= 3) return false;
      spawnPirates(s);
    } else if (kind === 'engine' && s.vessel === 'cruise') {
      if (!s.ship.engine || s.swimmer) return false;
      s.ship.engine = false; s.ship.restart = 0;
      notify(s, 'ENGINE FAILURE · Tap Space repeatedly to restart.', 'danger');
    } else if (kind === 'overboard' && s.vessel === 'cruise') {
      if (s.swimmer || !s.ship.engine) return false;
      const x = s.ship.x - s.spec.length * .5 - 60;
      s.swimmer = { x, time: s.config.rescueTime, progress: 0 };
      s.onboard--;
      notify(s, 'PERSON OVERBOARD · Brake, return to the life ring, and hold E.', 'danger');
    } else return false;
    s.stats.events++;
    return true;
  }
  function spawnWave(s, tsunami) {
    const big = tsunami === undefined ? random(s) < s.config.tsunamiChance : tsunami;
    const w = { id: s.nextId++, x: s.ship.x + 1040, speed: big ? 118 : 100, width: big ? 205 : 125, height: s.config.waveHeight * (big ? 2.15 : 1), tsunami: big, hit: false, age: 0 };
    s.waves.push(w); s.stats.waves++; if (big) s.stats.tsunamis++;
    notify(s, big ? 'TSUNAMI INBOUND · Brake to reduce the impact.' : 'LARGE WAVE INBOUND · Reduce your speed.', 'warning');
    return w;
  }
  function tapRestart(s) {
    if (s.stage !== 'sailing' || s.ship.engine) return false;
    s.ship.restart = clamp(s.ship.restart + 1 / s.config.restartTaps, 0, 1);
    if (s.ship.restart >= .9999) {
      s.ship.engine = true; s.ship.restart = 1; s.stats.restarts++;
      notify(s, 'ENGINES ONLINE · All ahead!', 'good');
    }
    return true;
  }
  function sinkPirate(s, p) {
    if (p.sunk) return;
    p.hp = 0; p.sunk = .001; p.boarding = 0; s.stats.pirates++;
    s.effects.push({ x: p.x, y: p.y, age: 0, kind: 'splash' });
    notify(s, 'PIRATE BOAT DISABLED · Keep your cargo moving.', 'good');
  }
  function gunPosition(s) { return { x: s.ship.x + 98, y: s.ship.y + 37 }; }
  function fire(s, aim) {
    if (s.vessel !== 'cargo' || s.stage !== 'sailing' || s.shotCooldown > 0 || !aim) return false;
    const origin = gunPosition(s), angle = Math.atan2(aim.y - origin.y, aim.x - origin.x);
    s.ship.gunAngle = angle;
    s.shots.push({ x: origin.x, y: origin.y, px: origin.x, py: origin.y, vx: Math.cos(angle) * 810, vy: Math.sin(angle) * 810, age: 0 });
    s.shotCooldown = .23; s.stats.shots++; return true;
  }
  function interaction(s) {
    const slow = Math.abs(s.ship.vx) < 23;
    if (s.stage === 'loading') return { label: s.vessel === 'cargo' ? 'Load cargo' : 'Board passengers', hint: s.vessel === 'cargo' ? 'Hold E to operate the loading crane' : 'Hold E to welcome your passengers', ready: true, progress: s.load };
    if (s.swimmer) {
      const near = Math.abs(s.ship.x - s.swimmer.x) < s.spec.length / 2 + 95;
      return { label: 'Rescue passenger', hint: !near ? 'Return to the life ring' : !slow ? 'Brake to rescue safely' : 'Hold E to pull them aboard', ready: near && slow, progress: s.swimmer.progress };
    }
    const distance = Math.abs(s.ship.x - s.destination), near = distance < 115;
    return { label: s.vessel === 'cargo' ? 'Unload cargo' : 'Disembark passengers', hint: near ? (slow ? 'Hold E to finish your delivery' : 'Brake to dock safely') : distance < 550 ? 'Dock ahead · ease off and brake' : 'Sail to Northstar Pier', ready: near && slow, progress: s.unload };
  }
  function complete(s) {
    s.stage = 'complete'; s.ship.vx = 0; s.spray = false;
    s.score = Math.round(1000 + s.ship.hull * 10 + s.stats.pirates * 150 + s.stats.rescues * 200 + Math.max(0, 400 - s.voyageTime * 2) + { easy: 0, medium: 400, hard: 900 }[s.difficulty]);
  }
  function step(s, input = {}, dt = 1 / 60) {
    if (s.stage === 'complete' || s.stage === 'failed') return;
    dt = clamp(dt, 0, 1 / 30); s.time += dt;
    const ship = s.ship, config = s.config;
    s.shotCooldown = Math.max(0, s.shotCooldown - dt);
    for (const e of s.effects) e.age += dt;
    s.effects = s.effects.filter(e => e.age < 1.1);
    s.spray = false; s.repairActive = false;
    if (s.stage === 'loading') {
      if (input.interact) {
        s.load = clamp(s.load + dt / s.spec.loadTime, 0, 1);
        s.onboard = Math.floor(s.load * s.spec.capacity + .00001);
        if (s.load >= 1) { s.stage = 'sailing'; notify(s, 'LINES OFF · Northstar Pier is to the right. Hold D or → to sail.', 'good'); }
      }
    } else {
      s.voyageTime += dt;
      const throttle = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const repairing = input.repair && s.repairKits > 0 && Math.abs(ship.vx) < 23 && ship.hull < 99.9;
      const context = interaction(s), mooring = input.interact && context.ready;
      if (input.brake || mooring || repairing) ship.vx *= Math.exp(-dt * 2.3);
      else if (ship.engine) ship.vx += throttle * s.spec.acceleration * dt;
      ship.vx *= Math.exp(-dt * .15);
      ship.vx = clamp(ship.vx, -s.spec.maxSpeed * .65, s.spec.maxSpeed);
      if (!ship.engine) ship.restart = Math.max(0, ship.restart - dt * .008);
      ship.x = clamp(ship.x + ship.vx * dt, s.source - 550, s.destination + 650);
      if ((ship.x <= s.source - 550 && ship.vx < 0) || (ship.x >= s.destination + 650 && ship.vx > 0)) ship.vx = 0;
      const sheltered = Math.min(Math.abs(ship.x - s.source), Math.abs(ship.x - s.destination)) < 440;
      if (!sheltered) {
        s.eventIn -= dt; s.waveIn -= dt;
        if (s.eventIn <= 0) {
          const kind = s.vessel === 'cargo' ? 'pirates' : s.eventNumber % 2 ? 'overboard' : 'engine';
          if (triggerIncident(s, kind)) { s.eventNumber++; s.eventIn = config.eventEvery * (.85 + random(s) * .3); }
          else s.eventIn = 3;
        }
        if (s.waveIn <= 0) { spawnWave(s); s.waveIn = config.waveEvery * (.9 + random(s) * .2); }
      }
      if (input.interact && context.ready) {
        if (s.swimmer) {
          s.swimmer.progress = clamp(s.swimmer.progress + dt / 2.2, 0, 1);
          if (s.swimmer.progress >= 1) { s.swimmer = null; s.onboard++; s.stats.rescues++; notify(s, 'PASSENGER SAFE · Welcome back aboard.', 'good'); }
        } else {
          s.unload = clamp(s.unload + dt / 3.5, 0, 1);
          if (s.unload >= 1) complete(s);
        }
      }
      if (s.swimmer) { s.swimmer.time -= dt; if (s.swimmer.time <= 0) fail(s, 'A passenger was left behind. Brake immediately, return to the life ring, then hold E to rescue them.'); }
      if (repairing) {
        s.repairActive = true; s.repair += dt / 3;
        if (s.repair >= 1) { ship.hull = Math.min(100, ship.hull + 35); s.repairKits--; s.repair = 0; notify(s, 'REPAIRS COMPLETE · Hull restored by up to 35%.', 'good'); }
      } else s.repair = 0;
      if (input.fire) fire(s, input.aim);
      if (input.cannon && s.vessel === 'cargo' && ship.pressure > 0) { s.spray = true; ship.pressure = Math.max(0, ship.pressure - dt * 25); }
      else ship.pressure = Math.min(100, ship.pressure + dt * 17);
    }
    if (s.stage === 'complete' || s.stage === 'failed') return;
    for (const w of s.waves) {
      w.x -= w.speed * dt; w.age += dt;
      if (!w.hit && Math.abs(w.x - ship.x) < w.width * .55) {
        w.hit = true;
        const exposed = Math.min(Math.abs(ship.x - s.source), Math.abs(ship.x - s.destination)) > 440;
        if (exposed) {
          const impact = config.damage * (w.tsunami ? 2 : 1) * (.55 + Math.abs(ship.vx) / s.spec.maxSpeed * 1.8);
          damage(s, impact); ship.vx *= w.tsunami ? .56 : .76;
          s.effects.push({ x: ship.x + 100, y: ship.y, age: 0, kind: 'splash' });
          if (s.stage !== 'failed') notify(s, `WAVE IMPACT · ${Math.round(impact)}% hull damage.`, 'warning');
        }
      }
    }
    s.waves = s.waves.filter(w => w.age < 35);
    const half = s.spec.length * .36, front = sea(s, ship.x + half), back = sea(s, ship.x - half);
    const targetY = (front + back) * .5, targetAngle = Math.atan2(front - back, half * 2);
    ship.vy += ((targetY - ship.y) * 32 - ship.vy * 10) * dt; ship.y += ship.vy * dt;
    ship.angular += ((targetAngle - ship.angle) * 25 - ship.angular * 9) * dt; ship.angle += ship.angular * dt;
    for (const p of s.pirates) {
      if (p.hp <= 0) { p.sunk += dt; continue; }
      const target = ship.x + p.side * (s.spec.length / 2 + 65), distance = target - p.x;
      p.x += clamp(distance * 1.25 + ship.vx, -155, 155) * dt; p.y = sea(s, p.x);
      if (Math.abs(p.x - ship.x) < s.spec.length / 2 + 115) {
        p.boarding = clamp(p.boarding + config.boarding * dt, 0, 100); damage(s, dt * (s.difficulty === 'hard' ? 1.6 : .7));
        if (p.boarding >= 100) fail(s, 'Pirates boarded the ship. Fire at their boats or hold F when they get close to wash them away.');
      } else p.boarding = Math.max(0, p.boarding - dt * 4);
      if (s.spray && Math.abs(p.x - ship.x) < s.spec.length / 2 + 340) {
        p.hp -= dt * 32; p.boarding = Math.max(0, p.boarding - dt * 24); p.x += p.side * dt * 40;
        if (p.hp <= 0) sinkPirate(s, p);
      }
    }
    s.pirates = s.pirates.filter(p => p.sunk < 2.5);
    for (const shot of s.shots) {
      shot.px = shot.x; shot.py = shot.y; shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.age += dt;
      for (const p of s.pirates) {
        if (p.hp <= 0) continue;
        // Closest point on the swept segment prevents fast shots tunneling through a boat.
        const dx = shot.x - shot.px, dy = shot.y - shot.py, cx = p.x, cy = p.y + 17;
        const t = clamp(((cx - shot.px) * dx + (cy - shot.py) * dy) / (dx * dx + dy * dy || 1), 0, 1);
        if (Math.hypot((shot.px + dx * t - cx) / 48, (shot.py + dy * t - cy) / 28) < 1) {
          p.hp -= 24; shot.age = 10; s.effects.push({ x: p.x, y: p.y + 20, age: 0, kind: 'hit' });
          if (p.hp <= 0) sinkPirate(s, p); break;
        }
      }
      if (shot.y < sea(s, shot.x) - 12) shot.age = 10;
    }
    s.shots = s.shots.filter(shot => shot.age < 1.5);
  }
  const api = { clamp, difficulties, vessels, create, step, sea, interaction, triggerIncident, spawnWave, tapRestart, fire, gunPosition };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Tide = api;
})(typeof window !== 'undefined' ? window : globalThis);
