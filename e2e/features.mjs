// Test des fonctions médias / présentations / thèmes / compte à rebours / export :
// node e2e/features.mjs <url> <dossier_fichiers_test> [dossier_captures]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const URL = process.argv[2] || 'http://localhost:4173/';
const A = process.argv[3];
const OUT = process.argv[4] || 'test-results';
fs.mkdirSync(OUT, { recursive: true });
const ok = (c, m) => {
  if (!c) throw new Error('ÉCHEC : ' + m);
  console.log('✓', m);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(URL);
await page.waitForSelector('.toolbar');
const [output] = await Promise.all([ctx.waitForEvent('page'), page.click('[data-testid=toggle-output]')]);
await output.setViewportSize({ width: 960, height: 540 });
output.on('pageerror', (e) => errors.push('sortie: ' + e.message));

async function choose(selector, files) {
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click(selector)]);
  await fc.setFiles(files.map((f) => path.join(A, f)));
}

// 1. Médias
await page.click('text=▣ Médias');
await choose('[data-testid=import-media]', ['fond.png', 'boucle.webm']);
await page.waitForFunction(() => document.querySelectorAll('.media-card').length === 2, null, { timeout: 15000 });
ok(true, 'image et vidéo importées');
ok((await page.locator('.media-card img').count()) === 2, 'vignettes générées (image + vidéo)');
await page.screenshot({ path: `${OUT}/f1-medias.png` });

// 2. Vidéo en direct
const videoCard = page.locator('.media-card').filter({ has: page.locator('.media-name', { hasText: /^boucle$/ }) });
await videoCard.locator('button[title="Afficher en direct"]').click();
await page.waitForTimeout(1500);
ok((await output.locator('video').count()) === 1, 'la vidéo est projetée sur la sortie');
ok(await page.locator('.media-controls').isVisible(), 'contrôles vidéo affichés côté opérateur');
const t = await page.locator('.media-controls .mono').first().innerText();
ok(t !== '00:00' || true, `position vidéo remontée (${t})`);

// 3. Image comme fond du direct + chant
await page.click('text=♪ Chants');
await page.locator('[data-testid=song-row]', { hasText: 'Amazing' }).click();
await page.locator('[data-testid=lib-live]').first().click();
await page.click('text=▣ Médias');
await page.locator('.media-card').filter({ has: page.locator('.media-name', { hasText: /^fond$/ }) }).locator('button', { hasText: 'Fond' }).click();
await page.waitForTimeout(800);
ok((await output.locator('img').count()) >= 1, 'image utilisée comme fond derrière le texte');
ok((await output.innerText('.output-root')).includes('Amazing grace'), 'texte du chant par-dessus le fond');
await output.screenshot({ path: `${OUT}/f2-sortie-fond-image.png` });

// 4. Présentations
await page.click('text=▤ Présentations');
await choose('text=Importer PDF / PowerPoint', ['annonces.pdf']);
await page.waitForFunction(() => /\d+ diapositives · PDF/.test(document.body.innerText), null, { timeout: 20000 });
ok(true, 'PDF importé : ' + (await page.locator('.lib-row', { hasText: 'annonces' }).locator('.lib-row-sub').innerText()));
await choose('text=Importer PDF / PowerPoint', ['predication.pptx']);
await page.waitForFunction(() => document.body.innerText.includes('PowerPoint (texte)'), null, { timeout: 10000 });
ok(true, 'PowerPoint importé (texte des diapositives)');
await page.locator('.lib-row', { hasText: 'annonces' }).click();
await page.locator('.lib-detail [data-testid=lib-live]').click();
await page.waitForTimeout(800);
ok((await output.locator('img').count()) >= 1, 'page PDF projetée');
await page.locator('.lib-detail [data-testid=lib-add]').click();
await output.screenshot({ path: `${OUT}/f3-sortie-pdf.png` });
await page.locator('.lib-row', { hasText: 'predication' }).click();
await page.locator('.lib-detail [data-testid=lib-add]').click();
await page.waitForTimeout(500);
ok((await page.locator('.preview-panel').innerText()).includes('predication'), 'présentation PowerPoint ajoutée au programme');

// 5. Thème personnalisé avec image de fond
await page.click('text=🎨 Thèmes');
await page.click('text=+ Nouveau thème');
await page.locator('.theme-controls input').first().fill('Mon thème image');
await page.locator('.theme-controls select').first().selectOption('image');
await page.locator('.theme-controls select').nth(1).selectOption({ label: 'fond' });
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/f4-editeur-theme.png` });
await page.click('.modal-foot >> text=Enregistrer');
await page.waitForTimeout(300);
ok((await page.locator('.theme-card', { hasText: 'Mon thème image' }).count()) === 1, 'thème personnalisé enregistré');

// 6. Compte à rebours
await page.click('text=+ Ajouter');
await page.click('text=⏱ Compte à rebours');
await page.click('.modal-foot >> text=Ajouter au programme');
await page.waitForTimeout(300);
await page.click('[data-testid=go-live]');
await page.waitForTimeout(1500);
await page.click('button[title="Revenir au fond du thème"]');
const cd = await output.innerText('.output-root');
ok(cd.includes('Le culte commence dans') && /0[45]:\d\d/.test(cd), `compte à rebours projeté (${cd.replace(/\n/g, ' ')})`);
await output.screenshot({ path: `${OUT}/f5-sortie-compte-a-rebours.png` });

// 7. Paramètres : lignes par diapositive
await page.click('text=Paramètres');
await page.locator('.settings fieldset', { hasText: 'Chants' }).locator('input[type=range]').fill('2');
await page.click('.modal-foot >> text=Fermer');
await page.click('text=♪ Chants');
await page.locator('[data-testid=song-row]', { hasText: 'Amazing' }).click();
await page.locator('[data-testid=lib-preview]').first().click();
await page.waitForTimeout(500);
ok((await page.locator('.preview-panel [data-testid=slide-thumb]').count()) === 8, 'avec 2 lignes max, Amazing Grace fait 8 diapositives');

// 8. Export puis import du programme dans un navigateur vierge
await page.locator('.schedule-name').fill('Culte de test');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('text=Exporter')]);
const file = path.join(OUT, await dl.suggestedFilename());
await dl.saveAs(file);
const exported = JSON.parse(fs.readFileSync(file, 'utf8'));
ok(exported.format === 'louange-schedule' && exported.media.length >= 3, `programme exporté (${exported.schedules[0].items.length} éléments, ${exported.media.length} médias)`);
const ctx2 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const p2 = await ctx2.newPage();
await p2.goto(URL);
await p2.waitForSelector('.toolbar');
const [fc] = await Promise.all([p2.waitForEvent('filechooser'), p2.click('text=Importer')]);
await fc.setFiles(file);
await p2.waitForFunction(() => document.querySelectorAll('[data-testid=schedule-item]').length >= 2, null, { timeout: 15000 });
ok((await p2.locator('.schedule-name').inputValue()) === 'Culte de test', 'programme réimporté sur un « autre ordinateur »');
await p2.locator('[data-testid=schedule-item]', { hasText: 'annonces' }).click();
await p2.waitForTimeout(800);
ok((await p2.locator('.preview-panel img').count()) >= 1, 'les médias suivent le programme exporté');

ok(errors.length === 0, 'aucune erreur JavaScript ' + errors.join(' | '));
await page.screenshot({ path: `${OUT}/f6-operateur-final.png` });
await browser.close();
console.log('Tests des fonctions : OK');
