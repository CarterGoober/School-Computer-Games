// One authoritative match. Every position, hit, heal, reload and score in this
// file is decided on the server from validated inputs; the browser only gets
// snapshots and cosmetic effect events.

import { randomUUID } from 'node:crypto';
import {
  GUNS, HEALS, MELEES, DEFAULT_LOADOUT, STARTER_ITEMS, validLoadout
} from '../shared/catalog.js';
import { MAP } from '../shared/map.js';
import { stepMovement, spawnAt, eyePosition } from '../shared/movement.js';
import { resolveShot, resolveMelee, shotDirections, castWorld } from '../shared/combat.js';
import {
  TICK_HZ, SNAPSHOT_HZ, MAX_HEALTH, RESPAWN_SECONDS, MATCH_SECONDS,
  SCORE_LIMIT, RECONNECT_GRACE_MS, TEAM_NAMES, clampNumber
} from '../shared/protocol.js';
import { pickBotNames } from './matchmaking.js';

const BOT_LOADOUTS = [
  { ...DEFAULT_LOADOUT, gun: 'popPistol' },
  { ...DEFAULT_LOADOUT, gun: 'bubbleSmg' },
  { ...DEFAULT_LOADOUT, gun: 'popPistol', melee: 'yardstick' }
];

function round(value) {
  return Math.round(value * 100) / 100;
}

function wrapAngle(angle) {
  let value = angle;
  while (value > Math.PI) value -= Math.PI * 2;
  while (value < -Math.PI) value += Math.PI * 2;
  return value;
}

function lerpAngle(from, to, amount) {
  return from + wrapAngle(to - from) * amount;
}

export class Match {
  constructor(options) {
    this.id = randomUUID();
    this.size = options.size;
    this.map = options.map || MAP;
    this.emit = options.emit || (() => {});
    this.onEnd = options.onEnd || (() => {});
    this.now = options.now || (() => Date.now());

    this.players = [];
    this.nextPlayerId = 1;
    this.teamSlots = [0, 0];
    this.score = [0, 0];
    this.time = 0;
    this.tickCount = 0;
    this.snapshotAccumulator = 0;
    this.running = false;
    this.finished = false;
    this.results = null;
    this.winnerTeam = -1;
    this.reason = null;
    this.interval = null;

    for (const human of options.seated || []) {
      const account = human.account;
      this.players.push(this.createPlayer({
        accountId: account.id,
        connId: human.connId,
        name: account.name,
        team: human.team,
        loadout: validLoadout(account.loadout, account),
        bot: false,
        level: account.level || 1
      }));
    }

    const taken = new Set(this.players.map((player) => player.name));
    for (const team of [0, 1]) {
      const count = options.botCounts?.[team] || 0;
      const names = pickBotNames(count, taken);
      for (const name of names) {
        taken.add(name);
        const loadout = BOT_LOADOUTS[this.players.length % BOT_LOADOUTS.length];
        this.players.push(this.createPlayer({
          accountId: null,
          connId: null,
          name,
          team,
          loadout,
          bot: true
        }));
      }
    }
  }

  createPlayer({ accountId, connId, name, team, loadout, bot }) {
    const spawn = this.takeSpawn(team);
    return {
      id: this.nextPlayerId++,
      accountId,
      connId,
      name,
      team,
      bot,
      loadout: { ...DEFAULT_LOADOUT, ...loadout },
      ...spawn,
      health: MAX_HEALTH,
      alive: true,
      connected: true,
      disconnectedAt: 0,
      spawnProtectedUntil: 1,
      kills: 0,
      deaths: 0,
      assists: 0,
      heals: 0,
      damage: 0,
      shots: 0,
      damagers: [],
      input: { fwd: 0, strafe: 0, yaw: spawn.yaw, pitch: 0, jump: false, sprint: false },
      inputAt: 0,
      mag: GUNS[loadout?.gun]?.mag || GUNS.popPistol.mag,
      reloadEndsAt: 0,
      nextFireAt: bot ? 1.2 : 0,
      nextMeleeAt: 0,
      healCharges: HEALS[loadout?.heal]?.charges ?? HEALS.juiceBox.charges,
      healReadyAt: 0
    };
  }

