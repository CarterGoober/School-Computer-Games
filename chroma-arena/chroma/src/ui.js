// DOM interface: lobby, loadout, shop, HUD, kill feed, scoreboard and results.
// All server- or player-supplied strings go through textContent.

import { GUNS, MELEES, HEALS, STYLES, ITEMS } from '../../shared/catalog.js';

const SLOT_LABELS = { gun: 'PRIMARY', melee: 'MELEE', heal: 'HEALING', style: 'STYLE' };
const SLOT_KIND = { gun: 'gun', melee: 'melee', heal: 'heal', style: 'style' };
const SIZE_LABELS = { 1: '1v1', 2: '2v2', 5: '5v5' };

function formatTime(seconds) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

function itemColor(item) {
  const value = item?.body ?? item?.color ?? 0xffb347;
  return `#${(value >>> 0).toString(16).padStart(6, '0')}`;
}

export class UI {
  constructor(options = {}) {
    this.options = options;
    this.profile = null;
    this.catalog = [];
    this.authMode = 'link';
    this.toastTimer = null;
    this.killTimers = new Set();
    this.lastPlayers = [];
    this.youId = null;

    this.el = (id) => document.getElementById(id);
    this.bind();
  }

  bind() {
    const on = (id, event, handler) => {
      const element = this.el(id);
      if (element) element.addEventListener(event, handler);
    };

    for (const button of document.querySelectorAll('.queue-button')) {
      button.addEventListener('click', () => {
        this.options.onSound?.('click');
        this.options.onQueue?.(Number(button.dataset.size));
      });
    }

    on('cancel-queue', 'click', () => {
      this.options.onSound?.('click');
      this.options.onCancelQueue?.();
    });

    on('link-button', 'click', () => {
      this.options.onSound?.('click');
      this.openAuth('link');
    });
    on('login-button', 'click', () => {
      this.options.onSound?.('click');
      this.openAuth('login');
    });
    on('logout-button', 'click', () => {
      this.options.onSound?.('click');
      this.options.onLogout?.();
    });
    on('auth-cancel', 'click', () => this.closeAuth());
    on('auth-form', 'submit', (event) => {
      event.preventDefault();
      const form = this.el('auth-form');
      const data = new FormData(form);
      this.options.onAuth?.({
        mode: this.authMode,
        username: String(data.get('username') || ''),
        password: String(data.get('password') || '')
      });
    });

    on('result-continue', 'click', () => {
      this.options.onSound?.('click');
      this.options.onContinue?.();
    });
    on('resume-button', 'click', () => this.options.onResume?.());
    on('leave-button', 'click', () => this.options.onLeave?.());
    on('connect-retry', 'click', () => this.options.onRetry?.());
    on('sensitivity', 'input', (event) => {
      this.options.onSensitivity?.(Number(event.target.value));
    });
    on('lock-prompt', 'click', () => this.options.onRequestLock?.());
  }

  setSound(fn) {
    this.options.onSound = fn;
  }

  setStatus(text, mode = 'ok') {
    const element = this.el('server-status');
    if (!element) return;
    element.textContent = text;
    const pill = element.closest('.server-pill');
    if (pill) pill.dataset.mode = mode;
  }

  setPopulation(counts) {
    const element = this.el('population');
    if (!element || !counts) return;
    const total = Object.values(counts).reduce((sum, value) => sum + (Number(value) || 0), 0);
    element.textContent = total === 0
      ? 'No one else is queued right now.'
      : `${total} runner${total === 1 ? '' : 's'} in queues`;
  }

  renderProfile(profile, catalog) {
    this.profile = profile;
    this.catalog = catalog || this.catalog;
    if (!profile) return;

    this.el('account-name').textContent = profile.name;
    this.el('guest-badge').textContent = profile.guest ? 'GUEST' : 'SAVED';
    this.el('guest-badge').classList.toggle('live', !profile.guest);
    this.el('account-stardust').textContent = `${profile.stardust.toLocaleString()} ✦`;
    this.el('account-level').textContent = `LEVEL ${profile.level}`;
    const percent = profile.levelAtCap ? 100 : Math.min(100, (profile.levelInto / profile.levelNeeded) * 100);
    this.el('xp-fill').style.width = `${percent}%`;
    this.el('account-xp').textContent = profile.levelAtCap
      ? `${profile.xp.toLocaleString()} XP · MAX`
      : `${profile.levelInto.toLocaleString()} / ${profile.levelNeeded.toLocaleString()} XP`;

    this.el('link-button').hidden = !profile.guest;
    this.el('login-button').hidden = false;
    this.el('logout-button').hidden = profile.guest;
    if (!profile.guest) this.closeAuth();

    this.renderLoadout(profile);
    this.renderShop(profile, this.catalog);
  }

