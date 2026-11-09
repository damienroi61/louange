// Serveur de télécommande sur le réseau local (téléphone / tablette)
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

let server = null;
let state = {};
let pin = '';
let onCommand = () => {};
const clients = new Set();
const ACTIONS = new Set(['next', 'prev', 'black', 'logo', 'clear', 'goto', 'gotoItem']);

function lanUrls(port) {
  const urls = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal) urls.push(`http://${a.address}:${port}/`);
    }
  }
  return urls.length ? urls : [`http://localhost:${port}/`];
}

function authorized(req, url) {
  if (!pin) return true;
  return url.searchParams.get('pin') === pin || req.headers['x-louange-pin'] === pin;
}

function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(__dirname, 'remote.html')));
  }
  if (!url.pathname.startsWith('/api/')) {
    res.writeHead(404);
    return res.end();
  }
  if (!authorized(req, url)) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'pin' }));
  }
  if (url.pathname === '/api/state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(state));
  }
  if (url.pathname === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
    res.write(`data: ${JSON.stringify(state)}\n\n`);
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 20000);
    req.on('close', () => {
      clearInterval(ping);
      clients.delete(res);
    });
    return;
  }
  if (url.pathname === '/api/cmd' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 10000) req.destroy();
    });
    req.on('end', () => {
      try {
        const cmd = JSON.parse(body || '{}');
        if (!ACTIONS.has(cmd.action)) throw new Error('action');
        onCommand({
          action: cmd.action,
          item: Number.isInteger(cmd.item) ? cmd.item : undefined,
          slide: Number.isInteger(cmd.slide) ? cmd.slide : undefined,
        });
        res.writeHead(204);
        res.end();
      } catch {
        res.writeHead(400);
        res.end();
      }
    });
    return;
  }
  res.writeHead(404);
  res.end();
}

function start(port, newPin, cb) {
  stop();
  pin = String(newPin || '');
  onCommand = cb;
  return new Promise((resolve) => {
    server = http.createServer(handler);
    server.on('error', (e) => {
      server = null;
      resolve({ ok: false, error: e.code === 'EADDRINUSE' ? `Le port ${port} est déjà utilisé` : String(e.message) });
    });
    server.listen(port, '0.0.0.0', () => resolve({ ok: true, urls: lanUrls(port) }));
  });
}

function stop() {
  for (const c of clients) c.end();
  clients.clear();
  if (server) server.close();
  server = null;
}

function pushState(s) {
  state = s || {};
  const msg = `data: ${JSON.stringify(state)}\n\n`;
  for (const c of clients) c.write(msg);
}

module.exports = { start, stop, pushState };
