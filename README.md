# Apex Circuit

An original low-poly time trial racing game. Three original circuits, a 3D chase camera, keyboard/touch driving, checkpoint recovery, personal bests, optional synthesized engine sound, and offline installation. No external assets, dependencies, accounts, or game links. This is an original game, not PolyTrack or a copy of its code, levels, or artwork.

## Play locally

```sh
cd /workspace/School-Computer-Games
python3 -m http.server 8000 --bind 0.0.0.0
```

Use Chrome to load the server. Keyboard: WASD or arrows to drive, Space to handbrake, C to recover (+2 seconds), R to restart, Escape to pause. Checkpoints must be collected in order before crossing the finish line. Off-road driving slows the car. Inactive windows pause automatically. Personal bests are saved to this browser/device, with a session-only fallback if storage is unavailable.

## Install on a Chromebook

Serve these files on an HTTPS static host (for example, GitHub Pages). Open the hosted app once in Chrome. Wait for **OFFLINE READY**, then choose **Install Apex Circuit** from Chrome's menu or the in-game install button. Launch it from the Chromebook Launcher; it opens in its own standalone app window. After caching, all tracks work without internet. Clearing site data removes offline files and best times. The initial download and installation require an allowed connection and browser installation permissions. This does not bypass school network or device policies. A managed Chromebook may block installation.

Localhost also supports service workers for development. A plain remote HTTP host or opening index.html as a file does not support offline installation. No native ChromeOS executable or extension is needed: this is an installable Progressive Web App. You still need to host it or use a local development server for the first load.

## Validation

```sh
node --check app.js
node --check physics.js
node --check sw.js
node test-physics.cjs
```

Browser smoke checks should cover starting a lap, acceleration and steering, pause/resume, restart, recovery, circuit selection, saved bests, install manifest, and reloading offline after service worker activation. The renderer uses Canvas 2D to project original 3D geometry, with fixed-step driving simulation and capped pixel density for modest hardware. No build step is required.

When changing cached assets, increment the version in `sw.js` so installed clients receive the new bundle.