  takeSpawn(team) {
    const list = this.map.spawns[team === 0 ? 'citrus' : 'berry'];
    const slot = this.teamSlots[team]++;
    const point = list[slot % list.length];
    const state = spawnAt(point);
    state.yaw = team === 0 ? 0 : Math.PI;
    return state;
  }

  get weapon() {
    return GUNS;
  }

  start() {
    if (this.running) return this;
    this.running = true;
    this.sendMatchStart();
    this.broadcastState();
    this.interval = setInterval(() => this.tick(1 / TICK_HZ), 1000 / TICK_HZ);
    this.interval.unref?.();
    return this;
  }

  stop() {
    this.running = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  sendMatchStart() {
    const base = {
      t: 'matchStart',
      matchId: this.id,
      size: this.size,
      mapId: this.map.id,
      mapName: this.map.name,
      teamNames: TEAM_NAMES,
      duration: MATCH_SECONDS,
      scoreLimit: SCORE_LIMIT,
      score: [...this.score],
      players: this.serializePlayers()
    };
    for (const player of this.players) {
      if (player.bot || !player.connId) continue;
      this.emit(player.connId, {
        ...base,
        you: player.id,
        team: player.team,
        loadout: player.loadout
      });
    }
  }

  serializePlayer(player) {
    return {
      id: player.id,
      name: player.name,
      team: player.team,
      bot: player.bot,
      x: round(player.x),
      y: round(player.y),
      z: round(player.z),
      yaw: round(player.yaw),
      pitch: round(player.pitch),
      health: Math.max(0, Math.round(player.health)),
      alive: player.alive,
      connected: player.connected,
      kills: player.kills,
      deaths: player.deaths,
      heals: player.heals,
      assists: player.assists,
      bot_loadout: player.bot ? player.loadout.gun : undefined,
      gun: player.loadout.gun,
      style: player.loadout.style,
      mag: player.mag,
      reloading: Boolean(player.reloadEndsAt),
      healCharges: player.healCharges
    };
  }

  serializePlayers() {
    return this.players.map((player) => this.serializePlayer(player));
  }

  snapshot() {
    return {
      t: 'state',
      tick: this.tickCount,
      timeLeft: Math.max(0, round(MATCH_SECONDS - this.time)),
      score: [...this.score],
      players: this.serializePlayers()
    };
  }

  broadcastState() {
    const message = this.snapshot();
    for (const player of this.players) {
      if (player.bot || !player.connId || !player.connected) continue;
      this.emit(player.connId, message);
    }
  }

  resumePayload(player) {
    return {
      t: 'matchResume',
      matchId: this.id,
      size: this.size,
      mapId: this.map.id,
      mapName: this.map.name,
      teamNames: TEAM_NAMES,
      duration: MATCH_SECONDS,
      scoreLimit: SCORE_LIMIT,
      you: player.id,
      team: player.team,
      loadout: player.loadout,
      score: [...this.score],
      timeLeft: Math.max(0, round(MATCH_SECONDS - this.time)),
      players: this.serializePlayers()
    };
  }

  playerFor(accountId) {
    return this.players.find((player) => player.accountId === accountId && !player.bot) || null;
  }

  playerById(playerId) {
    return this.players.find((player) => player.id === playerId) || null;
  }

  setInput(accountId, raw) {
    const player = this.playerFor(accountId);
    if (!player || !player.connected) return false;
    const source = raw && typeof raw === 'object' ? raw : {};
    player.input = {
      fwd: clampNumber(Number(source.fwd), -1, 1, 0),
      strafe: clampNumber(Number(source.strafe), -1, 1, 0),
      yaw: Number.isFinite(Number(source.yaw)) ? Number(source.yaw) : player.yaw,
      pitch: clampNumber(Number(source.pitch), -1.45, 1.45, player.pitch),
      jump: Boolean(source.jump),
      sprint: Boolean(source.sprint)
    };
    player.yaw = player.input.yaw;
    player.pitch = player.input.pitch;
    player.inputAt = this.time;
    return true;
  }

  fireFor(accountId, yaw, pitch) {
    const player = this.playerFor(accountId);
    return player ? this.fire(player, yaw, pitch) : false;
  }

  meleeFor(accountId, yaw) {
    const player = this.playerFor(accountId);
    return player ? this.melee(player, yaw) : false;
  }

  healFor(accountId) {
    const player = this.playerFor(accountId);
    return player ? this.heal(player) : false;
  }

  reloadFor(accountId) {
    const player = this.playerFor(accountId);
    return player ? this.reload(player) : false;
  }

  fire(player, yaw, pitch) {
    if (!this.running || !player.alive || !player.connected) return false;
    const weapon = GUNS[player.loadout.gun] || GUNS.popPistol;
    if (this.time < player.nextFireAt || player.reloadEndsAt) return false;
    if (player.mag <= 0) {
      this.sendToPlayer(player, { t: 'fx', kind: 'empty' });
      return false;
    }
    player.yaw = Number.isFinite(yaw) ? yaw : player.yaw;
    player.pitch = clampNumber(Number(pitch), -1.45, 1.45, player.pitch);
    player.mag -= 1;
    player.shots += 1;
    player.nextFireAt = this.time + weapon.interval;

    const origin = eyePosition(player);
    const directions = shotDirections(weapon, player.yaw, player.pitch);
    const tracers = [];
    let hitPlayer = false;
    let headshot = false;
    let totalDamage = 0;

    for (const direction of directions) {
      const shot = resolveShot({
        origin, direction, weapon, players: this.players, shooter: player, map: this.map
      });
      tracers.push({ x: round(shot.point.x), y: round(shot.point.y), z: round(shot.point.z) });
      if (shot.hit === 'player' && shot.target && shot.target.alive) {
        totalDamage += this.applyDamage(shot.target, player, shot.damage, shot.head);
        hitPlayer = true;
        headshot = headshot || shot.head;
        if (!this.running) break;
      }
    }

    this.broadcast({
      t: 'fx',
      kind: 'shot',
      shooter: player.id,
      gun: player.loadout.gun,
      from: { x: round(origin.x), y: round(origin.y), z: round(origin.z) },
      tracers
    });

    if (hitPlayer) {
      this.sendToPlayer(player, { t: 'fx', kind: 'hit', head: headshot, damage: totalDamage });
    }
    return true;
  }

  melee(player, yaw) {
    if (!this.running || !player.alive || !player.connected) return false;
    const weapon = MELEES[player.loadout.melee] || MELEES.foamBat;
    if (this.time < player.nextMeleeAt) return false;
    player.nextMeleeAt = this.time + weapon.interval;
    player.yaw = Number.isFinite(yaw) ? yaw : player.yaw;
    const origin = eyePosition(player);
    const hit = resolveMelee({
      origin, yaw: player.yaw, weapon, players: this.players, shooter: player, map: this.map
    });

    this.broadcast({
      t: 'fx',
      kind: 'melee',
      shooter: player.id,
      melee: player.loadout.melee,
      from: { x: round(origin.x), y: round(origin.y), z: round(origin.z) },
      yaw: round(player.yaw)
    });

    if (hit) {
      player.shots += 1;
      const damage = this.applyDamage(hit.target, player, hit.damage, false);
      this.sendToPlayer(player, { t: 'fx', kind: 'hit', head: false, damage });
      return true;
    }
    return false;
  }

  heal(player) {
    if (!this.running || !player.alive || !player.connected) return false;
    const item = HEALS[player.loadout.heal] || HEALS.juiceBox;
    if (player.healCharges <= 0) {
      this.sendToPlayer(player, { t: 'fx', kind: 'healEmpty' });
      return false;
    }
    if (this.time < player.healReadyAt) {
      this.sendToPlayer(player, { t: 'fx', kind: 'healCooldown' });
      return false;
    }
    if (player.health >= MAX_HEALTH) return false;
    const amount = Math.min(item.heal, MAX_HEALTH - player.health);
    player.health = Math.min(MAX_HEALTH, player.health + item.heal);
    player.healCharges -= 1;
    player.healReadyAt = this.time + item.cooldown;
    player.heals += 1;
    this.broadcast({
      t: 'fx', kind: 'heal', player: player.id, amount,
      at: { x: round(player.x), y: round(player.y + 1), z: round(player.z) }
    });
    return true;
  }

  reload(player) {
    if (!this.running || !player.alive || !player.connected) return false;
    const weapon = GUNS[player.loadout.gun] || GUNS.popPistol;
    if (player.reloadEndsAt || player.mag >= weapon.mag) return false;
    player.reloadEndsAt = this.time + weapon.reload;
    this.sendToPlayer(player, { t: 'fx', kind: 'reload', duration: weapon.reload });
    return true;
  }

  applyDamage(target, attacker, rawDamage, headshot) {
    if (!this.running || !target.alive || !target.connected) return 0;
    if (this.time < target.spawnProtectedUntil) return 0;
    const damage = Math.max(1, Math.round(rawDamage));
    const dealt = Math.min(target.health, damage);
    target.health -= damage;
    target.damagers.push({ id: attacker.id, at: this.time });
    target.damagers = target.damagers.filter((entry) => this.time - entry.at <= 5);
    attacker.damage += dealt;

    this.sendToPlayer(target, {
      t: 'fx', kind: 'hurt', amount: damage, head: Boolean(headshot),
      from: { x: round(attacker.x), y: round(attacker.y), z: round(attacker.z) }
    });

    if (target.health <= 0) {
      target.health = 0;
      this.killPlayer(target, attacker, headshot);
    }
    return dealt;
  }

  killPlayer(target, killer, headshot) {
    if (!target.alive) return;
    target.alive = false;
    target.deaths += 1;
    target.respawnAt = this.time + RESPAWN_SECONDS;
    target.health = 0;
    target.reloadEndsAt = 0;
    target.healCharges = HEALS[target.loadout.heal]?.charges ?? 1;
    killer.kills += 1;
    this.score[killer.team] += 1;

    const credited = new Set();
    for (const entry of target.damagers) {
      if (entry.id === killer.id || this.time - entry.at > 5) continue;
      const assistant = this.playerById(entry.id);
      if (!assistant || assistant.team !== killer.team) continue;
      if (credited.has(assistant.id)) continue;
      credited.add(assistant.id);
      assistant.assists += 1;
    }

    this.broadcast({
      t: 'fx',
      kind: 'kill',
      killer: { id: killer.id, name: killer.name, team: killer.team },
      victim: { id: target.id, name: target.name, team: target.team },
      headshot: Boolean(headshot),
      score: [...this.score]
    });

    if (this.score[killer.team] >= SCORE_LIMIT) this.end('score');
  }

  respawn(player) {
    if (!this.running) return;
    const spawn = this.takeSpawn(player.team);
    player.x = spawn.x;
    player.y = spawn.y;
    player.z = spawn.z;
    player.vy = 0;
    player.grounded = true;
    player.yaw = spawn.yaw;
    player.pitch = 0;
    player.health = MAX_HEALTH;
    player.alive = true;
    player.spawnProtectedUntil = this.time + 1;
    player.mag = GUNS[player.loadout.gun]?.mag || 12;
    player.reloadEndsAt = 0;
    player.healCharges = HEALS[player.loadout.heal]?.charges ?? 1;
    player.healReadyAt = this.time;
    player.nextFireAt = this.time;
    player.input = { fwd: 0, strafe: 0, yaw: spawn.yaw, pitch: 0, jump: false, sprint: false };
    player.damagers = [];
  }

  tick(dt = 1 / TICK_HZ) {
    if (!this.running) return;
    const step = Math.min(0.05, Math.max(0.001, Number(dt) || 1 / TICK_HZ));
    this.time += step;
    this.tickCount += 1;

    for (const player of [...this.players]) {
      if (!player.connected) {
        if (this.now() - player.disconnectedAt > RECONNECT_GRACE_MS) this.removePlayer(player);
        continue;
      }
      if (player.bot) this.updateBot(player);
      else if (this.time - player.inputAt > 0.6) {
        player.input.fwd = 0;
        player.input.strafe = 0;
        player.input.sprint = false;
      }

      if (player.alive) {
        stepMovement(player, player.input, step, this.map);
        player.input.jump = false;
      } else if (player.respawnAt !== Infinity && this.time >= player.respawnAt) {
        this.respawn(player);
      }

      if (player.reloadEndsAt && this.time >= player.reloadEndsAt) {
        player.mag = GUNS[player.loadout.gun]?.mag || 12;
        player.reloadEndsAt = 0;
      }
    }

    if (!this.running) return;
    this.snapshotAccumulator += step;
    if (this.snapshotAccumulator >= 1 / SNAPSHOT_HZ) {
      this.snapshotAccumulator = 0;
      this.broadcastState();
    }
    if (this.time >= MATCH_SECONDS) this.end('time');
  }

  updateBot(bot) {
    if (!bot.alive) return;
    const enemies = this.players.filter((player) => (
      player.team !== bot.team && player.alive && player.connected
    ));
    if (enemies.length === 0) {
      bot.input.fwd = 0;
      bot.input.strafe = 0;
      return;
    }

    let target = enemies[0];
    let bestDistance = Infinity;
    for (const enemy of enemies) {
      const distance = Math.hypot(enemy.x - bot.x, enemy.z - bot.z);
      if (distance < bestDistance) {
        bestDistance = distance;
        target = enemy;
      }
    }

    const dx = target.x - bot.x;
    const dz = target.z - bot.z;
    const distance = Math.max(0.001, Math.hypot(dx, dz));
    const desiredYaw = Math.atan2(-dx, -dz);
    const sway = Math.sin(this.time * 2.3 + bot.id * 1.7) * 0.055;
    bot.yaw = lerpAngle(bot.yaw, desiredYaw + sway, 0.18);
    const desiredPitch = Math.atan2(
      (target.y + 1.1) - (bot.y + this.map.eyeHeight),
      distance
    );
    bot.pitch = Math.max(-1.2, Math.min(1.2, bot.pitch + (desiredPitch - bot.pitch) * 0.18));
    bot.input.yaw = bot.yaw;
    bot.input.pitch = bot.pitch;

    if (distance > 13) {
      bot.input.fwd = 1;
      bot.input.strafe = 0;
      bot.input.sprint = true;
    } else if (distance < 5) {
      bot.input.fwd = -1;
      bot.input.strafe = Math.sin(this.time * 1.9 + bot.id) > 0 ? 1 : -1;
      bot.input.sprint = false;
    } else {
      bot.input.fwd = 0.25;
      bot.input.strafe = Math.sin(this.time * 1.6 + bot.id * 2.1) > 0 ? 0.9 : -0.9;
      bot.input.sprint = false;
    }
    bot.input.jump = Math.random() < 0.006;

    const origin = eyePosition(bot);
    const toTarget = {
      x: target.x - origin.x,
      y: (target.y + 1.05) - origin.y,
      z: target.z - origin.z
    };
    const length = Math.hypot(toTarget.x, toTarget.y, toTarget.z) || 1;
    const direction = { x: toTarget.x / length, y: toTarget.y / length, z: toTarget.z / length };
    const wall = castWorld(origin, direction, length, this.map);
    const visible = !wall.box || wall.distance >= length - 0.2;

    const weapon = GUNS[bot.loadout.gun] || GUNS.popPistol;
    if (bot.mag <= 0 && !bot.reloadEndsAt) this.reload(bot);
    if (bot.health <= 42 && bot.healCharges > 0 && this.time >= bot.healReadyAt) this.heal(bot);
    if (visible && this.time >= bot.nextFireAt && bot.mag > 0 && distance <= weapon.range) {
      this.fire(bot, bot.yaw + sway * 0.7, bot.pitch);
    }
  }

  disconnect(playerOrAccountId) {
    const player = typeof playerOrAccountId === 'string'
      ? this.playerFor(playerOrAccountId)
      : playerOrAccountId;
    if (!player || !player.connected || this.finished) return false;
    player.connected = false;
    player.alive = false;
    player.disconnectedAt = this.now();
    player.input = { fwd: 0, strafe: 0, yaw: player.yaw, pitch: player.pitch, jump: false, sprint: false };
    this.broadcast({
      t: 'fx', kind: 'left',
      player: { id: player.id, name: player.name, team: player.team },
      reconnectMs: RECONNECT_GRACE_MS
    });
    this.checkAbandonedTeam();
    return true;
  }

  reconnect(accountId, connId) {
    if (this.finished || !this.running) return null;
    const player = this.playerFor(accountId);
    if (!player || player.connected) return null;
    player.connected = true;
    player.connId = connId;
    player.disconnectedAt = 0;
    player.inputAt = this.time;
    this.respawn(player);
    this.broadcast({
      t: 'fx', kind: 'joined',
      player: { id: player.id, name: player.name, team: player.team }
    });
    return player;
  }

  leave(accountId) {
    const player = this.playerFor(accountId);
    if (!player) return false;
    this.removePlayer(player, true);
    return true;
  }

  removePlayer(player, announced = false) {
    const index = this.players.indexOf(player);
    if (index === -1) return;
    this.players.splice(index, 1);
    if (announced) {
      this.broadcast({
        t: 'fx', kind: 'left',
        player: { id: player.id, name: player.name, team: player.team },
        reconnectMs: 0
      });
    }
    this.checkAbandonedTeam();
  }

  checkAbandonedTeam() {
    if (!this.running) return;
    for (const team of [0, 1]) {
      const roster = this.players.filter((player) => player.team === team);
      if (roster.length === 0) continue;
      if (roster.every((player) => !player.connected)) {
        this.end('abandon');
        return;
      }
    }
  }

  end(reason) {
    if (this.finished) return;
    this.finished = true;
    this.reason = reason;
    this.winnerTeam = this.score[0] === this.score[1] ? -1 : (this.score[0] > this.score[1] ? 0 : 1);
    this.stop();

    this.results = this.players.filter((player) => !player.bot && player.accountId).map((player) => {
      const won = this.winnerTeam === player.team;
      const stats = {
        kills: player.kills,
        deaths: player.deaths,
        assists: player.assists,
        heals: player.heals,
        damage: Math.round(player.damage),
        shots: player.shots
      };
      const xp = 40 + stats.kills * 20 + stats.assists * 8 + stats.heals * 6
        + (won ? 150 : 50) + Math.min(120, Math.floor(stats.damage / 10));
      const stardust = 10 + stats.kills * 6 + stats.assists * 2 + stats.heals * 3
        + (won ? 40 : 10);
      return {
        accountId: player.accountId,
        connId: player.connId,
        playerId: player.id,
        name: player.name,
        team: player.team,
        won,
        xp,
        stardust,
        stats
      };
    });

    try {
      this.onEnd(this);
    } catch (error) {
      console.error('[match] end handler failed:', error.message);
    }
  }

  sendToPlayer(player, message) {
    if (!player.connId) return;
    this.emit(player.connId, message);
  }

  broadcast(message) {
    for (const player of this.players) {
      if (player.bot || !player.connId || !player.connected) continue;
      this.emit(player.connId, message);
    }
  }
}
