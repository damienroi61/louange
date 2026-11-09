# ✦ Louange — logiciel de projection pour le culte

Louange projette les chants, les passages bibliques, les médias et les présentations pendant le culte. L'opérateur prépare et pilote tout depuis son écran, pendant que le projecteur affiche la sortie en plein écran et qu'un moniteur de scène guide les musiciens.

Application de bureau pour **Windows**, macOS et Linux (Electron). Elle fonctionne aussi dans un navigateur (Chrome / Edge).

---

## Installation (Windows)

**Téléchargement :** sur la page GitHub du projet, ouvrez **Releases** (colonne de droite) et téléchargez le fichier **`Louange-Setup-v….exe`** de la dernière version.

1. Lancez **`Louange-Setup-v….exe`** et suivez l'assistant.
   *Windows SmartScreen peut afficher « Windows a protégé votre ordinateur », car l'installateur n'est pas signé numériquement. Cliquez alors sur « Informations complémentaires », puis « Exécuter quand même ».*
2. Version sans installation : décompressez **`Louange-…-win.zip`** et lancez `Louange.exe`.

Les données (chants, médias, programmes…) sont enregistrées dans le profil de l'utilisateur Windows. Pour les transférer sur un autre ordinateur, utilisez **Paramètres → Sauvegarde**.

---

## Fonctionnalités

### Écran de l'opérateur

```
┌──────────────┬────────────────────────┬────────────────────────┐
│  PROGRAMME   │  APERÇU                │  ● DIRECT              │
│  (ordre du   │  (préparer)            │  (ce que voit          │
│   culte)     │  + miniatures          │   l'assemblée)         │
├──────────────┴────────────────────────┴────────────────────────┤
│  BIBLIOTHÈQUE : Chants · Bible · Médias · Présentations · Thèmes │
└────────────────────────────────────────────────────────────────┘
```

