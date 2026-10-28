/* Sunday Slide: original drift, jump and obstacle simulation. */
(function(root){
'use strict';
const R=typeof module!=='undefined'&&module.exports?require('./physics.js'):root.Racer;
const {nearest,clamp,formatTime}=R;
const vehicles=[
 {id:'coupe',name:'Sunset Coupe',kind:'car',color:['#cb7340','#b76036','#edaa69'],accel:16,max:46,grip:5.3,turn:.058,mass:1},
 {id:'truck',name:'Trail Pickup',kind:'truck',color:['#729b8b','#547a70','#9bbba3'],accel:13,max:39,grip:4.3,turn:.052,mass:1.4},
 {id:'train',name:'Little Locomotive',kind:'train',color:['#b34d3f','#823d35','#d57958'],accel:10,max:33,grip:3.4,turn:.046,mass:2},
 {id:'sf90',name:'Ferrari SF90 · tribute',kind:'supercar',color:['#c43832','#982e29','#ee5d43'],accel:22,max:58,grip:6,turn:.06,mass:.9}
];
const definitions=[
 {name:'Golden Meadows',width:14,theme:'meadow',points:[[0,0,0],[0,0,90],[55,0,145],[140,0,135],[180,0,65],[140,0,-20],[45,0,-45]],jumps:[.11],obstacles:[.31,.65]},
 {name:'Canyon Postcards',width:13,theme:'desert',points:[[0,0,0],[0,0,100],[55,0,155],[110,0,130],[90,0,75],[155,0,45],[175,0,-25],[90,0,-65],[20,0,-50]],jumps:[.09,.56],obstacles:[.29,.73]},
 {name:'Pine & Switchback',width:13,theme:'alpine',points:[[0,0,0],[0,3,85],[45,6,125],[90,8,90],[55,5,45],[120,4,5],[150,0,-55],[60,0,-85],[10,0,-45]],jumps:[],obstacles:[.25,.49,.72]},
 {name:'Lakeside Leisure',width:15,theme:'meadow',points:[[0,0,0],[0,0,100],[70,0,170],[165,0,125],[200,0,45],[145,0,-35],[65,0,-65]],jumps:[.12,.61],obstacles:[.36,.78]},
 {name:'The Long Way Home',width:14,theme:'alpine',points:[[0,0,0],[0,3,110],[65,8,170],[150,12,150],[200,8,85],[155,3,20],[205,0,-45],[120,0,-110],[35,0,-85]],jumps:[.08,.41,.72],obstacles:[.23,.56,.85]}
];
const base=R.definitions.length;R.definitions.push(...definitions);
const RIDE_HEIGHT = .42;
const HITCH_LENGTH = 4.2;
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const smoothstep = t => t * t * (3 - 2 * t);

function createTrack(id) {
 const track = R.createTrack(base + id);
 track.id = id;
 track.samples.forEach(p => { p.baseY = p.y; });
 track.ramps = definitions[id].jumps.map(f => {
  const end = Math.floor(track.samples.length * f);
  return { start: end - 5, end, landingEnd: end + 4, height: 1.8 };
 });
 for (const ramp of track.ramps) {
  for (let i = ramp.start; i <= ramp.end; i++) {
   track.samples[i].y += ramp.height * smoothstep((i - ramp.start) / (ramp.end - ramp.start));
  }
  // A rounded runout lets slow vehicles roll off the ramp without dropping a step.
  for (let i = ramp.end + 1; i < ramp.landingEnd; i++) {
   track.samples[i].y += ramp.height * (1 - smoothstep((i - ramp.end) / (ramp.landingEnd - ramp.end)));
  }
 }
 track.obstacles = definitions[id].obstacles.map((f, i) => {
  const p = track.samples[Math.floor(track.samples.length * f)];
  const offset = (i % 2 ? 1 : -1) * track.width * .29;
  return { x: p.x + p.nx * offset, z: p.z + p.nz * offset, y: p.y,
   radius: 1.4, kind: i % 2 ? 'log' : 'hay', heading: Math.atan2(p.dx, p.dz) };
 });
 return track;
}

// Stay on the current stretch near switchbacks instead of snapping to another elevation.
function surfaceAt(track, x, z, previousIndex) {
 if (!Number.isInteger(previousIndex)) return nearest(track, x, z);
 let best = { distance: Infinity };
 const samples = track.samples, count = samples.length;
 for (let offset = -12; offset <= 12; offset++) {
  const index = (previousIndex + offset + count) % count;
  const a = samples[index], b = samples[(index + 1) % count];
  const t = clamp(((x - a.x) * a.dx + (z - a.z) * a.dz) / (a.len * a.len), 0, 1);
  const px = a.x + a.dx * t, pz = a.z + a.dz * t;
  const distance = Math.hypot(x - px, z - pz);
  if (distance < best.distance - 1e-6 ||
      (Math.abs(distance - best.distance) <= 1e-6 && Math.abs(offset) < best.offset)) best = { distance, offset: Math.abs(offset), index, t, x: px, z: pz,
   y: a.y + (b.y - a.y) * t, progress: (a.s + t * a.len) / track.length,
   side: (x - px) * a.nx + (z - pz) * a.nz };
 }
 return best.distance < track.width * 1.25 ? best : nearest(track, x, z);
}

function supportHeight(track, surface) {
 const edgeBlend = smoothstep(clamp((surface.distance - track.width / 2 - .5) / 7, 0, 1));
 return surface.y * (1 - edgeBlend) + RIDE_HEIGHT;
}

function makeWagons(car, track) {
 const wagons = [];
 for (let i = 0; i < 2; i++) {
  const x = car.x - Math.sin(car.heading) * (i + 1) * HITCH_LENGTH;
  const z = car.z - Math.cos(car.heading) * (i + 1) * HITCH_LENGTH;
  const surface = nearest(track, x, z);
  wagons.push({ x, z, y: supportHeight(track, surface), heading: car.heading,
   vx: 0, vz: 0, vy: 0, pitch: 0, surfaceIndex: surface.index, airborne: false,
   airtime: 0, totalAir: 0, cinematicTime: 0, jumps: 0, driftScore: 0, driftAngle: 0 });
 }
 return wagons;
}

function spawn(track, vehicleId = 0) {
 const car = R.spawn(track);
 Object.assign(car, { vehicleId, vx: 0, vz: 0, pitch: 0, surfaceIndex: 0,
  driftScore: 0, combo: 1, driftAngle: 0, airborne: false, airtime: 0,
  totalAir: 0, jumps: 0, collisionCooldown: 0, cinematicTime: 0 });
 car.wagons = makeWagons(car, track);
 return car;
}

function recover(car, track) {
 R.recover(car, track);
 Object.assign(car, { vx: 0, vz: 0, pitch: 0, surfaceIndex: car.recoveryIndex,
  airborne: false, airtime: 0, combo: 1, driftAngle: 0, cinematicTime: 0 });
 car.wagons = makeWagons(car, track);
}

// Analytic critically damped suspension: stable even when the road grade changes.
function suspension(body, targetY, dt) {
 const frequency = 24, error = body.y - targetY;
 const impulse = body.vy + frequency * error;
 const decay = Math.exp(-frequency * dt);
 body.y = targetY + (error + impulse * dt) * decay;
 body.vy = (body.vy - frequency * impulse * dt) * decay;
}

function verticalStep(body, track, previous, surface, dt, isLocomotive) {
 const wasAirborne = body.airborne;
 let event = null;
 if (!wasAirborne) {
  const speed = Math.hypot(body.vx, body.vz);
  for (const ramp of track.ramps) {
   if (previous.index >= ramp.start && previous.index < ramp.end &&
       surface.index >= ramp.end && surface.index < ramp.landingEnd &&
       surface.distance < track.width / 2 && speed > 12) {
    body.airborne = true;
    body.airtime = 0;
    body.cinematicTime = 0;
    body.jumps++;
    // No lateral drift or midair steering: fly along the heading at the lip.
    if (isLocomotive) {
     body.flightHeading = body.heading;
     body.vx = Math.sin(body.flightHeading) * speed;
     body.vz = Math.cos(body.flightHeading) * speed;
    }
    // Shorter, flatter arcs at higher speeds prevent the old long overshoots.
    body.vy = clamp(8 - speed * .13, 0, 6);
    event = 'jump';
    break;
   }
  }
 }
 const ground = supportHeight(track, surface);
 if (wasAirborne) {
  body.airtime += dt;
  body.totalAir += dt;
  body.cinematicTime += dt;
  body.y += body.vy * dt - 11 * dt * dt;
  body.vy -= 22 * dt;
  if (body.y <= ground && body.vy < 0) {
   body.y = ground;
   body.vy = 0;
   body.airborne = false;
   body.driftScore += Math.floor(body.airtime * 200);
   event = 'landing';
  }
 } else if (!body.airborne) suspension(body, ground, dt);
 const a = track.samples[surface.index];
 const b = track.samples[(surface.index + 1) % track.samples.length];
 const grade = (b.y - a.y) / a.len;
 const alignment = (Math.sin(body.heading) * a.dx + Math.cos(body.heading) * a.dz) / a.len;
 const targetPitch = body.airborne ? clamp(Math.atan2(body.vy, Math.max(8, Math.hypot(body.vx, body.vz))), -.22, .28)
  : clamp(Math.atan(grade * alignment), -.28, .28);
 body.pitch += (targetPitch - body.pitch) * (1 - Math.exp(-dt * 9));
 body.surfaceIndex = surface.index;
 return event;
}

function updateWagons(car, track, input, dt) {
 let parent = car;
 for (const w of car.wagons) {
  const previous = surfaceAt(track, w.x, w.z, w.surfaceIndex);
  const oldX = w.x, oldZ = w.z;
  const s = Math.sin(w.heading), c = Math.cos(w.heading);
  const longitudinal = (w.vx * s + w.vz * c) * Math.exp(-dt * .08);
  const lateral = (w.vx * c - w.vz * s) * Math.exp(-dt * (w.airborne ? 0 : input.brake ? .45 : 2.8));
  // Each wagon keeps its own sideways momentum; the drawbar only constrains distance.
  const vx = s * longitudinal + c * lateral, vz = c * longitudinal - s * lateral;
  // Transmit the locomotive's sideways pull through both couplings, with a little lag.
  const pull = 1 - Math.exp(-dt * (input.brake ? 6 : 2.5));
  w.x += (vx + (parent.vx - vx) * pull) * dt;
  w.z += (vz + (parent.vz - vz) * pull) * dt;
  const dx = parent.x - w.x, dz = parent.z - w.z, distance = Math.hypot(dx, dz) || 1;
  w.x = parent.x - dx / distance * HITCH_LENGTH;
  w.z = parent.z - dz / distance * HITCH_LENGTH;
  w.vx = (w.x - oldX) / dt;
  w.vz = (w.z - oldZ) / dt;
  const drawbarHeading = Math.atan2(dx, dz);
  const bodyHeading = drawbarHeading + angleDelta(parent.heading, drawbarHeading) * (input.brake ? .95 : .2);
  w.heading += angleDelta(bodyHeading, w.heading) * (1 - Math.exp(-dt * 4));
  w.driftAngle = Math.abs(Math.atan2(w.vx * Math.cos(w.heading) - w.vz * Math.sin(w.heading),
   Math.max(1, Math.abs(w.vx * Math.sin(w.heading) + w.vz * Math.cos(w.heading)))));
  const surface = surfaceAt(track, w.x, w.z, w.surfaceIndex);
  verticalStep(w, track, previous, surface, dt, false);
  parent = w;
 }
}

function step(car, track, input, dt) {
 dt = clamp(dt, 0, 1 / 30);
 if (car.finished || dt === 0) return null;
 const v = vehicles[car.vehicleId];
 car.time += dt;
 car.collisionCooldown = Math.max(0, car.collisionCooldown - dt);
 let surface = surfaceAt(track, car.x, car.z, car.surfaceIndex);
 const previous = surface;
 const forward = () => car.vx * Math.sin(car.heading) + car.vz * Math.cos(car.heading);
 car.offroad = surface.distance > track.width / 2;
 const turn = (input.right ? 1 : 0) - (input.left ? 1 : 0);
 car.steer += (turn - car.steer) * Math.min(1, dt * 7);
 if (!car.airborne) {
  const f = forward(), speed = Math.hypot(car.vx, car.vz);
  car.heading += car.steer * clamp(f, -12, 33) * v.turn * dt * (input.brake ? 1.32 : 1);
  const s = Math.sin(car.heading), c = Math.cos(car.heading);
  let longitudinal = car.vx * s + car.vz * c, lateral = car.vx * c - car.vz * s;
  const throttle = (input.up ? 1 : 0) - (input.down ? 1 : 0);
  longitudinal += throttle * v.accel * dt;
  if (input.down && longitudinal > 0) longitudinal -= 23 * dt;
  longitudinal *= Math.exp(-(car.offroad ? 1.65 : .18) * dt);
  if (input.brake) longitudinal *= Math.exp(-.65 * dt);
  longitudinal = clamp(longitudinal, -8, car.offroad ? 20 : v.max);
  lateral *= Math.exp(-(car.offroad ? 2.4 : input.brake ? .75 : v.grip) * dt);
  car.vx = s * longitudinal + c * lateral;
  car.vz = c * longitudinal - s * lateral;
  car.driftAngle = Math.abs(Math.atan2(lateral, Math.max(1, Math.abs(longitudinal))));
  if (speed > 7 && car.driftAngle > .12 && !car.offroad) {
   car.combo = clamp(car.combo + dt * .18, 1, 5);
   car.driftScore += car.driftAngle * speed * dt * car.combo * 15;
  } else car.combo = Math.max(1, car.combo - dt * .7);
 }
 car.x += car.vx * dt;
 car.z += car.vz * dt;
 surface = surfaceAt(track, car.x, car.z, car.surfaceIndex);
 let event = verticalStep(car, track, previous, surface, dt, true);
 car.speed = forward();
 if (!car.airborne && car.collisionCooldown === 0) {
  for (const o of track.obstacles) {
   if (Math.hypot(car.x - o.x, car.z - o.z) >= o.radius + 1) continue;
   const dx = car.x - o.x, dz = car.z - o.z, len = Math.hypot(dx, dz) || 1;
   car.x = o.x + dx / len * (o.radius + 1.15);
   car.z = o.z + dz / len * (o.radius + 1.15);
   car.vx *= -.2;
   car.vz *= -.2;
   car.combo = 1;
   car.collisionCooldown = 1.5;
   car.time += 1;
   event = 'collision';
   break;
  }
 }
 if (surface.distance > 55) { recover(car, track); return 'recovered'; }
 const goal = track.checkpoints[car.nextCheckpoint];
 if (goal !== undefined) {
  const p = track.samples[goal];
  if (Math.hypot(car.x - p.x, car.z - p.z) < track.width * 1.05 && surface.distance < track.width * .65) {
   car.nextCheckpoint++;
   car.recoveryIndex = goal;
   if (!event) event = 'checkpoint';
  }
 }
 if (car.nextCheckpoint === 4 && car.lastProgress > .93 && surface.progress < .07 &&
     surface.distance < track.width * .6 && car.speed > 0) {
  car.finished = true;
  event = 'finish';
 }
 car.lastProgress = surface.progress;
 if (car.vehicleId === 2) updateWagons(car, track, input, dt);
 return event;
}
const api={...R,createTrack,spawn,step,recover,surfaceAt,supportHeight,vehicles,definitions};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Drift=api;
})(typeof window!=='undefined'?window:globalThis);
