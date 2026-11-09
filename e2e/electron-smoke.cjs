// Test de l'application de bureau : xvfb-run node e2e/electron-smoke.cjs [dossier_captures]
const { _electron: electron } = require('playwright');
const path = require('path');
const OUT = process.argv[2] || 'test-results';
require('fs').mkdirSync(OUT, { recursive: true });

(async () => {
  const app = await electron.launch({
    executablePath: require('electron'),
    args: [path.join(__dirname, '..'), '--no-sandbox'],
    env: { ...process.env, ELECTRON_DISABLE_SECURITY_WARNINGS: '1' },
  });
  const ok = (c, m) => {
    if (!c) throw new Error('ÉCHEC : ' + m);
    console.log('✓', m);
  };
  const win = await app.firstWindow();
  const errors = [];
  win.on('pageerror', (e) => errors.push(e.message));
  await win.waitForSelector('.toolbar', { timeout: 20000 });
  ok(win.url().startsWith('app://louange/'), 'chargée via le protocole app://');
  ok(await win.evaluate(() => !!window.louange?.isElectron), 'pont Electron disponible');
  const displays = await win.evaluate(() => window.louange.getDisplays());
  ok(displays.length >= 1, `écrans détectés : ${displays.map((d) => d.label).join(', ')}`);

  // Bible chargée via app://
  await win.click('text=✝ Bible');
  await win.fill('[data-testid=bible-ref]', 'Ps 23');
  await win.press('[data-testid=bible-ref]', 'Enter');
  await win.waitForSelector('.verse');
  ok((await win.locator('.verse').count()) === 6, 'Psaume 23 : 6 versets chargés');

  // Ouvrir la sortie via le processus principal
  const outPromise = app.waitForEvent('window');
  await win.click('[data-testid=toggle-output]');
  const out = await outPromise;
  await out.waitForSelector('.output-root');
  await win.locator('[data-testid=lib-live]').first().click();
  await out.waitForFunction(() => document.body.innerText.includes("L'Eternel est mon berger"), null, { timeout: 5000 });
  ok(true, 'la fenêtre de sortie Electron affiche le Psaume 23');
  await win.screenshot({ path: `${OUT}/electron-operateur.png` });
  await out.screenshot({ path: `${OUT}/electron-sortie.png` });

  // Télécommande
  const r = await win.evaluate(() => window.louange.remote.start(18091, ''));
  ok(r.ok, `télécommande démarrée : ${r.urls?.join(' ')}`);
  await win.evaluate(() => window.louange.remote.stop());

  ok(errors.length === 0, 'aucune erreur JavaScript ' + errors.join(' | '));
  await app.evaluate(({ app }) => app.exit(0));
  console.log('Application de bureau : OK');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