  renderLoadout(profile) {
    const grid = this.el('loadout-grid');
    grid.replaceChildren();
    for (const slot of ['gun', 'melee', 'heal', 'style']) {
      const row = document.createElement('div');
      row.className = 'slot';

      const swatch = document.createElement('span');
      swatch.className = 'slot-swatch';
      const selected = ITEMS[profile.loadout[slot]] || ITEMS[slot === 'style' ? 'citrus' : 'popPistol'];
      if (slot === 'style') {
        swatch.style.setProperty('--swatch-a', itemColor(selected));
        swatch.style.setProperty('--swatch-b', itemColor({ color: selected.trim }));
      } else {
        swatch.style.setProperty('--swatch-a', itemColor(selected));
        swatch.style.setProperty('--swatch-b', '#f5eeda');
      }

      const label = document.createElement('label');
      label.textContent = SLOT_LABELS[slot];
      const select = document.createElement('select');
      select.dataset.slot = slot;
      const kind = SLOT_KIND[slot];
      for (const id of profile.owned) {
        const item = ITEMS[id];
        if (!item || item.kind !== kind) continue;
        const option = document.createElement('option');
        option.value = id;
        option.textContent = item.name;
        option.selected = profile.loadout[slot] === id;
        select.append(option);
      }
      select.addEventListener('change', () => {
        this.options.onSound?.('click');
        this.options.onLoadout?.({ ...profile.loadout, [slot]: select.value });
      });

      label.append(select);
      row.append(swatch, label);
      grid.append(row);
    }
  }

  renderShop(profile, catalog) {
    const grid = this.el('shop-grid');
    grid.replaceChildren();
    const entries = [...(catalog || [])].sort((a, b) => {
      if (a.owned !== b.owned) return a.owned ? 1 : -1;
      const order = { gun: 0, melee: 1, heal: 2, style: 3 };
      return (order[a.kind] ?? 9) - (order[b.kind] ?? 9) || a.price - b.price;
    });

    for (const entry of entries) {
      const item = ITEMS[entry.id];
      if (!item) continue;
      const card = document.createElement('div');
      card.className = `shop-item${entry.owned ? ' owned' : ''}`;

      const dot = document.createElement('span');
      dot.className = 'shop-dot';
      dot.style.setProperty('--dot', itemColor(item));

      const copy = document.createElement('div');
      copy.className = 'shop-copy';
      const name = document.createElement('b');
      name.textContent = item.name;
      const blurb = document.createElement('small');
      blurb.textContent = item.blurb;
      copy.append(name, blurb);

      if (entry.owned) {
        const owned = document.createElement('span');
        owned.className = 'shop-owned';
        owned.textContent = 'OWNED';
        card.append(dot, copy, owned);
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'shop-buy';
        button.textContent = `${item.price.toLocaleString()} ✦`;
        if (!entry.levelMet) {
          button.disabled = true;
          button.title = `Unlocks at level ${item.level}`;
          button.textContent = `LV ${item.level}`;
        } else if (!entry.affordable) {
          button.disabled = true;
          button.title = 'Not enough Stardust yet';
        }
        button.addEventListener('click', () => {
          this.options.onSound?.('click');
          this.options.onBuy?.(entry.id);
        });
        card.append(dot, copy, button);
      }
      grid.append(card);
    }
  }

  openAuth(mode) {
    this.authMode = mode;
    this.el('auth-form').hidden = false;
    this.el('auth-title').textContent = mode === 'login' ? 'Welcome back' : 'Save this runner';
    this.el('auth-submit').textContent = mode === 'login' ? 'Log in' : 'Save my progress';
    this.el('auth-note').textContent = mode === 'login'
      ? 'Log in to bring your unlocks to this browser.'
      : 'Your unlocks already live on the game server. Linking a name lets you return from any device.';
    this.el('auth-error').textContent = '';
    const username = this.el('auth-form').querySelector('[name=username]');
    username.focus();
  }

  closeAuth() {
    this.el('auth-form').hidden = true;
    this.el('auth-error').textContent = '';
    this.el('auth-form').reset();
  }

  authError(message) {
    this.el('auth-error').textContent = message || 'Something went wrong.';
  }

  authBusy(busy) {
    const button = this.el('auth-submit');
    button.disabled = busy;
    button.textContent = busy ? 'Working…' : (this.authMode === 'login' ? 'Log in' : 'Save my progress');
  }

