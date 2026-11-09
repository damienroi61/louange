import { normalize } from './ids';
import { dbGet } from './db';

export interface BookInfo {
  fr: string;
  en: string;
  abbrFr: string;
  aliases: string[];
}

// 66 livres (canon protestant)
export const BOOKS: BookInfo[] = [
  ['Genèse', 'Genesis', 'Gn', ['ge', 'gen']],
  ['Exode', 'Exodus', 'Ex', ['exo']],
  ['Lévitique', 'Leviticus', 'Lv', ['lev', 'le']],
  ['Nombres', 'Numbers', 'Nb', ['nom', 'num', 'nm']],
  ['Deutéronome', 'Deuteronomy', 'Dt', ['deut', 'de']],
  ['Josué', 'Joshua', 'Jos', ['josh']],
  ['Juges', 'Judges', 'Jg', ['jug', 'judg', 'jdg']],
  ['Ruth', 'Ruth', 'Rt', ['ru']],
  ['1 Samuel', '1 Samuel', '1S', ['1sa', '1sam']],
  ['2 Samuel', '2 Samuel', '2S', ['2sa', '2sam']],
  ['1 Rois', '1 Kings', '1R', ['1ro', '1ki', '1kgs']],
  ['2 Rois', '2 Kings', '2R', ['2ro', '2ki', '2kgs']],
  ['1 Chroniques', '1 Chronicles', '1Ch', ['1chr']],
  ['2 Chroniques', '2 Chronicles', '2Ch', ['2chr']],
  ['Esdras', 'Ezra', 'Esd', ['ezr']],
  ['Néhémie', 'Nehemiah', 'Né', ['ne', 'neh']],
  ['Esther', 'Esther', 'Est', ['esth']],
  ['Job', 'Job', 'Jb', []],
  ['Psaumes', 'Psalms', 'Ps', ['psa', 'psaume', 'psalm', 'pss']],
  ['Proverbes', 'Proverbs', 'Pr', ['pro', 'prov', 'prv']],
  ['Ecclésiaste', 'Ecclesiastes', 'Ec', ['ecc', 'eccl', 'qo', 'qohelet']],
  ['Cantique des cantiques', 'Song of Solomon', 'Ct', ['cant', 'cantique', 'song', 'sos', 'ca']],
  ['Ésaïe', 'Isaiah', 'Es', ['esa', 'isaie', 'is', 'isa']],
  ['Jérémie', 'Jeremiah', 'Jr', ['jer']],
  ['Lamentations', 'Lamentations', 'Lm', ['lam', 'la']],
  ['Ézéchiel', 'Ezekiel', 'Ez', ['eze', 'ezek', 'ezk']],
  ['Daniel', 'Daniel', 'Dn', ['dan', 'da']],
  ['Osée', 'Hosea', 'Os', ['hos']],
  ['Joël', 'Joel', 'Jl', ['joe']],
  ['Amos', 'Amos', 'Am', []],
  ['Abdias', 'Obadiah', 'Ab', ['abd', 'ob', 'obad']],
  ['Jonas', 'Jonah', 'Jon', []],
  ['Michée', 'Micah', 'Mi', ['mic']],
  ['Nahum', 'Nahum', 'Na', ['nah']],
  ['Habacuc', 'Habakkuk', 'Ha', ['hab']],
  ['Sophonie', 'Zephaniah', 'So', ['soph', 'zep', 'zeph']],
  ['Aggée', 'Haggai', 'Ag', ['hag']],
  ['Zacharie', 'Zechariah', 'Za', ['zac', 'zech']],
  ['Malachie', 'Malachi', 'Ml', ['mal']],
  ['Matthieu', 'Matthew', 'Mt', ['mat', 'matt']],
  ['Marc', 'Mark', 'Mc', ['mr', 'mk', 'mrk']],
  ['Luc', 'Luke', 'Lc', ['lu', 'lk']],
  ['Jean', 'John', 'Jn', ['jea', 'joh', 'jhn']],
  ['Actes', 'Acts', 'Ac', ['act', 'actes des apotres']],
  ['Romains', 'Romans', 'Rm', ['rom', 'ro']],
  ['1 Corinthiens', '1 Corinthians', '1Co', ['1cor']],
  ['2 Corinthiens', '2 Corinthians', '2Co', ['2cor']],
  ['Galates', 'Galatians', 'Ga', ['gal']],
  ['Éphésiens', 'Ephesians', 'Ep', ['eph']],
  ['Philippiens', 'Philippians', 'Ph', ['phil', 'php']],
  ['Colossiens', 'Colossians', 'Col', []],
  ['1 Thessaloniciens', '1 Thessalonians', '1Th', ['1thes', '1thess']],
  ['2 Thessaloniciens', '2 Thessalonians', '2Th', ['2thes', '2thess']],
  ['1 Timothée', '1 Timothy', '1Tm', ['1ti', '1tim']],
  ['2 Timothée', '2 Timothy', '2Tm', ['2ti', '2tim']],
  ['Tite', 'Titus', 'Tt', ['tit']],
  ['Philémon', 'Philemon', 'Phm', ['phlm', 'philem']],
  ['Hébreux', 'Hebrews', 'Hé', ['he', 'heb']],
  ['Jacques', 'James', 'Jc', ['jac', 'jas', 'jm']],
  ['1 Pierre', '1 Peter', '1P', ['1pi', '1pe', '1pet']],
  ['2 Pierre', '2 Peter', '2P', ['2pi', '2pe', '2pet']],
  ['1 Jean', '1 John', '1Jn', ['1jea', '1jo', '1joh']],
  ['2 Jean', '2 John', '2Jn', ['2jea', '2jo', '2joh']],
  ['3 Jean', '3 John', '3Jn', ['3jea', '3jo', '3joh']],
  ['Jude', 'Jude', 'Jd', ['jud']],
  ['Apocalypse', 'Revelation', 'Ap', ['apo', 'apoc', 're', 'rev', 'revelation', 'revelations']],
].map(([fr, en, abbrFr, aliases]) => ({ fr, en, abbrFr, aliases })) as BookInfo[];

