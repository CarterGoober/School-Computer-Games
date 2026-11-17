// Small HTTP + WebSocket client. The session token lives in localStorage only
// so the browser can reconnect; every unlock and reward is still decided by the
// server.

const TOKEN_KEY = 'chroma-clash-token';

export class NetError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class Net {
  constructor() {
    const configured = typeof window !== 'undefined' ? window.CHROMA_SERVER : '';
    this.base = String(configured || '').replace(/\/+$/, '') || (typeof location !== 'undefined' ? location.origin : 'http://localhost:8787');
    this.socket = null;
    this.token = null;
    this.handlers = new Map();
    this.ready = false;
    this.intentionalClose = false;
    this.authResolve = null;
    this.authReject = null;
    this.lastMessageAt = 0;
  }

  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  emit(type, payload) {
    for (const handler of this.handlers.get(type) || []) {
      try { handler(payload); } catch (error) { console.error(`[net] ${type} handler`, error); }
    }
  }

  async request(path, options = {}) {
    const response = await fetch(`${this.base}${path}`, {
      signal: AbortSignal.timeout(70000),
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    let data = {};
    try { data = await response.json(); } catch { /* empty or non-JSON */ }
    if (!response.ok) throw new NetError(data.error || `Request failed (${response.status})`, response.status, data.code);
    return data;
  }

  get storedToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  storeToken(token) {
    this.token = token;
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* private mode */ }
  }

  clearToken() {
    this.token = null;
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ }
  }

  async ensureSession() {
    const existing = this.storedToken;
    if (existing) {
      try {
        await this.request('/api/profile', { token: existing });
        this.token = existing;
        return existing;
      } catch(error) {
        if(error.status!==401)throw error;
        this.clearToken();
      }
    }
    const session = await this.request('/api/session', { method: 'POST' });
    this.storeToken(session.token);
    return session.token;
  }

  connect(token = this.token) {
    this.token = token;
    this.intentionalClose = false;
    if (this.socket) {
      try {
        this.socket.__chromaIntentional = true;
        this.socket.close();
      } catch { /* noop */ }
      this.socket = null;
    }
    const url = `${this.base.replace(/^http/, 'ws')}/ws`;
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        if(socket){socket.__chromaIntentional=true;socket.close();}
        reject(new Error('The arena server did not respond.'));
      }, 12000);

      let socket;
      try {
        socket = new WebSocket(url);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
        return;
      }
      this.socket = socket;

      const fail = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if(socket){socket.__chromaIntentional=true;socket.close();}
        reject(error);
      };

      this.authResolve = (payload) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.ready = true;
        resolve(payload);
      };
      this.authReject = fail;

      socket.onopen = () => {
        socket.send(JSON.stringify({ t: 'auth', token }));
      };
      socket.onmessage = (event) => {
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if(this.socket!==socket||socket.__chromaIntentional)return;
        this.lastMessageAt = Date.now();
        if (message.t === 'hello') {
          this.emit('hello', message);
          return;
        }
        if (message.t === 'ready') {
          this.emit('ready', message);
          this.authResolve?.(message);
          return;
        }
        if (message.t === 'authError') {
          this.emit('authError', message);
          this.authReject?.(new NetError(message.message || 'Session expired', 401, message.code));
          return;
        }
        this.emit(message.t, message);
      };
      socket.onerror = () => { /* close handler reports it */ };
      socket.onclose = () => {
        if(this.socket!==socket)return;
        this.ready = false;
        if (!settled) fail(new Error('Could not reach the arena server.'));
        this.emit('closed', { intentional: socket.__chromaIntentional === true });
      };
    });
  }

  send(message) {
    if (!this.ready || !this.socket || this.socket.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }

  close() {
    if (this.socket) {
      try {
        this.socket.__chromaIntentional = true;
        this.socket.close();
      } catch { /* noop */ }
    }
    this.socket = null;
    this.ready = false;
  }

  async register(username, password) {
    const data = await this.request('/api/register', {
      method: 'POST',
      body: { username, password },
      token: this.token
    });
    this.storeToken(data.token);
    return data;
  }

  async login(username, password) {
    const data = await this.request('/api/login', {
      method: 'POST',
      body: { username, password }
    });
    this.storeToken(data.token);
    return data;
  }
}
