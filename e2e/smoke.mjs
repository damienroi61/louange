// Test de bout en bout : node e2e/smoke.mjs [url] [dossier_captures]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const URL = process.argv[2] || 'http://localhost:4173/';
const OUT = process.argv[3] || 'test-results';
const fs = await import('node:fs');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const ok = (cond, msg) => {
  if (!cond) throw new Error('ÉCHEC : ' + msg);
  console.log('✓', msg);
};

await page.goto(URL);
await page.waitForSelector('.toolbar');
ok((await page.locator('[data-testid=song-row]').count()) >= 3, 'chants d’exemple chargés');

// Ouvrir la sortie (pop-up)
const [output] = await Promise.all([ctx.waitForEvent('page'), page.click('[data-testid=toggle-output]')]);
await output.waitForLoadState();
await output.setViewportSize({ width: 960, height: 540 });

// Ajouter un chant au programme et passer au direct
await page.fill('[data-testid=song-search]', 'gloire');
await page.locator('[data-testid=song-row]').first().click();
await page.locator('[data-testid=lib-add]').first().click();
ok((await page.locator('[data-testid=schedule-item]').count()) === 1, 'chant ajouté au programme');
await page.waitForTimeout(300);
ok((await page.locator('.preview-panel [data-testid=slide-thumb]').count()) === 6, 'aperçu : 6 diapositives (C1 R C2 R C3 R)');
await page.click('[data-testid=go-live]');
await page.waitForTimeout(700);
let outText = await output.locator('.output-root').innerText();
ok(outText.includes('À toi la gloire, ô Ressuscité'), 'la sortie affiche le couplet 1');
ok(outText.includes('Edmond Budry'), 'la sortie affiche l’auteur en pied de page');

// Diapo suivante au clavier
await page.locator('body').press('ArrowRight');
await page.waitForTimeout(700);
outText = await output.locator('.output-root').innerText();
ok(outText.includes('pour l\'éternité') && !outText.includes('Brillant de lumière'), 'flèche droite : refrain affiché');
await page.screenshot({ path: `${OUT}/1-operateur-chant.png` });
await output.screenshot({ path: `${OUT}/2-sortie-refrain.png` });

// Touche 2 → couplet 2
await page.locator('body').press('2');
await page.waitForTimeout(700);
ok((await output.locator('.output-root').innerText()).includes('Vois-le paraître'), 'touche 2 : couplet 2');

// Écran noir
await page.locator('body').press('b');
await page.waitForTimeout(500);
const blackOpacity = await output.locator('.sr-black').evaluate((el) => getComputedStyle(el).opacity);
ok(blackOpacity === '1', 'touche B : écran noir');
await page.locator('body').press('b');

// Bible : Jean 3:16-18
await page.click('text=✝ Bible');
await page.fill('[data-testid=bible-ref]', 'jn 3:16-18');
await page.press('[data-testid=bible-ref]', 'Enter');
await page.waitForTimeout(300);
ok((await page.locator('[data-testid=bible-selection]').innerText()).includes('Jean 3:16-18'), 'référence Jean 3:16-18 reconnue');
await page.locator('[data-testid=lib-live]').first().click();
await page.waitForTimeout(900);
outText = await output.locator('.output-root').innerText();
ok(outText.includes('Car Dieu a tant aimé le monde'), 'la sortie affiche Jean 3:16');
ok(outText.includes('Jean 3:16 (LSG)'), 'la référence est affichée');
await page.screenshot({ path: `${OUT}/3-operateur-bible.png` });
await output.screenshot({ path: `${OUT}/4-sortie-bible.png` });

// Alerte défilante
await page.click('text=Alerte');
await page.fill('[data-testid=alert-text]', 'Parents de l’enfant n° 12, merci de venir à l’accueil.');
await page.click('[data-testid=show-alert]');
await page.waitForTimeout(800);
ok((await output.locator('.output-root').innerText()).includes('enfant n° 12'), 'alerte affichée sur la sortie');
await output.screenshot({ path: `${OUT}/5-sortie-alerte.png` });

// Moniteur de scène
const [stage] = await Promise.all([ctx.waitForEvent('page'), page.click('text=Scène')]);
await stage.setViewportSize({ width: 1280, height: 720 });
await page.waitForTimeout(800);
ok((await stage.locator('.stage-root').innerText()).includes('Car Dieu a tant aimé'), 'moniteur de scène synchronisé');
await stage.screenshot({ path: `${OUT}/6-scene.png` });

// Onglets restants
for (const tab of ['▣ Médias', '▤ Présentations', '🎨 Thèmes']) {
  await page.click(`text=${tab}`);
  await page.waitForTimeout(200);
}
await page.screenshot({ path: `${OUT}/7-themes.png` });

// Éditeur de chant
await page.click('text=♪ Chants');
await page.click('[data-testid=new-song]');
await page.fill('[data-testid=song-title]', 'Chant de test');
await page.fill('[data-testid=song-lyrics]', '[Couplet 1]\nUn\nDeux\n\n[Refrain]\nTrois');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/8-editeur-chant.png` });
await page.click('[data-testid=save-song]');
await page.waitForTimeout(300);
await page.fill('[data-testid=song-search]', 'chant de test');
ok((await page.locator('[data-testid=song-row]').count()) === 1, 'nouveau chant enregistré et trouvé');

// Persistance après rechargement
await page.keyboard.press('Control+s');
await page.reload();
await page.waitForSelector('.toolbar');
ok((await page.locator('[data-testid=schedule-item]').count()) >= 1, 'programme conservé après rechargement');

ok(errors.length === 0, `aucune erreur JavaScript (${errors.join(' | ')})`);
await browser.close();
console.log('Tous les tests de bout en bout ont réussi.');
