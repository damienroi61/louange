// Processus principal Electron de Louange
const { app, BrowserWindow, ipcMain, screen, protocol, net, shell, session, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');
const remote = require('./remote.cjs');

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true } },
]);

const DIST = path.join(__dirname, '..', 'dist');
const PRELOAD = path.join(__dirname, 'preload.cjs');
const isDev = process.argv.includes('--dev');
const DEV_URL = process.env.LOUANGE_DEV_URL || 'http://localhost:5173/';

/** @type {BrowserWindow | null} */
let mainWin = null;
/** @type {{output: BrowserWindow | null, stage: BrowserWindow | null}} */
const wins = { output: null, stage: null };
const allowedReads = new Set();

function appUrl(hash = '') {
  return isDev ? `${DEV_URL}${hash}` : `app://louange/index.html${hash}`;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}
app.on('second-instance', () => {
  if (mainWin) {
    if (mainWin.isMinimized()) mainWin.restore();
    mainWin.focus();
  }
});

function secureWebContents(wc) {
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && !url.startsWith(DEV_URL)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://') && !url.startsWith(DEV_URL)) e.preventDefault();
  });
}

function createMain() {
  mainWin = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'Louange',
    backgroundColor: '#12141a',
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: false },
  });
  secureWebContents(mainWin.webContents);
  mainWin.once('ready-to-show', () => {
    mainWin.maximize();
    mainWin.show();
  });
  mainWin.loadURL(appUrl());
  mainWin.on('close', (e) => {
    const choice = dialog.showMessageBoxSync(mainWin, {
      type: 'question',
      buttons: ['Quitter', 'Annuler'],
      defaultId: 1,
      cancelId: 1,
      title: 'Quitter Louange',
      message: 'Quitter Louange ? La projection sera arrêtée.',
    });
    if (choice === 1) e.preventDefault();
  });
  mainWin.on('closed', () => {
    mainWin = null;
    for (const k of Object.keys(wins)) wins[k]?.destroy();
    remote.stop();
    app.quit();
  });
}

function pickDisplay(kind, displayId) {
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const chosen = displays.find((d) => d.id === displayId);
  if (chosen) return chosen;
  const others = displays.filter((d) => d.id !== primary.id);
  if (kind === 'output') return others[0] || null;
  return others[1] || null;
}

function openWindow(kind, displayId) {
  const target = pickDisplay(kind, displayId);
  let win = wins[kind];
  if (win && !win.isDestroyed()) {
    if (target) {
      win.setFullScreen(false);
      win.setBounds(target.bounds);
      win.setFullScreen(true);
    }
    win.show();
    return;
  }
  const opts = {
    backgroundColor: '#000000',
    autoHideMenuBar: true,
    title: kind === 'output' ? 'Louange — Sortie' : 'Louange — Moniteur de scène',
    show: false,
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false },
  };
  if (target) Object.assign(opts, { ...target.bounds, frame: false, fullscreen: true });
  else Object.assign(opts, { width: 960, height: 540 });
  win = new BrowserWindow(opts);
  secureWebContents(win.webContents);
  win.setMenu(null);
  win.loadURL(appUrl(`#/${kind}`));
  win.once('ready-to-show', () => {
    win.showInactive();
    if (target) win.setFullScreen(true);
    mainWin?.focus();
  });
  win.on('closed', () => {
    wins[kind] = null;
    mainWin?.webContents.send('window-closed', kind);
  });
  wins[kind] = win;
}

function identifyDisplays() {
  screen.getAllDisplays().forEach((d, i) => {
    const w = new BrowserWindow({
      x: d.bounds.x + Math.round(d.bounds.width / 2) - 200,
      y: d.bounds.y + Math.round(d.bounds.height / 2) - 150,
      width: 400,
      height: 300,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
    });
    const html = `<body style="margin:0;display:grid;place-items:center;height:100vh;background:rgba(20,24,42,.92);color:#e0b04a;font:700 150px Segoe UI,sans-serif;border-radius:24px">${i + 1}<div style="font-size:20px;color:#fff;margin-top:-60px">${d.bounds.width}×${d.bounds.height}</div></body>`;
    w.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    setTimeout(() => !w.isDestroyed() && w.destroy(), 3000);
  });
}

// ---------- Conversion PowerPoint ----------

function run(cmd, args, timeout = 180000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout, windowsHide: true }, (err, stdout, stderr) => resolve({ ok: !err, err, stdout, stderr }));
  });
}

function findSoffice() {
  const candidates =
    process.platform === 'win32'
      ? [
          path.join(process.env['ProgramFiles'] || 'C:\\Program Files', 'LibreOffice', 'program', 'soffice.exe'),
          path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'LibreOffice', 'program', 'soffice.exe'),
        ]
      : process.platform === 'darwin'
        ? ['/Applications/LibreOffice.app/Contents/MacOS/soffice']
        : ['/usr/bin/soffice', '/usr/bin/libreoffice', '/snap/bin/libreoffice'];
  return candidates.find((c) => fs.existsSync(c)) || null;
}

