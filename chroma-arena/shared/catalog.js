// Chroma Clash item catalog. This file is shared by the client (for menus and
// view models) and the server (for ownership, pricing and combat stats). The
// server always reads stats and prices from here; the browser never supplies
// damage numbers or unlocks.

export const GAME_NAME = 'Chroma Clash';
export const TAGLINE = 'Paint the plaza. Own the block.';
export const CURRENCY = 'Stardust';

export const GUNS = {
  popPistol: {
    id: 'popPistol', name: 'Pop Pistol', kind: 'gun', slot: 'gun', tier: 'Starter',
    price: 0, level: 1, auto: false, damage: 28, interval: 0.27, mag: 12, reload: 1.2,
    range: 70, falloffStart: 26, falloffMin: 0.55, spread: 0.01, pellets: 1,
    headshot: 1.6, color: 0xffcf5c,
    blurb: 'A dependable starter sidearm with a snappy reload.'
  },
  bubbleSmg: {
    id: 'bubbleSmg', name: 'Bubble SMG', kind: 'gun', slot: 'gun', tier: 'Rare',
    price: 350, level: 2, auto: true, damage: 13, interval: 0.085, mag: 34, reload: 1.65,
    range: 52, falloffStart: 18, falloffMin: 0.5, spread: 0.032, pellets: 1,
    headshot: 1.5, color: 0x6fe3c2,
    blurb: 'Fast, foam-soft rounds. Hold the trigger and keep moving.'
  },
  citrusScatter: {
    id: 'citrusScatter', name: 'Citrus Scatter', kind: 'gun', slot: 'gun', tier: 'Rare',
    price: 550, level: 3, auto: false, damage: 10, interval: 0.8, mag: 6, reload: 2.1,
    range: 26, falloffStart: 7, falloffMin: 0.25, spread: 0.085, pellets: 8,
    headshot: 1.35, color: 0xffa64d,
    blurb: 'Eight pellets of sunshine. Devastating around a corner.'
  },
  glacierLance: {
    id: 'glacierLance', name: 'Glacier Lance', kind: 'gun', slot: 'gun', tier: 'Epic',
    price: 800, level: 5, auto: false, damage: 62, interval: 0.95, mag: 5, reload: 2.3,
    range: 110, falloffStart: 70, falloffMin: 0.85, spread: 0.0015, pellets: 1,
    headshot: 1.75, color: 0x8fd6ff,
    blurb: 'A cold, precise marksman rifle. Rewards a steady hand.'
  },
  raveRepeater: {
    id: 'raveRepeater', name: 'Rave Repeater', kind: 'gun', slot: 'gun', tier: 'Epic',
    price: 950, level: 7, auto: true, damage: 19, interval: 0.14, mag: 20, reload: 1.8,
    range: 60, falloffStart: 30, falloffMin: 0.6, spread: 0.02, pellets: 1,
    headshot: 1.6, color: 0xc879ff,
    blurb: 'A thumping, laser-lit automatic with a generous magazine.'
  }
};

export const MELEES = {
  foamBat: {
    id: 'foamBat', name: 'Foam Bat', kind: 'melee', slot: 'melee', tier: 'Starter',
    price: 0, level: 1, damage: 34, interval: 0.55, range: 2.8, arc: 0.7, color: 0xff8a6b,
    blurb: 'Soft on the outside, surprisingly persuasive.'
  },
  yardstick: {
    id: 'yardstick', name: 'Yardstick', kind: 'melee', slot: 'melee', tier: 'Rare',
    price: 300, level: 2, damage: 26, interval: 0.4, range: 3.1, arc: 0.6, color: 0xffd166,
    blurb: 'A meter of measured disagreement. Faster than the bat.'
  }
};

export const HEALS = {
  juiceBox: {
    id: 'juiceBox', name: 'Juice Box', kind: 'heal', slot: 'heal', tier: 'Starter',
    price: 0, level: 1, heal: 45, charges: 2, cooldown: 9, color: 0xffd166,
    blurb: 'Two quick sips. Restores 45 health each.'
  },
  sundaeKit: {
    id: 'sundaeKit', name: 'Sundae Kit', kind: 'heal', slot: 'heal', tier: 'Epic',
    price: 500, level: 4, heal: 80, charges: 1, cooldown: 15, color: 0x6fe3c2,
    blurb: 'One enormous restorative sundae. Restores 80 health.'
  }
};