  renderQueued(message) {
    this.el('queue-status').textContent = `Searching for a ${SIZE_LABELS[message.size] || ''} match… you are #${message.position} in line.`;
    this.el('queue-status').classList.add('active');
    this.el('cancel-queue').hidden = false;
    for (const button of document.querySelectorAll('.queue-button')) {
      button.classList.toggle('selected', Number(button.dataset.size) === message.size);
    }
    if (!message.botFillDelayMs) {
      this.el('queue-status').textContent += ' Practice bots are disabled on this server.';
    }
  }

  clearQueue() {
    this.el('queue-status').textContent = 'Pick a size to join the queue.';
    this.el('queue-status').classList.remove('active');
    this.el('cancel-queue').hidden = true;
    for (const button of document.querySelectorAll('.queue-button')) {
      button.classList.remove('selected');
    }
  }

  showLobby() {
    this.el('lobby').hidden = false;
    this.el('hud').hidden = true;
    this.el('result').hidden = true;
    this.el('pause').hidden = true;
    this.el('menu-grade').hidden = false;
    this.el('lock-prompt').hidden = true;
    this.el('killfeed').replaceChildren();
  }

  showMatch(message) {
    this.el('lobby').hidden = true;
    this.el('result').hidden = true;
    this.el('hud').hidden = false;
    this.el('menu-grade').hidden = true;
    this.el('pause').hidden = true;
    this.el('match-mode').textContent = SIZE_LABELS[message.size] || '';
    this.el('match-timer').textContent = formatTime(message.duration ?? 240);
    this.el('score-citrus').textContent = '0';
    this.el('score-berry').textContent = '0';
    this.el('killfeed').replaceChildren();
    this.lastPlayers = message.players || [];
    this.youId = message.you;
    this.setRespawn(null);
  }

  updateHUD(snapshot, self, loadout) {
    if (!snapshot || !self) return;
    const gun = GUNS[loadout?.gun] || GUNS.popPistol;
    this.el('score-citrus').textContent = String(snapshot.score?.[0] ?? 0);
    this.el('score-berry').textContent = String(snapshot.score?.[1] ?? 0);
    this.el('match-timer').textContent = formatTime(snapshot.timeLeft ?? 0);

    const health = Math.max(0, Math.round(self.health));
    this.el('health-value').textContent = String(health);
    this.el('health-fill').style.width = `${health}%`;
    this.el('health-fill').parentElement.classList.toggle('low', health <= 30);

    const heal = HEALS[loadout?.heal] || HEALS.juiceBox;
    this.el('heal-state').textContent = `${heal.name.toUpperCase()} ×${self.healCharges ?? 0}`;
    this.el('ammo-value').textContent = String(self.mag ?? 0);
    this.el('ammo-mag').textContent = String(gun.mag);
    this.el('weapon-name').textContent = gun.name.toUpperCase();
    this.el('reload-state').textContent = self.reloading ? 'RELOADING…' : '';
    this.el('crosshair').classList.toggle('wide', !self.alive);
    this.lastPlayers = snapshot.players || this.lastPlayers;
  }

  setRespawn(seconds) {
    const element = this.el('respawn');
    if (seconds === null) {
      element.hidden = true;
      return;
    }
    element.hidden = false;
    this.el('respawn-time').textContent = String(Math.max(0, Math.ceil(seconds)));
  }

  hitMarker(head) {
    const marker = this.el('hitmarker');
    marker.classList.toggle('head', Boolean(head));
    marker.classList.remove('show');
    void marker.offsetWidth;
    marker.classList.add('show');
    clearTimeout(this.hitMarkerTimer);
    this.hitMarkerTimer = setTimeout(() => marker.classList.remove('show'), 110);
  }

  damageFlash() {
    const flash = this.el('damage-flash');
    flash.classList.add('show');
    clearTimeout(this.damageTimer);
    this.damageTimer = setTimeout(() => flash.classList.remove('show'), 130);
  }

  addKill(event, youId) {
    const line = document.createElement('div');
    line.className = 'kill-line';
    if (event.killer?.id === youId) line.classList.add('you');
    else if (event.killer?.bot || event.victim?.bot) line.classList.add('bot');

    const killer = document.createElement('b');
    killer.textContent = event.killer?.name || 'Someone';
    const middle = document.createElement('span');
    middle.textContent = event.headshot ? ' ⌖ splatted ' : ' splatted ';
    const victim = document.createElement('b');
    victim.textContent = event.victim?.name || 'someone';
    line.append(killer, middle, victim);

    const feed = this.el('killfeed');
    feed.append(line);
    while (feed.children.length > 5) feed.firstElementChild.remove();
    const timer = setTimeout(() => {
      line.remove();
      this.killTimers.delete(timer);
    }, 6000);
    this.killTimers.add(timer);
  }

