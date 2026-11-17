// "Sundae Square" — an original, symmetrical arena for Chroma Clash.
// Boxes are axis-aligned solids shared by the server (collision + line of
// sight) and the client (rendering). The layout is mirrored across the X axis
// so neither team gets a cover advantage.

function box(x, z, w, d, h, y, color, name) {
  return { x, z, w, d, h, y, color, name };
}

function buildSundaeSquare() {
  const boxes = [];
  const add = (...args) => boxes.push(box(...args));

  // Arena floor is flat at y = 0 and measures 42 x 42 units.
  const half = 21;

  // Perimeter walls.
  add(0, -22, 46, 2, 3.2, 0, '#7a6cff', 'north wall');
  add(0, 22, 46, 2, 3.2, 0, '#7a6cff', 'south wall');
  add(-22, 0, 2, 46, 3.2, 0, '#7a6cff', 'west wall');
  add(22, 0, 2, 46, 3.2, 0, '#7a6cff', 'east wall');

  // Central raised plaza with two low steps on either side.
  add(0, 0, 9, 9, 0.9, 0, '#ffd166', 'center platform');
  add(0, 5.6, 5, 2.2, 0.45, 0, '#ffe6a3', 'south step');
  add(0, -5.6, 5, 2.2, 0.45, 0, '#ffe6a3', 'north step');
  add(6.2, 0, 2.2, 5, 0.45, 0, '#ffe6a3', 'east step');
  add(-6.2, 0, 2.2, 5, 0.45, 0, '#ffe6a3', 'west step');

  // Tall central pillars give the platform a defensible crown.
  add(-3.1, -3.1, 2.2, 2.2, 2.4, 0.9, '#ff8a6b', 'center pillar');
  add(3.1, 3.1, 2.2, 2.2, 2.4, 0.9, '#ff8a6b', 'center pillar');

  // Long sightline blockers and jumpable cover, mirrored north/south.
  add(-11, 0, 1.4, 7, 2.3, 0, '#6fe3c2', 'west screen');
  add(11, 0, 1.4, 7, 2.3, 0, '#6fe3c2', 'east screen');
  add(-11, 10, 6, 1.4, 1.1, 0, '#ff9ed1', 'west barricade');
  add(11, -10, 6, 1.4, 1.1, 0, '#ff9ed1', 'east barricade');
  add(-11, -10, 6, 1.4, 1.1, 0, '#ff9ed1', 'west barricade');
  add(11, 10, 6, 1.4, 1.1, 0, '#ff9ed1', 'east barricade');

  // Corner cupcake towers and mid crates. All are mirrored.
  add(16, 16, 4, 4, 2.2, 0, '#b892ff', 'corner tower');
  add(-16, -16, 4, 4, 2.2, 0, '#b892ff', 'corner tower');
  add(16, -16, 4, 4, 2.2, 0, '#b892ff', 'corner tower');
  add(-16, 16, 4, 4, 2.2, 0, '#b892ff', 'corner tower');

  add(15, 7, 2, 2, 1.1, 0, '#ffd166', 'crate');
  add(-15, -7, 2, 2, 1.1, 0, '#ffd166', 'crate');
  add(15, -7, 2, 2, 1.1, 0, '#ffd166', 'crate');
  add(-15, 7, 2, 2, 1.1, 0, '#ffd166', 'crate');
  add(7, 15, 2, 2, 1.1, 0, '#ffd166', 'crate');
  add(-7, -15, 2, 2, 1.1, 0, '#ffd166', 'crate');
  add(7, -15, 2, 2, 1.1, 0, '#ffd166', 'crate');
  add(-7, 15, 2, 2, 1.1, 0, '#ffd166', 'crate');

  // Sniper perches in each corner, with low ramps up to them.
  add(16.4, 16.4, 1.4, 3, 1.0, 0, '#ffe6a3', 'ramp');
  add(-16.4, -16.4, 1.4, 3, 1.0, 0, '#ffe6a3', 'ramp');
  add(16.4, -16.4, 1.4, 3, 1.0, 0, '#ffe6a3', 'ramp');
  add(-16.4, 16.4, 1.4, 3, 1.0, 0, '#ffe6a3', 'ramp');

  const spawns = {
    // Citrus spawns south and faces north (-Z, yaw 0).
    citrus: [-12, -6, 0, 6, 12].map((x) => ({ x, y: 0, z: 17.5, yaw: 0 })),
    // Berry spawns north and faces south (+Z, yaw PI).
    berry: [-12, -6, 0, 6, 12].map((x) => ({ x, y: 0, z: -17.5, yaw: Math.PI }))
  };

  const palette = {
    sky: 0x9fe1ff,
    fog: 0xbfe9ff,
    ground: '#9adbc0',
    groundLine: '#7fc9ad',
    decor: [0xff8a6b, 0xffd166, 0x6fe3c2, 0xb892ff, 0xff9ed1]
  };

  return {
    id: 'sundae-square',
    name: 'Sundae Square',
    half,
    bounds: 20.4,
    eyeHeight: 1.62,
    playerHeight: 1.7,
    boxes,
    spawns,
    palette
  };
}

export const MAP = buildSundaeSquare();