| Domaine | Ce que fait Louange |
|---|---|
| **Programme** | Ordre du culte par glisser-déposer, enregistrement / ouverture de programmes, **export portable** (`.louange`, avec chants et médias) pour un autre ordinateur |
| **Chants** | Bibliothèque avec recherche (titre, paroles, auteur). Sections `[Couplet]`, `[Refrain]`, `[Pont]`, `[Pré-refrain]`… Ordre de passage (`C1 R C2 R P R`), découpage automatique des diapositives, auteur / copyright / CCLI. Import **TXT, OpenLyrics (XML), ChordPro** (les accords sont retirés), JSON. Export OpenLyrics et JSON |
| **Bible** | **Louis Segond 1910**, **Darby 1885** et **King James** incluses (domaine public). Saisie rapide (`Jn 3:16-18`, `Ps 23`, `1 Co 13:4-7`, `Rm 8:38-9:2`), navigation par livre et chapitre, recherche par mots (sans tenir compte des accents), plage de versets (Maj+clic), 1 à 4 versets par diapositive ou découpage automatique, numéros de versets, **affichage de deux traductions** à la fois, **import de Bibles** (Zefania XML, Beblia XML, JSON) |
| **Médias** | Images, vidéos et sons (glisser-déposer), vignettes, projection plein écran, **vidéo ou image en fond** derrière les paroles, contrôles de lecture (lecture, pause, position, volume), logo |
| **Présentations** | Création de diapositives (texte et images, fond par diapositive, notes). Import **PDF** (pages rendues en images) et **PowerPoint** : export fidèle via PowerPoint ou LibreOffice s'ils sont installés, sinon extraction du texte seul |
| **Thèmes** | Fond (couleur, dégradé, image, vidéo), assombrissement, police, taille avec **ajustement automatique**, couleur, gras, italique, majuscules, interligne, alignements, marges, bandeau derrière le texte (style « bas d'écran » pour la diffusion en direct), ombre, contour, pied de page, **transitions** (fondu, glissement, zoom). 7 thèmes fournis. Thème par défaut pour les chants, la Bible et les présentations, ou thème propre à un élément |
| **Direct** | Écran **noir**, **logo**, **sans texte**, **sans fond**, **tout effacer**. Saut direct au couplet ou au refrain au clavier, enchaînement automatique des éléments (option) |
| **Alertes** | Message défilant ou fixe par-dessus la projection (garderie, véhicule mal garé…) avec modèles et numéro |
| **Compte à rebours** | Avant le culte : pendant une durée, ou jusqu'à une heure précise |
| **Moniteur de scène** | Second écran pour les musiciens et l'orateur : texte en cours, texte suivant, horloge, chronomètre / compte à rebours, message de la régie |
| **Autres éléments** | Texte libre / annonces, page web, **caméra ou carte d'acquisition en direct**, écran vide |
| **Écrans** | Choix de l'écran du projecteur et de celui du moniteur de scène, plein écran automatique, bouton « Identifier les écrans », formats 16:9, 16:10 et 4:3 |
| **Télécommande** | Depuis un téléphone ou une tablette sur le même Wi-Fi : suivant / précédent, noir / logo, choix de la diapositive ou du chant, et mode « scène » pour les musiciens. Code PIN facultatif |
| **Sauvegarde** | Sauvegarde complète (avec ou sans médias) et restauration |

### Raccourcis clavier

| Touche | Action |
|---|---|
| `→` `↓` `Espace` `Page suiv.` | Diapositive suivante |
| `←` `↑` `Page préc.` | Diapositive précédente |
| `Début` / `Fin` | Première / dernière diapositive |
| `Entrée` | Envoyer l'aperçu au direct |
| `B` | Écran noir |
| `L` | Logo |
| `C` | Masquer / afficher le texte |
| `X` | Masquer / afficher le fond |
| `Échap` | Tout effacer |
| `1` … `9` | Aller au couplet n° |
| `R` `P` `I` `E` | Refrain, Pont, Intro, Fin |
| `Ctrl+S` | Enregistrer le programme |

Une **télécommande de présentation** USB (ou un pédalier) fonctionne directement, car ces appareils envoient les touches `Page suiv.` et `Page préc.`.

### Format des paroles

```
[Couplet 1]
À toi la gloire, ô Ressuscité !
À toi la victoire pour l'éternité !

[Refrain]
…

[Pont]
…
```

Une ligne vide à l'intérieur d'une section force une nouvelle diapositive. Les noms anglais (`[Verse]`, `[Chorus]`, `[Bridge]`) sont aussi reconnus.

---

## Prise en main en 4 étapes

1. Cliquez sur **Sortie** dans la barre du haut : la projection s'ouvre en plein écran sur le 2ᵉ écran (projecteur).
2. Construisez le **programme** en glissant des chants, des versets ou des médias depuis la bibliothèque, ou avec « + Programme ».
3. Cliquez sur un élément pour le voir dans l'**Aperçu**, puis appuyez sur **Entrée** (ou double-cliquez une diapositive) pour l'envoyer au **Direct**.
4. Pendant le culte, avancez avec les flèches ou la barre d'espace.

---

## Pour les développeurs

Prérequis : [Node.js](https://nodejs.org) 20 ou plus récent.

```bash
npm install
npm run dev            # interface dans le navigateur : http://localhost:5173
npm run electron       # application de bureau
npm test               # tests unitaires (Bible, chants, imports)
npm run dist:win       # installateur Windows → release/
npm run dist:mac       # macOS (à lancer sur un Mac)
npm run dist:linux     # AppImage Linux
```

### Publier une nouvelle version

L'installateur Windows est fabriqué automatiquement par GitHub (fichier `.github/workflows/windows.yml`) :

1. Augmentez le numéro `version` dans `package.json` (par exemple `1.1.0`).
2. Publiez une étiquette du même numéro : `git tag v1.1.0` puis `git push origin v1.1.0`.
3. Après une dizaine de minutes, l'installateur apparaît dans **Releases**.

Vous pouvez aussi lancer la fabrication à la main : onglet **Actions** → « Installateur Windows » → **Run workflow**. Les fichiers sont alors disponibles en bas de la page de l'exécution.

Tests de bout en bout (Playwright) : `npm run preview` dans un terminal, puis `node e2e/smoke.mjs http://localhost:4173/`.

### Structure

```
electron/        Processus principal : fenêtres, écrans, conversion PowerPoint, télécommande
src/lib/         Logique : Bible (références, recherche), chants, diapositives, stockage, imports
src/components/  Rendu des diapositives (le même moteur sert à la sortie, au moniteur et aux miniatures)
src/operator/    Interface de l'opérateur (programme, aperçu, direct, bibliothèque, éditeurs)
src/output/      Fenêtre de projection
src/stage/       Moniteur de scène
public/bibles/   Bibles du domaine public (JSON compact)
```

Les fenêtres communiquent par `BroadcastChannel`, et les données sont stockées dans IndexedDB.

### Limites connues

- **Traductions modernes** (Segond 21, Colombe, Semeur, NBS…) : protégées par le droit d'auteur, elles ne sont pas incluses. Vous pouvez importer un fichier dont vous possédez les droits (bouton « + Bible »).
- **Import PowerPoint fidèle** : il demande Microsoft PowerPoint ou LibreOffice sur l'ordinateur. Sans eux, seul le texte des diapositives est importé. Le PDF fonctionne partout.
- **NDI**, sortie SDI et import des bases EasyWorship (`.ewsx`) : non pris en charge. Pour récupérer vos chants, exportez-les au format texte, OpenLyrics ou ChordPro depuis votre ancien logiciel.
- La conversion PowerPoint via PowerShell et la télécommande sous Windows n'ont pas pu être testées sur une vraie machine Windows pendant le développement.