  addNotice(text) {
    const line = document.createElement('div');
    line.className = 'kill-line';
    line.textContent = text;
    const feed = this.el('killfeed');
    feed.append(line);
    while (feed.children.length > 5) feed.firstElementChild.remove();
    const timer = setTimeout(() => {
      line.remove();
      this.killTimers.delete(timer);
    }, 5000);
    this.killTimers.add(timer);
  }

  toggleScoreboard(show, players = this.lastPlayers, youId = this.youId) {
    const element = this.el('scoreboard');
    element.hidden = !show;
    if (!show) return;
    const body = this.el('scoreboard-body');
    body.replaceChildren();
    const sorted = [...players].sort((a, b) => (
      (a.team - b.team) || ((b.kills || 0) - (a.kills || 0)) || a.name.localeCompare(b.name)
    ));
    for (const player of sorted) {
      const row = document.createElement('div');
      row.className = `score-row${player.id === youId ? ' you' : ''}`;
      const name = document.createElement('span');
      name.textContent = player.name;
      if (player.bot) {
        const bot = document.createElement('em');
        bot.textContent = 'BOT';
        name.append(bot);
      }
      const team = document.createElement('span');
      team.className = `tag ${player.team === 0 ? 'citrus' : 'berry'}`;
      team.textContent = player.team === 0 ? 'CITRUS' : 'BERRY';
      const kills = document.createElement('span');
      kills.textContent = String(player.kills ?? '—');
      const deaths = document.createElement('span');
      deaths.textContent = String(player.deaths ?? '—');
      const heals = document.createElement('span');
      heals.textContent = String(player.heals ?? '—');
      row.append(name, team, kills, deaths, heals);
      body.append(row);
    }
  }

  showPause(show) {
    this.el('pause').hidden = !show;
    if (show) this.el('scoreboard').hidden = true;
  }

  showResult(data) {
    const you = data.you || {};
    const won = Boolean(you.won);
    const draw = data.winnerTeam === -1;
    this.el('result-kicker').textContent = data.reason === 'abandon'
      ? 'MATCH ENDED · A TEAM LEFT'
      : data.reason === 'time' ? 'MATCH COMPLETE · TIME' : 'MATCH COMPLETE';
    this.el('result-title').textContent = draw ? 'A draw.' : won ? 'Victory.' : 'Defeat.';
    this.el('result-score').textContent = `${data.score?.[0] ?? 0} — ${data.score?.[1] ?? 0}  ·  ${SIZE_LABELS[data.size] || ''}`;

    const stats = you.stats || {};
    const grid = this.el('result-stats');
    grid.replaceChildren();
    for (const [label, value] of [
      ['ELIMS', stats.kills || 0],
      ['DEATHS', stats.deaths || 0],
      ['HEALS', stats.heals || 0],
      ['DAMAGE', stats.damage || 0]
    ]) {
      const cell = document.createElement('div');
      const number = document.createElement('b');
      number.textContent = String(value);
      const caption = document.createElement('span');
      caption.textContent = label;
      cell.append(number, caption);
      grid.append(cell);
    }

    const rewards = this.el('reward-row');
    rewards.replaceChildren();
    for (const [text, className] of [
      [`+${you.xp || 0} XP`, 'reward'],
      [`+${you.stardust || 0} ✦`, 'reward']
    ]) {
      const pill = document.createElement('span');
      pill.className = className;
      pill.textContent = text;
      rewards.append(pill);
    }
    if (data.profile && data.profile.level > (this.profile?.level ?? 0)) {
      const level = document.createElement('span');
      level.className = 'reward level';
      level.textContent = `LEVEL ${data.profile.level} REACHED`;
      rewards.append(level);
    }

    this.el('hud').hidden = true;
    this.el('lobby').hidden = true;
    this.el('pause').hidden = true;
    this.el('result').hidden = false;
    this.el('menu-grade').hidden = true;
  }

  hideResult() {
    this.el('result').hidden = true;
  }

  toast(text, duration = 3800) {
    const element = this.el('toast');
    element.textContent = text;
    element.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => element.classList.remove('show'), duration);
  }

  connecting(title, note, canRetry = false) {
    this.el('connect-overlay').hidden = false;
    this.el('connect-title').textContent = title;
    this.el('connect-note').textContent = note;
    this.el('connect-retry').hidden = !canRetry;
  }

  hideConnecting() {
    this.el('connect-overlay').hidden = true;
  }

  setLockPrompt(show) {
    this.el('lock-prompt').hidden = !show;
  }

  setTouchNote(show) {
    this.el('touch-note').hidden = !show;
    this.el('touch-note').style.display = show ? 'block' : 'none';
  }

  setSensitivity(value) {
    const slider = this.el('sensitivity');
    if (slider) slider.value = String(value);
  }
}
