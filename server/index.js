// Chroma Clash game server: static site, account/profile API and the
// authoritative WebSocket arena on a single Node process.

import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocketServer } from 'ws';
import { Store } from './store.js';
import { Hub } from './hub.js';
import {
  AuthError, issueToken, loadSecret, verifyToken
} from './auth.js';
import {
  GAME_NAME, TAGLINE, CURRENCY, ITEMS, ITEM_IDS, publicProfile, shopListing
} from '../shared/catalog.js';
import { QUEUE_SIZES } from '../shared/protocol.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BODY_LIMIT = 16 * 1024;
const DEFAULT_FRAME_ANCESTOR = 'https://afterclass-garage-ashen-vale.adoredcarat1.chatgpt.com';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8'
};

function parseAllowedOrigins(env) {
  const configured = (env.CHROMA_ALLOWED_ORIGINS || '')
    .split(',').map((value) => value.trim()).filter(Boolean);
  return new Set(configured);
}

function allowedOrigin(origin, request, allowed) {
  if (!origin) return true;
  if (allowed.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    const host = request.headers.host;
    if (host && parsed.host === host) return true;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return true;
  } catch {
    return false;
  }
  return false;
}

function corsHeaders(request, allowed) {
  const origin = request.headers.origin;
  if (!origin || !allowedOrigin(origin, request, allowed)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin'
  };
}

function sendJson(response, status, payload, extra = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extra
  });
  response.end(body);
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        const error = new Error('Request body too large');
        error.status = 413;
        reject(error);
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          const error = new Error('Expected a JSON object');
          error.status = 400;
          reject(error);
          return;
        }
        resolve(parsed);
      } catch {
        const error = new Error('Invalid JSON');
        error.status = 400;
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function isPublicPath(pathname) {
  if (pathname === '/' || pathname === '/index.html') return true;
  if (['/404.html', '/site.css', '/manifest.webmanifest', '/icon.svg', '/favicon.ico'].includes(pathname)) return true;
  if (!pathname.startsWith('/chroma/')) return false;
  if (!/\.(html|css|js|svg|png|webp|woff2|webmanifest)$/.test(pathname)) return false;
  return !pathname.split('/').some((segment) => segment.startsWith('.'));
}

async function serveStatic(request, response, root, pathname, frameAncestors) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }
  if (pathname === '/chroma') {
    response.writeHead(301, { Location: '/chroma/' });
    response.end();
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  if (!isPublicPath(pathname)) {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    sendJson(response, 400, { error: 'Bad path' });
    return;
  }
  const absolute = path.join(root, decoded);
  if (!absolute.startsWith(root + path.sep)) {
    sendJson(response, 403, { error: 'Forbidden' });
    return;
  }
  let file;
  try {
    file = await readFile(absolute);
  } catch {
    sendJson(response, 404, { error: 'Not found' });
    return;
  }
  const extension = path.extname(absolute).toLowerCase();
  const headers = {
    'Content-Type': MIME[extension] || 'application/octet-stream',
    'Content-Length': file.length,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=300'
  };
  if (extension === '.html') {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self' ws: wss:",
      "object-src 'none'",
      "base-uri 'self'",
      `frame-ancestors ${frameAncestors}`
    ].join('; ');
  }
  response.writeHead(200, headers);
  response.end(request.method === 'HEAD' ? undefined : file);
}

