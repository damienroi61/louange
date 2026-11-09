import type { AlertConfig, Settings, Song, Theme, Timer } from '../types';
import { newSong } from './songs';

const base: Omit<Theme, 'id' | 'name' | 'background'> = {
  overlayOpacity: 0,
  font: {
    family: 'Segoe UI, Inter, Helvetica, Arial, sans-serif',
    size: 84,
    autoFit: true,
    color: '#ffffff',
    bold: true,
    italic: false,
    uppercase: false,
    lineHeight: 1.25,
    letterSpacing: 0,
  },
  align: 'center',
  vAlign: 'middle',
  box: { top: 7, left: 7, right: 7, bottom: 12, bgColor: '#000000', bgOpacity: 0, radius: 0, padding: 0 },
  shadow: { enabled: true, color: '#000000', blur: 12, x: 3, y: 3 },
  outline: { enabled: false, color: '#000000', width: 2 },
  footer: { show: true, size: 34, color: '#e6e6e6', align: 'center' },
  transition: { type: 'fade', duration: 400 },
};

const t = (id: string, name: string, patch: Partial<Theme>): Theme => ({
  ...structuredClone(base),
  id,
  name,
  background: { type: 'color', color: '#000000' },
  builtIn: true,
  ...patch,
});

export const BUILTIN_THEMES: Theme[] = [
  t('th-nuit', 'Nuit bleue', { background: { type: 'gradient', from: '#0b1633', to: '#24467f', angle: 160 } }),
  t('th-ecriture', 'Écriture', {
    background: { type: 'gradient', from: '#1b130d', to: '#4a3320', angle: 135 },
    font: { ...base.font, family: 'Georgia, "Times New Roman", serif', bold: false, size: 72, color: '#fff7e6' },
    align: 'left',
    footer: { show: true, size: 38, color: '#f0c987', align: 'right' },
  }),
  t('th-noir', 'Classique noir', { background: { type: 'color', color: '#000000' }, shadow: { ...base.shadow, enabled: false } }),
  t('th-aube', 'Aube', { background: { type: 'gradient', from: '#ff8a4c', to: '#5b2a86', angle: 200 } }),
  t('th-foret', 'Forêt', { background: { type: 'gradient', from: '#0c2b1d', to: '#2f6b45', angle: 170 } }),
  t('th-bas', "Bas d'écran (diffusion)", {
    background: { type: 'color', color: '#00b140' },
    font: { ...base.font, size: 56, autoFit: true },
    vAlign: 'bottom',
    box: { top: 70, left: 5, right: 5, bottom: 5, bgColor: '#0d1220', bgOpacity: 0.85, radius: 18, padding: 28 },
    shadow: { ...base.shadow, enabled: false },
    footer: { show: true, size: 28, color: '#cfd6e6', align: 'right' },
  }),
  t('th-clair', 'Présentation claire', {
    background: { type: 'gradient', from: '#ffffff', to: '#e9edf5', angle: 180 },
    font: { ...base.font, color: '#1b2233', size: 64, bold: false },
    align: 'left',
    vAlign: 'top',
    shadow: { ...base.shadow, enabled: false },
    footer: { show: true, size: 30, color: '#5b6478', align: 'left' },
  }),
];

export const FALLBACK_THEME = BUILTIN_THEMES[0];

export const DEFAULT_SETTINGS: Settings = {
  aspect: '16:9',
  maxLinesPerSlide: 4,
  defaultTranslation: 'lsg1910',
  versesPerSlide: 1,
  showVerseNumbers: true,
  autoAdvanceItems: false,
  defaultSongTheme: 'th-nuit',
  defaultBibleTheme: 'th-ecriture',
  defaultPresentationTheme: 'th-nuit',
  stageShowNext: true,
  stageFontSize: 64,
  remoteEnabled: false,
  remotePort: 8090,
  remotePin: '',
  libraryHeight: 300,
};

export const DEFAULT_TIMER: Timer = { mode: 'stopwatch', running: false, startedAt: 0, accumulated: 0, durationMs: 30 * 60000 };

export const DEFAULT_ALERT: AlertConfig = {
  id: 'alert-default',
  text: '',
  position: 'bottom',
  mode: 'scroll',
  bgColor: '#b3261e',
  color: '#ffffff',
  size: 52,
  speed: 160,
  repeat: 3,
};

export const ALERT_TEMPLATES = [
  "Parents de l'enfant n° {n}, merci de vous présenter à l'accueil des enfants.",
  'Le propriétaire du véhicule immatriculé {n} est prié de se présenter à l’accueil.',
  'Bienvenue à tous ! Le culte va commencer dans quelques instants.',
];

// Chants du domaine public pour démarrer
export function seedSongs(): Song[] {
  return [
    newSong({
      title: 'À toi la gloire',
      author: 'Edmond Budry (1884) — G. F. Haendel',
      copyright: 'Domaine public',
      tags: 'Pâques, louange',
      lyrics: `[Couplet 1]
À toi la gloire, ô Ressuscité !
À toi la victoire pour l'éternité !
Brillant de lumière, l'ange est descendu,
Il roule la pierre du tombeau vaincu.

[Refrain]
À toi la gloire, ô Ressuscité !
À toi la victoire pour l'éternité !

[Couplet 2]
Vois-le paraître : c'est lui, c'est Jésus,
Ton Sauveur, ton Maître, oh ! ne doute plus !
Sois dans l'allégresse, peuple du Seigneur,
Et redis sans cesse : le Christ est vainqueur !

[Couplet 3]
Craindrais-je encore ? Il vit à jamais,
Celui que j'adore, le Prince de paix ;
Il est ma victoire, mon puissant soutien,
Ma vie et ma gloire : non, je ne crains rien !`,
      arrangement: 'C1 R C2 R C3 R',
    }),
    newSong({
      title: 'Amazing Grace',
      author: 'John Newton (1779)',
      copyright: 'Public domain',
      tags: 'grace, hymn',
      lyrics: `[Verse 1]
Amazing grace! How sweet the sound
That saved a wretch like me!
I once was lost, but now am found;
Was blind, but now I see.

[Verse 2]
'Twas grace that taught my heart to fear,
And grace my fears relieved;
How precious did that grace appear
The hour I first believed.

[Verse 3]
Through many dangers, toils and snares,
I have already come;
'Tis grace hath brought me safe thus far,
And grace will lead me home.

[Verse 4]
When we've been there ten thousand years,
Bright shining as the sun,
We've no less days to sing God's praise
Than when we'd first begun.`,
    }),
    newSong({
      title: 'Doxology (Old Hundredth)',
      author: 'Thomas Ken (1674)',
      copyright: 'Public domain',
      tags: 'doxology',
      lyrics: `Praise God, from whom all blessings flow;
Praise Him, all creatures here below;
Praise Him above, ye heavenly host;
Praise Father, Son, and Holy Ghost. Amen.`,
    }),
  ];
}