export const STYLES = {
  citrus: { id: 'citrus', name: 'Citrus Pop', kind: 'style', slot: 'style', tier: 'Starter', price: 0, level: 1, body: 0xffb347, trim: 0xff6b6b, blurb: 'Warm orange with a coral visor.' },
  mint: { id: 'mint', name: 'Mint Fizz', kind: 'style', slot: 'style', tier: 'Rare', price: 150, level: 1, body: 0x7fe0c3, trim: 0x2f6f63, blurb: 'Cool mint with deep green trim.' },
  bubblegum: { id: 'bubblegum', name: 'Bubblegum Static', kind: 'style', slot: 'style', tier: 'Rare', price: 250, level: 2, body: 0xff9ed1, trim: 0x74417f, blurb: 'Bright pink and plum, loud on purpose.' },
  plum: { id: 'plum', name: 'Plum Patrol', kind: 'style', slot: 'style', tier: 'Rare', price: 300, level: 3, body: 0x9c7bd8, trim: 0xffe9a8, blurb: 'A deep violet with a buttery visor.' },
  noir: { id: 'noir', name: 'Noir Racer', kind: 'style', slot: 'style', tier: 'Epic', price: 450, level: 4, body: 0x3b4250, trim: 0xffcf5c, blurb: 'Charcoal plates and a single gold stripe.' },
  chrome: { id: 'chrome', name: 'Chrome Bloom', kind: 'style', slot: 'style', tier: 'Ultra', price: 600, level: 5, body: 0xe8f4ff, trim: 0x8fd6ff, blurb: 'Polished silver with an icy shine.' }
};

export const ITEMS = { ...GUNS, ...MELEES, ...HEALS, ...STYLES };
export const ITEM_IDS = Object.keys(ITEMS);
export const STARTER_ITEMS = ['popPistol', 'foamBat', 'juiceBox', 'citrus'];
export const DEFAULT_LOADOUT = { gun: 'popPistol', melee: 'foamBat', heal: 'juiceBox', style: 'citrus' };
export const MAX_LEVEL = 50;

export function levelForXp(xp) {
  const safe = Math.max(0, Number.isFinite(xp) ? xp : 0);
  const level = Math.floor((1 + Math.sqrt(1 + safe / 25)) / 2);
  return Math.min(MAX_LEVEL, Math.max(1, level));
}

export function xpForLevel(level) {
  const l = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return 100 * (l - 1) * l;
}

export function levelProgress(xp) {
  const level = levelForXp(xp);
  const floorXp = xpForLevel(level);
  const nextXp = level >= MAX_LEVEL ? floorXp : xpForLevel(level + 1);
  return {
    level,
    xp: Math.max(0, Math.floor(xp || 0)),
    into: Math.max(0, Math.floor(xp - floorXp)),
    needed: Math.max(1, nextXp - floorXp),
    atCap: level >= MAX_LEVEL
  };
}

export function isOwned(account, itemId) {
  return Boolean(ITEMS[itemId]) && Array.isArray(account.owned) && account.owned.includes(itemId);
}

export function validLoadout(loadout, account) {
  const fallback = { ...DEFAULT_LOADOUT };
  const source = loadout && typeof loadout === 'object' ? loadout : {};
  const level = account ? levelForXp(account.xp) : 1;
  const result = {};
  for (const slot of ['gun', 'melee', 'heal', 'style']) {
    const item = ITEMS[source[slot]];
    const usable = item && item.slot === slot && account && account.owned.includes(item.id)
      && item.level <= level;
    result[slot] = usable ? item.id : fallback[slot];
  }
  return result;
}

export function loadoutWithStats(loadout) {
  return {
    gun: GUNS[loadout.gun],
    melee: MELEES[loadout.melee],
    heal: HEALS[loadout.heal],
    style: STYLES[loadout.style]
  };
}

export function publicProfile(account) {
  const progress = levelProgress(account.xp);
  return {
    id: account.id,
    name: account.name,
    guest: Boolean(account.guest),
    xp: progress.xp,
    level: progress.level,
    levelInto: progress.into,
    levelNeeded: progress.needed,
    levelAtCap: progress.atCap,
    stardust: account.stardust,
    owned: [...account.owned],
    loadout: { ...account.loadout },
    stats: { ...account.stats },
    createdAt: account.createdAt
  };
}

export function priceOf(itemId) {
  const item = ITEMS[itemId];
  return item ? item.price : null;
}

export function shopListing(account) {
  return ITEM_IDS.map((id) => {
    const item = ITEMS[id];
    return {
      id, name: item.name, kind: item.kind, slot: item.slot, tier: item.tier,
      price: item.price, level: item.level, blurb: item.blurb,
      owned: Boolean(account && account.owned.includes(id)),
      affordable: Boolean(account && account.stardust >= item.price),
      levelMet: Boolean(account && levelForXp(account.xp) >= item.level)
    };
  });
}