async function convertPresentation(file) {
  if (!file || !fs.existsSync(file)) return { ok: false, error: 'Fichier introuvable' };
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'louange-ppt-'));
  // 1) PowerPoint (Windows) : export fidèle des diapositives en PNG
  if (process.platform === 'win32' && /\.(pptx?|ppsx?|odp)$/i.test(file)) {
    const target = path.join(out, 'slides');
    const ps = [
      "$ErrorActionPreference = 'Stop'",
      '$ppt = New-Object -ComObject PowerPoint.Application',
      `$pres = $ppt.Presentations.Open('${file.replace(/'/g, "''")}', $true, $false, $false)`,
      `$pres.Export('${target.replace(/'/g, "''")}', 'PNG', 1920, 1080)`,
      '$pres.Close()',
      'if ($ppt.Presentations.Count -eq 0) { $ppt.Quit() }',
    ].join('; ');
    const r = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', ps]);
    if (r.ok && fs.existsSync(target)) {
      const files = fs
        .readdirSync(target)
        .filter((f) => /\.png$/i.test(f))
        .sort((a, b) => (parseInt(a.replace(/\D/g, ''), 10) || 0) - (parseInt(b.replace(/\D/g, ''), 10) || 0))
        .map((f) => path.join(target, f));
      if (files.length) {
        files.forEach((f) => allowedReads.add(f));
        return { ok: true, kind: 'images', files };
      }
    }
  }
  // 2) LibreOffice : conversion en PDF
  const soffice = findSoffice();
  if (soffice) {
    const r = await run(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', out, file]);
    const pdf = path.join(out, path.basename(file).replace(/\.[^.]+$/, '.pdf'));
    if (r.ok && fs.existsSync(pdf)) {
      allowedReads.add(pdf);
      return { ok: true, kind: 'pdf', files: [pdf] };
    }
  }
  return { ok: false, error: 'PowerPoint ou LibreOffice introuvable' };
}

// ---------- IPC ----------

ipcMain.handle('displays', () => {
  const primary = screen.getPrimaryDisplay();
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id,
    label: `Écran ${i + 1} — ${d.bounds.width}×${d.bounds.height}${d.id === primary.id ? ' (principal)' : ''}${d.label ? ` — ${d.label}` : ''}`,
    bounds: d.bounds,
    primary: d.id === primary.id,
  }));
});
ipcMain.handle('open-window', (_e, kind, displayId) => openWindow(kind, displayId));
ipcMain.handle('close-window', (_e, kind) => {
  wins[kind]?.close();
});
ipcMain.handle('is-window-open', (_e, kind) => !!(wins[kind] && !wins[kind].isDestroyed()));
ipcMain.handle('identify-displays', () => identifyDisplays());
ipcMain.handle('convert-presentation', (_e, file) => convertPresentation(file));
ipcMain.handle('read-file', (_e, file) => {
  if (!allowedReads.has(file)) throw new Error('Accès refusé');
  return fs.readFileSync(file);
});
ipcMain.handle('remote-start', (_e, port, pin) => remote.start(port, pin, (cmd) => mainWin?.webContents.send('remote-command', cmd)));
ipcMain.handle('remote-stop', () => remote.stop());
ipcMain.on('remote-state', (_e, state) => remote.pushState(state));

// Si un écran est débranché pendant la projection, on replie la fenêtre sur l'écran principal
function onDisplaysChanged() {
  for (const kind of ['output', 'stage']) {
    const w = wins[kind];
    if (!w || w.isDestroyed()) continue;
    const b = w.getBounds();
    const still = screen.getAllDisplays().some((d) => b.x >= d.bounds.x && b.x < d.bounds.x + d.bounds.width && b.y >= d.bounds.y && b.y < d.bounds.y + d.bounds.height);
    if (!still) {
      w.setFullScreen(false);
      w.setBounds({ x: 50, y: 50, width: 960, height: 540 });
    }
  }
}

function buildMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [{ role: 'quit', label: 'Quitter' }],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' },
        { role: 'redo', label: 'Rétablir' },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Recharger' },
        { role: 'togglefullscreen', label: 'Plein écran' },
        { type: 'separator' },
        { role: 'zoomIn', label: 'Zoom avant' },
        { role: 'zoomOut', label: 'Zoom arrière' },
        { role: 'resetZoom', label: 'Taille réelle' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
      ],
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'À propos de Louange',
          click: () =>
            dialog.showMessageBox(mainWin, {
              title: 'Louange',
              message: `Louange ${app.getVersion()}`,
              detail: 'Logiciel de projection pour le culte.\nBibles incluses (domaine public) : Louis Segond 1910, Darby 1885, King James Version.',
            }),
        },
      ],
    },
  ];
  if (process.platform === 'darwin') template.unshift({ role: 'appMenu' });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  protocol.handle('app', (req) => {
    const u = new URL(req.url);
    let p = decodeURIComponent(u.pathname);
    if (!p || p === '/') p = '/index.html';
    const file = path.normalize(path.join(DIST, p));
    if (!file.startsWith(DIST)) return new Response('Interdit', { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  const allowed = new Set(['media', 'fullscreen', 'clipboard-read', 'clipboard-sanitized-write', 'window-management']);
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(allowed.has(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => allowed.has(perm));
  buildMenu();
  screen.on('display-removed', onDisplaysChanged);
  screen.on('display-metrics-changed', onDisplaysChanged);
  createMain();
});

app.on('window-all-closed', () => app.quit());
