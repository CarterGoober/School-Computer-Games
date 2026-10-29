(function (root) {
  'use strict';
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const geometry = Object.freeze({ boom: 240, width: 46, height: 31, sling: 8, dock: 7, railLeft: -65, railRight: 355, minLength: 36, maxLength: 242 });
  const colors = ['#d5a45c', '#728f89', '#bc785f', '#7a9a9c', '#c5b17b', '#ba7c63'];
  function create(origin) {
    return { origin, x: origin + 205, vx: 0, length: 112, winch: 0, angle: 0, omega: 0, held: null, recovered: 0, blocked: false,
      boxes: Array.from({ length: 6 }, (_, id) => ({ id, x: origin + 205 + id % 3 * 60, y: geometry.dock + Math.floor(id / 3) * 33, vx: 0, vy: 0, angle: 0, status: 'dock', slot: null, color: colors[id] })) };
  }
  function hook(c) { return { x: c.x + Math.sin(c.angle) * c.length, y: geometry.boom - Math.cos(c.angle) * c.length }; }
  function loaded(c) { return c.boxes.filter(b => b.status === 'loaded').length; }
  function slots(c) {
    return Array.from({ length: 6 }, (_, id) => ({ id, x: c.origin - 47 + id % 3 * 49, y: 26 + Math.floor(id / 3) * 33,
      filled: c.boxes.some(b => b.status === 'loaded' && b.slot === id),
      supported: id < 3 || c.boxes.some(b => b.status === 'loaded' && b.slot === id - 3) }));
  }
  function target(c, x) { return slots(c).find(s => !s.filled && s.supported && Math.abs(s.x - x) <= 20) || null; }
  function grabCandidate(c) {
    if (c.held !== null) return null;
    const h = hook(c);
    return c.boxes.find(b => b.status === 'dock' && Math.abs(h.x - b.x) < 24 && Math.abs(h.y - (b.y + geometry.height + geometry.sling)) < 18 &&
      !c.boxes.some(other => other.id !== b.id && other.status !== 'falling' && Math.abs(other.x - b.x) < geometry.width * .9 && other.y > b.y + 20)) || null;
  }
  function action(c) {
    if (c.held !== null) {
      const b = c.boxes[c.held]; b.status = 'falling'; b.angle = c.angle * .4; c.held = null;
      // Loading guides center a slow release close to a bay. High/fast drops retain momentum.
      const bay = target(c, b.x);
      if (bay && b.y >= bay.y - 2 && b.y < bay.y + 48 && Math.abs(b.vx) < 70) { b.x = bay.x; b.vx = 0; }
      return { changed: true, message: 'CONTAINER RELEASED · Let it settle into a marked bay.' };
    }
    const b = grabCandidate(c);
    if (!b) return { changed: false, message: 'LOWER THE HOOK · Line it up with the top of a dock container, then tap Space.' };
    // Catch at the container's existing lifting point; grabbing never teleports the load.
    const dx = b.x - c.x, dy = geometry.boom - (b.y + geometry.height + geometry.sling);
    c.length = Math.hypot(dx, dy); c.angle = Math.atan2(dx, dy); c.omega *= .35; c.winch = 0;
    b.status = 'held'; b.vx = b.vy = 0; c.held = b.id;
    return { changed: true, message: 'CARGO ATTACHED · W to lift clear, A/D to travel. Tap Space to release.' };
  }
  function floor(c, x, exclude, carrying) {
    let y = -Infinity;
    if (x > c.origin + 177 && x < c.origin + 355) y = geometry.dock;
    if (x > c.origin - 69 && x < c.origin + 79) y = 26;
    // The bridge cannot be dragged through; the hoist has enough travel to clear its mast.
    if (x > c.origin - 170 && x < c.origin - (carrying ? 57 : 78)) y = 146;
    for (const b of c.boxes) if (b.id !== exclude && (b.status === 'dock' || b.status === 'loaded') && Math.abs(x - b.x) < (carrying ? 44 : 25)) y = Math.max(y, b.y + geometry.height + 2);
    const bay = target(c, x); if (bay) y = Math.max(y, bay.y);
    return y;
  }
  function recover(c, b) {
    const columns = [205, 265, 325].map(offset => {
      const x = c.origin + offset;
      return { x, y: Math.max(geometry.dock, ...c.boxes.filter(other => other.id !== b.id && other.status === 'dock' && Math.abs(other.x - x) < 45).map(other => other.y + 33)) };
    }).sort((a, b) => a.y - b.y);
    Object.assign(b, { x: columns[0].x, y: columns[0].y, vx: 0, vy: 0, angle: 0, status: 'dock', slot: null }); c.recovered++;
  }
  function step(c, input, dt) {
    if (dt <= 0) return;
    const before = hook(c), oldX = c.x, oldAngle = c.angle, oldVx = c.vx, oldLength = c.length;
    const horizontal = (input.right ? 1 : 0) - (input.left ? 1 : 0), vertical = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    c.vx += clamp((horizontal * 108 - c.vx) * 6, -250, 250) * dt;
    c.x = clamp(c.x + c.vx * dt, c.origin + geometry.railLeft, c.origin + geometry.railRight);
    if ((c.x <= c.origin + geometry.railLeft && c.vx < 0) || (c.x >= c.origin + geometry.railRight && c.vx > 0)) c.vx = 0;
    c.winch += (vertical * 74 - c.winch) * Math.min(1, dt * 10);
    c.length = clamp(c.length + c.winch * dt, geometry.minLength, geometry.maxLength);
    const lengthSpeed = (c.length - oldLength) / dt, acceleration = (c.vx - oldVx) / dt;
    // Variable-length pendulum: trolley acceleration creates lag, braking creates overshoot,
    // and raising the hoist changes angular momentum. Damping lets careful moves settle.
    c.omega += (-310 / c.length * Math.sin(c.angle) - acceleration / c.length * Math.cos(c.angle) - 2 * lengthSpeed / c.length * c.omega - .92 * c.omega) * dt;
    c.omega = clamp(c.omega, -1.6, 1.6); c.angle += c.omega * dt;
    if (Math.abs(c.angle) > .72) { c.angle = clamp(c.angle, -.72, .72); c.omega *= -.15; }
    c.blocked = false;
    const carrying = c.held !== null, depth = geometry.sling + (carrying ? geometry.height : 0);
    let h = hook(c), ground = floor(c, h.x, c.held, carrying);
    if (h.y - depth < ground) {
      // Side contact stops the trolley instead of snapping a container onto a taller stack.
      if (before.y - depth < ground - 3 && Math.abs(h.x - before.x) > .01) {
        c.x = oldX; c.vx = 0; c.angle = oldAngle; c.omega = 0; c.blocked = true;
        h = hook(c); ground = floor(c, h.x, c.held, carrying);
      }
      if (h.y - depth < ground) { c.length = Math.max(geometry.minLength, (geometry.boom - ground - depth) / Math.cos(c.angle)); c.winch = Math.min(0, c.winch); }
    }
    h = hook(c);
    if (carrying) {
      const b = c.boxes[c.held];
      b.vx = (h.x - b.x) / dt; b.vy = (h.y - depth - b.y) / dt;
      b.x = h.x; b.y = h.y - depth; b.angle = c.angle * .4;
    }
    for (const b of c.boxes) {
      if (b.status !== 'falling') continue;
      const oldBottom = b.y; b.vy -= 310 * dt; b.vx *= Math.exp(-dt * .35); b.x += b.vx * dt; b.y += b.vy * dt; b.angle *= Math.exp(-dt * 2);
      const bay = target(c, b.x), ground = floor(c, b.x, b.id, true);
      if (b.vy < 0 && oldBottom >= ground - 4 && b.y <= ground) {
        if (bay && Math.abs(ground - bay.y) < 3) Object.assign(b, { x: bay.x, y: bay.y, vx: 0, vy: 0, angle: 0, status: 'loaded', slot: bay.id });
        else if (b.x > c.origin + 177 && b.x < c.origin + 355) Object.assign(b, { y: ground, vx: 0, vy: 0, angle: 0, status: 'dock' });
        else recover(c, b);
      } else if (b.y < -70 || Math.abs(b.x - c.origin) > 650) recover(c, b);
    }
  }
  const api = { geometry, colors, create, hook, slots, target, loaded, grabCandidate, action, step };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TideCrane = api;
})(typeof window !== 'undefined' ? window : globalThis);
