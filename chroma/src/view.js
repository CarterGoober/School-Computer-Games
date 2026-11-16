// Three.js presentation layer. The server owns the simulation; this file only
// draws the shared map, avatars, the first-person weapon and cosmetic effects.

import * as THREE from 'three';
import { MAP } from '../../shared/map.js';
import { GUNS, STYLES } from '../../shared/catalog.js';
import { TEAM_COLORS } from '../../shared/protocol.js';

function lerpAngle(from, to, amount) {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta * amount;
}

function hex(number) {
  return `#${(number >>> 0).toString(16).padStart(6, '0')}`;
}

export class SceneView {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(MAP.palette.sky);
    this.scene.fog = new THREE.Fog(MAP.palette.fog, 42, 88);

    this.camera = new THREE.PerspectiveCamera(78, window.innerWidth / window.innerHeight, 0.08, 240);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    this.avatars = new Map();
    this.effects = [];
    this.decor = [];
    this.localId = null;
    this.localLoadout = null;
    this.recoil = 0;
    this.bobTime = 0;
    this.menuTime = 0;
    this.muzzleTimer = 0;

    this.buildLights();
    this.buildMap();
    this.buildWeapon();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xe8fbff, 0x4d7d69, 1.25));
    const sun = new THREE.DirectionalLight(0xfff6df, 1.5);
    sun.position.set(18, 32, 12);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xa9d6ff, 0.55);
    fill.position.set(-22, 16, -14);
    this.scene.add(fill);
  }

  buildMap() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP.half * 2, MAP.half * 2),
      new THREE.MeshLambertMaterial({ color: MAP.palette.ground })
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(MAP.half * 2, 28, MAP.palette.groundLine, MAP.palette.groundLine);
    grid.position.y = 0.015;
    grid.material.opacity = 0.22;
    grid.material.transparent = true;
    grid.material.depthWrite = false;
    this.scene.add(grid);

    for (const box of MAP.boxes) {
      const geometry = new THREE.BoxGeometry(box.w, box.h, box.d);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ color: box.color }));
      mesh.position.set(box.x, box.y + box.h / 2, box.z);
      this.scene.add(mesh);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({ color: 0x203a3d, transparent: true, opacity: 0.22 })
      );
      edges.position.copy(mesh.position);
      this.scene.add(edges);
    }

    const colors = MAP.palette.decor;
    const shapes = [
      () => new THREE.IcosahedronGeometry(0.7, 0),
      () => new THREE.TorusGeometry(0.6, 0.18, 8, 18),
      () => new THREE.SphereGeometry(0.55, 12, 9)
    ];
    for (let i = 0; i < 11; i += 1) {
      const material = new THREE.MeshLambertMaterial({
        color: colors[i % colors.length], transparent: true, opacity: 0.85
      });
      const mesh = new THREE.Mesh(shapes[i % shapes.length](), material);
      const angle = (i / 11) * Math.PI * 2;
      const radius = 17 + (i % 3) * 2.2;
      mesh.position.set(Math.cos(angle) * radius, 5.4 + (i % 4) * 1.5, Math.sin(angle) * radius);
      this.scene.add(mesh);
      this.decor.push({ mesh, baseY: mesh.position.y, speed: 0.3 + (i % 5) * 0.1, phase: i });
    }
  }

  buildWeapon() {
    this.weaponGroup = new THREE.Group();
    const metal = new THREE.MeshLambertMaterial({ color: 0x2a3942 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x1b262c });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.46), metal);
    body.position.set(0, 0, -0.2);
    this.weaponGroup.add(body);

    this.weaponAccentMaterial = new THREE.MeshLambertMaterial({ color: GUNS.popPistol.color });
    const accent = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.035, 0.22), this.weaponAccentMaterial);
    accent.position.set(0, 0.058, -0.24);
    this.weaponGroup.add(accent);

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.18), dark);
    barrel.position.set(0, 0.012, -0.5);
    this.weaponGroup.add(barrel);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.09), dark);
    grip.position.set(0, -0.1, -0.04);
    grip.rotation.x = -0.18;
    this.weaponGroup.add(grip);

    this.muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffe9a3 })
    );
    this.muzzle.position.set(0, 0.012, -0.6);
    this.muzzle.visible = false;
    this.weaponGroup.add(this.muzzle);

    this.weaponGroup.position.set(0.26, -0.24, -0.46);
    this.camera.add(this.weaponGroup);
  }

  resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
  }

  setLoadout(loadout, localId = this.localId) {
    this.localLoadout = loadout;
    this.localId = localId;
    const gun = GUNS[loadout?.gun] || GUNS.popPistol;
    if (this.weaponAccentMaterial) this.weaponAccentMaterial.color.setHex(gun.color);
  }

  makeBar() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 8;
    const context = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture, transparent: true, depthTest: true
    }));
    sprite.scale.set(1.05, 0.13, 1);
    sprite.position.y = 2.06;
    return { canvas, context, texture, sprite, value: -1 };
  }

  drawBar(bar, health) {
    if (bar.value === health) return;
    bar.value = health;
    const { context, canvas, texture } = bar;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(7, 21, 29, 0.8)';
    context.fillRect(0, 0, 64, 8);
    context.fillStyle = health > 50 ? '#6fe3c2' : health > 25 ? '#ffd166' : '#ff6b6b';
    context.fillRect(1, 1, Math.max(0, 62 * (health / 100)), 6);
    texture.needsUpdate = true;
  }

  createAvatar(player) {
    const style = STYLES[player.style] || STYLES.citrus;
    const teamColor = TEAM_COLORS[player.team] ?? 0xffffff;
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: style.body });
    const trimMaterial = new THREE.MeshLambertMaterial({ color: style.trim });

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.72, 4, 10), bodyMaterial);
    body.position.y = 0.95;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 10), bodyMaterial);
    head.position.y = 1.55;
    group.add(head);

    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.1, 0.07),
      new THREE.MeshBasicMaterial({ color: teamColor })
    );
    visor.position.set(0, 1.57, -0.24);
    group.add(visor);

    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.13, 0.26), trimMaterial);
      foot.position.set(side * 0.14, 0.1, -0.02);
      group.add(foot);
    }

    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.15), trimMaterial);
    pack.position.set(0, 1.08, 0.23);
    group.add(pack);

    const gunInfo = GUNS[player.gun] || GUNS.popPistol;
    const gun = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.12, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x2a3942 })
    );
    gun.position.set(0.3, 1.04, -0.22);
    group.add(gun);
    const gunAccent = new THREE.Mesh(
      new THREE.BoxGeometry(0.095, 0.04, 0.2),
      new THREE.MeshLambertMaterial({ color: gunInfo.color })
    );
    gunAccent.position.set(0.3, 1.1, -0.26);
    group.add(gunAccent);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.46, 0.6, 24),
      new THREE.MeshBasicMaterial({
        color: teamColor, transparent: true, opacity: 0.6, side: THREE.DoubleSide
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.03;
    group.add(ring);

    const bar = this.makeBar();
    group.add(bar.sprite);

    return {
      group, body, head, visor, pack, gun, ring, bar,
      styleId: player.style, bodyMaterial, trimMaterial,
      health: -1
    };
  }

  applyStyle(avatar, player) {
    const style = STYLES[player.style] || STYLES.citrus;
    avatar.styleId = player.style;
    avatar.bodyMaterial.color.setHex(style.body);
    avatar.trimMaterial.color.setHex(style.trim);
    avatar.visor.material.color.setHex(TEAM_COLORS[player.team] ?? 0xffffff);
    avatar.ring.material.color.setHex(TEAM_COLORS[player.team] ?? 0xffffff);
  }

  syncPlayers(players, dt, localId = this.localId) {
    if (localId !== null) this.localId = localId;
    const list = Array.isArray(players) ? players : [];
    const seen = new Set();
    const blend = 1 - Math.exp(-16 * Math.min(0.05, Math.max(0.001, dt)));

    for (const player of list) {
      seen.add(player.id);
      let avatar = this.avatars.get(player.id);
      if (!avatar) {
        avatar = this.createAvatar(player);
        avatar.group.position.set(player.x, player.y, player.z);
        this.avatars.set(player.id, avatar);
        this.scene.add(avatar.group);
      }
      if (player.style && avatar.styleId !== player.style) this.applyStyle(avatar, player);

      const visible = player.alive && player.connected;
      avatar.group.visible = visible && player.id !== this.localId;
      if (!visible) continue;

      avatar.group.position.x += (player.x - avatar.group.position.x) * blend;
      avatar.group.position.y += (player.y - avatar.group.position.y) * blend;
      avatar.group.position.z += (player.z - avatar.group.position.z) * blend;
      avatar.group.rotation.y = lerpAngle(avatar.group.rotation.y, player.yaw, blend);

      if (player.health !== avatar.health) {
        avatar.health = player.health;
        this.drawBar(avatar.bar, player.health);
        avatar.bar.sprite.visible = player.health < 100;
      }
    }

    for (const [id, avatar] of [...this.avatars]) {
      if (seen.has(id)) continue;
      this.scene.remove(avatar.group);
      avatar.bar.texture.dispose();
      avatar.bar.sprite.material.dispose();
      this.avatars.delete(id);
    }
  }

  updateCamera(state, yaw, pitch, alive, dt) {
    this.camera.position.set(state.x, state.y + MAP.eyeHeight, state.z);
    this.recoil = Math.max(0, this.recoil - dt * 2.4);
    this.camera.rotation.set(pitch + this.recoil, yaw, 0);
    this.weaponGroup.visible = Boolean(alive);
    if (alive) {
      this.bobTime += dt * 9;
      const bobX = Math.sin(this.bobTime) * 0.008;
      const bobY = Math.abs(Math.cos(this.bobTime)) * 0.01;
      this.weaponGroup.position.set(0.26 + bobX, -0.24 + bobY, -0.46);
    }
    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      if (this.muzzleTimer <= 0) this.muzzle.visible = false;
    }
  }

  menuCamera(dt) {
    this.menuTime += dt;
    const angle = this.menuTime * 0.1;
    const radius = 25.5;
    this.camera.position.set(Math.cos(angle) * radius, 12.5, Math.sin(angle) * radius);
    this.camera.lookAt(0, 1.4, 0);
    this.weaponGroup.visible = false;
    if (this.muzzleTimer > 0) {
      this.muzzleTimer -= dt;
      if (this.muzzleTimer <= 0) this.muzzle.visible = false;
    }
  }

  recoilKick() {
    this.recoil = Math.min(0.055, this.recoil + 0.014);
  }

  muzzleFlash() {
    this.muzzle.visible = true;
    this.muzzleTimer = 0.05;
  }

  addEffect(object) {
    this.effects.push(object);
    this.scene.add(object.mesh);
  }

  tracer(from, to, color = 0xfff1ab) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, from.y, from.z),
      new THREE.Vector3(to.x, to.y, to.z)
    ]);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
    this.addEffect({
      mesh: new THREE.Line(geometry, material),
      kind: 'tracer', life: 0.09, maxLife: 0.09
    });
  }

  impact(point, head = false) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 6, 4),
      new THREE.MeshBasicMaterial({ color: head ? 0xffe066 : 0xfff4cc, transparent: true, opacity: 0.95 })
    );
    mesh.position.set(point.x, point.y, point.z);
    this.addEffect({ mesh, kind: 'spark', life: 0.24, maxLife: 0.24 });
  }

  healRing(position) {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.35, 0.5, 22),
      new THREE.MeshBasicMaterial({
        color: 0x6fe3c2, transparent: true, opacity: 0.85, side: THREE.DoubleSide
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(position.x, position.y + 0.12, position.z);
    this.addEffect({ mesh, kind: 'ring', life: 0.75, maxLife: 0.75 });
  }

  deathPuff(position, team) {
    const color = TEAM_COLORS[team] ?? 0xff8a6b;
    for (let i = 0; i < 7; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.13, 0),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
      );
      mesh.position.set(position.x, position.y + 1, position.z);
      const angle = (i / 7) * Math.PI * 2;
      this.addEffect({
        mesh, kind: 'puff', life: 0.65, maxLife: 0.65,
        velocity: { x: Math.cos(angle) * 1.9, y: 1.6 + (i % 3) * 0.5, z: Math.sin(angle) * 1.9 }
      });
    }
  }

  updateEffects(dt) {
    for (let index = this.effects.length - 1; index >= 0; index -= 1) {
      const effect = this.effects[index];
      effect.life -= dt;
      const progress = 1 - Math.max(0, effect.life) / effect.maxLife;
      if (effect.kind === 'tracer') effect.mesh.material.opacity = Math.max(0, 1 - progress);
      else if (effect.kind === 'spark') {
        effect.mesh.scale.setScalar(1 + progress * 2.4);
        effect.mesh.material.opacity = Math.max(0, 1 - progress);
      } else if (effect.kind === 'ring') {
        effect.mesh.scale.setScalar(1 + progress * 2.6);
        effect.mesh.material.opacity = Math.max(0, 0.85 - progress);
      } else if (effect.kind === 'puff') {
        effect.mesh.position.x += effect.velocity.x * dt;
        effect.mesh.position.y += effect.velocity.y * dt;
        effect.mesh.position.z += effect.velocity.z * dt;
        effect.velocity.y -= 7 * dt;
        effect.mesh.material.opacity = Math.max(0, 0.9 - progress);
      }

      if (effect.life <= 0) {
        this.scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        effect.mesh.material.dispose();
        this.effects.splice(index, 1);
      }
    }
  }

  spinDecor(dt) {
    this.menuTime += 0;
    for (const item of this.decor) {
      item.mesh.rotation.y += dt * item.speed;
      item.mesh.rotation.x += dt * item.speed * 0.4;
      item.mesh.position.y = item.baseY + Math.sin(this.menuTime * 0.9 + item.phase) * 0.35;
    }
  }

  tick(dt) {
    this.spinDecor(dt);
    this.updateEffects(dt);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