export interface TranslationInfo {
  id: string;
  name: string;
  short: string;
  lang: string;
  custom?: boolean;
}

export const TRANSLATIONS: TranslationInfo[] = [
  { id: 'lsg1910', name: 'Louis Segond 1910', short: 'LSG', lang: 'fr' },
  { id: 'darby', name: 'Darby 1885', short: 'DBY', lang: 'fr' },
  { id: 'kjv', name: 'King James Version', short: 'KJV', lang: 'en' },
];

let customTranslations: TranslationInfo[] = [];
export function setCustomTranslations(list: TranslationInfo[]) {
  customTranslations = list;
}
export function allTranslations(): TranslationInfo[] {
  return [...TRANSLATIONS, ...customTranslations];
}

export function translationInfo(id: string): TranslationInfo {
  return allTranslations().find((t) => t.id === id) ?? TRANSLATIONS[0];
}

export function bookName(index: number, lang: string = 'fr'): string {
  const b = BOOKS[index];
  if (!b) return '?';
  return lang === 'en' ? b.en : b.fr;
}

export interface BibleData {
  id: string;
  name: string;
  lang: string;
  books: string[][][]; // livre -> chapitre -> versets
}

const cache = new Map<string, Promise<BibleData>>();

export function loadBible(id: string): Promise<BibleData> {
  let p = cache.get(id);
  if (!p) {
    p = customTranslations.some((t) => t.id === id)
      ? dbGet<BibleData>('kv', `bible:${id}`).then((d) => {
          if (!d) throw new Error(`Traduction introuvable : ${id}`);
          return d;
        })
      : fetch(`./bibles/${id}.json`).then((r) => {
          if (!r.ok) throw new Error(`Traduction introuvable : ${id}`);
          return r.json();
        });
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}

export function registerBible(data: BibleData) {
  cache.set(data.id, Promise.resolve(data));
}

// ---------- Analyse des références ----------

const compact = (s: string) => normalize(s).replace(/[\s.]/g, '');

interface AliasEntry {
  key: string;
  book: number;
}
let aliasList: AliasEntry[] | null = null;

function aliases(): AliasEntry[] {
  if (aliasList) return aliasList;
  const list: AliasEntry[] = [];
  BOOKS.forEach((b, i) => {
    const keys = new Set<string>([compact(b.fr), compact(b.en), compact(b.abbrFr), ...b.aliases.map(compact)]);
    for (const k of keys) list.push({ key: k, book: i });
  });
  aliasList = list;
  return list;
}

export function findBook(name: string): number | null {
  let key = compact(name);
  if (!key) return null;
  const list = aliases();
  const exact = list.find((a) => a.key === key);
  if (exact) return exact.book;
  // préfixe unique
  const pref = new Set(list.filter((a) => a.key.startsWith(key)).map((a) => a.book));
  if (pref.size >= 1) {
    // si plusieurs, on prend le premier dans l'ordre canonique
    return Math.min(...pref);
  }
  return null;
}

export interface BibleRef {
  book: number;
  chapter: number;
  verseFrom?: number;
  chapterTo?: number;
  verseTo?: number;
}

const REF_RE = /^\s*((?:[1-3]\s*|i{1,3}\s+))?([^\d]+?)\s*(\d+)?(?:\s*[:.,]\s*(\d+))?(?:\s*[-–—]\s*(\d+)(?:\s*[:.,]\s*(\d+))?)?\s*$/i;

export function parseReference(input: string): BibleRef | null {
  const m = REF_RE.exec(input);
  if (!m) return null;
  let prefix = (m[1] || '').trim().toLowerCase();
  if (prefix === 'i') prefix = '1';
  else if (prefix === 'ii') prefix = '2';
  else if (prefix === 'iii') prefix = '3';
  const book = findBook(prefix + m[2]);
  if (book === null) return null;
  const chapter = m[3] ? parseInt(m[3], 10) : 1;
  const ref: BibleRef = { book, chapter };
  if (m[4]) {
    ref.verseFrom = parseInt(m[4], 10);
    if (m[5] && m[6]) {
      ref.chapterTo = parseInt(m[5], 10);
      ref.verseTo = parseInt(m[6], 10);
    } else if (m[5]) {
      ref.verseTo = parseInt(m[5], 10);
    } else {
      ref.verseTo = ref.verseFrom;
    }
  } else if (m[5] && !m[6]) {
    ref.chapterTo = parseInt(m[5], 10);
  }
  return ref;
}

export interface VerseRef {
  chapter: number;
  verse: number;
  text: string;
}

/** Renvoie la liste des versets couverts par une référence (bornée au texte réel). */
export function versesFor(data: BibleData, ref: BibleRef): VerseRef[] {
  const book = data.books[ref.book];
  if (!book) return [];
  const c1 = Math.max(1, Math.min(ref.chapter, book.length));
  const c2 = Math.max(c1, Math.min(ref.chapterTo ?? c1, book.length));
  const out: VerseRef[] = [];
  for (let c = c1; c <= c2; c++) {
    const verses = book[c - 1] || [];
    let from = 1;
    let to = verses.length;
    if (c === c1 && ref.verseFrom) from = ref.verseFrom;
    if (c === c2 && ref.verseTo) to = Math.min(ref.verseTo, verses.length);
    if (ref.chapterTo === undefined && ref.verseTo === undefined && ref.verseFrom) to = ref.verseFrom;
    for (let v = from; v <= to; v++) {
      if (verses[v - 1] !== undefined) out.push({ chapter: c, verse: v, text: verses[v - 1] });
    }
  }
  return out;
}

export function formatReference(ref: BibleRef, lang = 'fr'): string {
  const name = bookName(ref.book, lang);
  if (!ref.verseFrom) {
    return ref.chapterTo && ref.chapterTo !== ref.chapter ? `${name} ${ref.chapter}-${ref.chapterTo}` : `${name} ${ref.chapter}`;
  }
  if (ref.chapterTo && ref.chapterTo !== ref.chapter) {
    return `${name} ${ref.chapter}:${ref.verseFrom}-${ref.chapterTo}:${ref.verseTo}`;
  }
  if (ref.verseTo && ref.verseTo !== ref.verseFrom) return `${name} ${ref.chapter}:${ref.verseFrom}-${ref.verseTo}`;
  return `${name} ${ref.chapter}:${ref.verseFrom}`;
}

/** Référence compacte d'un groupe de versets. */
export function formatVerseGroup(book: number, verses: VerseRef[], lang = 'fr'): string {
  if (!verses.length) return '';
  const a = verses[0];
  const b = verses[verses.length - 1];
  return formatReference({ book, chapter: a.chapter, verseFrom: a.verse, chapterTo: b.chapter, verseTo: b.verse }, lang);
}

// ---------- Recherche par mot-clé ----------

const normCache = new Map<string, string[]>();

export function searchBible(data: BibleData, query: string, limit = 300) {
  const q = normalize(query).trim();
  if (q.length < 2) return [];
  const words = q.split(/\s+/).filter(Boolean);
  let flat = normCache.get(data.id);
  if (!flat) {
    flat = [];
    for (const b of data.books) for (const c of b) for (const v of c) flat.push(normalize(v));
    normCache.set(data.id, flat);
  }
  const results: { book: number; chapter: number; verse: number; text: string }[] = [];
  let i = 0;
  for (let bi = 0; bi < data.books.length; bi++) {
    const b = data.books[bi];
    for (let ci = 0; ci < b.length; ci++) {
      const c = b[ci];
      for (let vi = 0; vi < c.length; vi++, i++) {
        const t = flat[i];
        if (words.every((w) => t.includes(w))) {
          results.push({ book: bi, chapter: ci + 1, verse: vi + 1, text: c[vi] });
          if (results.length >= limit) return results;
        }
      }
    }
  }
  return results;
}

// ---------- Import de Bibles (Zefania XML, Beblia XML, JSON) ----------

export function parseBibleFile(name: string, content: string): { books: string[][][]; title: string } {
  const clean = (t: string | null) => (t || '').replace(/\s+/g, ' ').trim();
  if (/^\s*[{[]/.test(content)) {
    const d = JSON.parse(content);
    if (!Array.isArray(d.books) || !Array.isArray(d.books[0])) throw new Error('JSON non reconnu');
    return { books: d.books, title: d.name || name };
  }
  const doc = new DOMParser().parseFromString(content, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('XML invalide');
  const books: string[][][] = [];
  const zef = doc.getElementsByTagName('BIBLEBOOK');
  if (zef.length) {
    for (const b of Array.from(zef)) {
      const n = parseInt(b.getAttribute('bnumber') || '0', 10);
      if (n < 1 || n > 66) continue;
      const chs: string[][] = [];
      for (const c of Array.from(b.getElementsByTagName('CHAPTER'))) {
        const ci = parseInt(c.getAttribute('cnumber') || '0', 10) - 1;
        const vs: string[] = [];
        for (const v of Array.from(c.getElementsByTagName('VERS'))) vs[parseInt(v.getAttribute('vnumber') || '0', 10) - 1] = clean(v.textContent);
        chs[ci] = Array.from(vs, (x) => x ?? '');
      }
      books[n - 1] = Array.from(chs, (x) => x ?? []);
    }
    const title = doc.documentElement.getAttribute('biblename') || doc.getElementsByTagName('title')[0]?.textContent || name;
    return { books: fill(books), title };
  }
  const bb = doc.getElementsByTagName('book');
  if (bb.length) {
    for (const b of Array.from(bb)) {
      const n = parseInt(b.getAttribute('number') || '0', 10);
      if (n < 1 || n > 66) continue;
      const chs: string[][] = [];
      for (const c of Array.from(b.getElementsByTagName('chapter'))) {
        const ci = parseInt(c.getAttribute('number') || '0', 10) - 1;
        const vs: string[] = [];
        for (const v of Array.from(c.getElementsByTagName('verse'))) vs[parseInt(v.getAttribute('number') || '0', 10) - 1] = clean(v.textContent);
        chs[ci] = Array.from(vs, (x) => x ?? '');
      }
      books[n - 1] = Array.from(chs, (x) => x ?? []);
    }
    return { books: fill(books), title: doc.documentElement.getAttribute('translation') || name };
  }
  throw new Error('Format non reconnu (formats acceptés : Zefania XML, Beblia XML, JSON Louange)');
}

function fill(books: string[][][]): string[][][] {
  const out = Array.from({ length: 66 }, (_, i) => books[i] ?? []);
  if (out.filter((b) => b.length).length < 1) throw new Error('Aucun livre trouvé');
  return out;
}