export async function createGameServer(options = {}) {
  const root = options.root || ROOT;
  const dataDir = options.dataDir || process.env.CHROMA_DATA_DIR || path.join(root, '.server-data');
  const allowed = new Set([...parseAllowedOrigins(process.env), ...(options.allowedOrigins || [])]);
  const frameAncestors = options.frameAncestors
    || process.env.CHROMA_FRAME_ANCESTORS
    || `'self' ${DEFAULT_FRAME_ANCESTOR}`;

  let secret = options.secret || loadSecret();
  if (!secret) {
    const secretFile = path.join(dataDir, 'secret');
    try {
      const existing = (await readFile(secretFile, 'utf8')).trim();
      if (existing.length >= 32) secret = existing;
    } catch { /* generate below */ }
    if (!secret) {
      secret = randomBytes(32).toString('hex');
      await mkdir(dataDir, { recursive: true });
      await writeFile(secretFile, `${secret}\n`, { mode: 0o600 });
      console.log('[server] generated a persistent signing secret in the data directory');
    }
  }

  const store = await new Store(path.join(dataDir, 'accounts.json')).init();
  const hub = new Hub({
    store,
    secret,
    botsEnabled: options.botsEnabled ?? process.env.CHROMA_BOTS !== '0',
    botFillDelayMs: options.botFillDelayMs
      ?? Number(process.env.CHROMA_BOT_DELAY_MS ?? 6000)
  });

  const authHits = new Map();
  function authLimited(ip) {
    const now = Date.now();
    const entry = authHits.get(ip);
    if (!entry || now - entry.start > 60000) {
      authHits.set(ip, { start: now, count: 1 });
      return false;
    }
    entry.count += 1;
    return entry.count > 20;
  }

  function bearerAccount(request) {
    const header = request.headers.authorization || '';
    const match = /^Bearer\s+(.+)$/.exec(header);
    if (!match) return null;
    const payload = verifyToken(secret, match[1]);
    return payload ? store.get(payload.sub) : null;
  }

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const cors = corsHeaders(request, allowed);

    if (request.method === 'OPTIONS') {
      if (request.headers.origin && Object.keys(cors).length === 0) {
        sendJson(response, 403, { error: 'Origin not allowed' });
        return;
      }
      response.writeHead(204, cors);
      response.end();
      return;
    }

    if (!url.pathname.startsWith('/api/')) {
      await serveStatic(request, response, root, url.pathname, frameAncestors);
      return;
    }

    if (request.headers.origin && Object.keys(cors).length === 0) {
      sendJson(response, 403, { error: 'Origin not allowed' });
      return;
    }

    try {
      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, {
          ok: true,
          game: GAME_NAME,
          online: hub.onlineCount(),
          queues: hub.queueCounts(),
          queueSizes: QUEUE_SIZES,
          uptime: Math.round(process.uptime())
        }, cors);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/catalog') {
        const account = bearerAccount(request);
        sendJson(response, 200, {
          game: GAME_NAME,
          tagline: TAGLINE,
          currency: CURRENCY,
          items: ITEM_IDS.map((id) => {
            const item = ITEMS[id];
            return {
              id, name: item.name, kind: item.kind, tier: item.tier,
              price: item.price, level: item.level, blurb: item.blurb,
              owned: account ? account.owned.includes(id) : false
            };
          })
        }, cors);
        return;
      }

      const ip = request.socket.remoteAddress || 'unknown';
      const authRoute = ['/api/session', '/api/register', '/api/login'].includes(url.pathname);
      if (authRoute && authLimited(ip)) {
        sendJson(response, 429, { error: 'Too many attempts. Wait a minute.' }, cors);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/session') {
        const account = store.createGuest();
        sendJson(response, 200, {
          token: issueToken(secret, account.id),
          profile: publicProfile(account),
          catalog: shopListing(account)
        }, cors);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/register') {
        const body = await readJson(request);
        const existing = bearerAccount(request);
        const account = existing && existing.guest
          ? await store.upgradeGuest(existing.id, body.username, body.password)
          : await store.createAccount(body.username, body.password);
        sendJson(response, 200, {
          token: issueToken(secret, account.id),
          profile: publicProfile(account),
          catalog: shopListing(account)
        }, cors);
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/login') {
        const body = await readJson(request);
        const account = await store.login(body.username, body.password);
        sendJson(response, 200, {
          token: issueToken(secret, account.id),
          profile: publicProfile(account),
          catalog: shopListing(account)
        }, cors);
        return;
      }

      const account = bearerAccount(request);
      if (url.pathname === '/api/profile') {
        if (!account) {
          sendJson(response, 401, { error: 'Sign in required.' }, cors);
          return;
        }
        if (request.method !== 'GET') {
          sendJson(response, 405, { error: 'Method not allowed' }, cors);
          return;
        }
        sendJson(response, 200, {
          profile: publicProfile(account),
          catalog: shopListing(account)
        }, cors);
        return;
      }

      if (url.pathname === '/api/loadout') {
        if (!account) {
          sendJson(response, 401, { error: 'Sign in required.' }, cors);
          return;
        }
        const body = await readJson(request);
        const result = store.setLoadout(account.id, body.loadout);
        sendJson(response, result.ok ? 200 : 400, {
          ok: result.ok,
          error: result.ok ? undefined : result.error,
          profile: result.ok ? publicProfile(result.account) : null,
          catalog: result.ok ? shopListing(result.account) : null
        }, cors);
        return;
      }

      if (url.pathname === '/api/shop/buy') {
        if (!account) {
          sendJson(response, 401, { error: 'Sign in required.' }, cors);
          return;
        }
        const body = await readJson(request);
        const result = store.buy(account.id, body.itemId, ITEMS);
        const current = store.get(account.id);
        sendJson(response, result.ok ? 200 : 400, {
          ok: result.ok,
          error: result.ok ? undefined : result.error,
          profile: current ? publicProfile(current) : null,
          catalog: current ? shopListing(current) : null
        }, cors);
        return;
      }

      sendJson(response, 404, { error: 'Unknown API route' }, cors);
    } catch (error) {
      if (error instanceof AuthError) {
        sendJson(response, 400, { error: error.message, code: error.code }, cors);
        return;
      }
      if (error.status) {
        sendJson(response, error.status, { error: error.message }, cors);
        return;
      }
      console.error('[http] unhandled error:', error.message);
      sendJson(response, 500, { error: 'Server error' }, cors);
    }
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  server.on('upgrade', (request, socket, head) => {
    let url;
    try {
      url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    } catch {
      socket.destroy();
      return;
    }
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }
    if (!allowedOrigin(request.headers.origin, request, allowed)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (websocket) => {
      wss.emit('connection', websocket, request);
    });
  });
  wss.on('connection', (socket, request) => hub.handleSocket(socket, request));

  let closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    hub.stop();
    await new Promise((resolve) => wss.close(() => resolve()));
    await new Promise((resolve) => server.close(() => resolve()));
    await store.flush();
  }

  return { server, hub, store, secret, close };
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  const port = Number(process.env.PORT || 8787);
  const host = process.env.HOST || '0.0.0.0';
  createGameServer().then(({ server }) => {
    server.listen(port, host, () => {
      console.log(`[server] Chroma Clash listening on http://${host}:${port}`);
      console.log(`[server] game page: http://localhost:${port}/chroma/`);
    });
    const shutdown = () => {
      console.log('[server] shutting down');
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 3000).unref();
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }).catch((error) => {
    console.error('[server] failed to start:', error);
    process.exit(1);
  });
}
