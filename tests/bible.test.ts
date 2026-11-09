import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { findBook, formatReference, parseReference, searchBible, versesFor, type BibleData } from '../src/lib/bible';
import { groupVerses } from '../src/lib/slides';

const lsg = JSON.parse(readFileSync('public/bibles/lsg1910.json', 'utf8')) as BibleData;

describe('références bibliques', () => {
  it('reconnaît les noms et abréviations français et anglais', () => {
    expect(findBook('Jean')).toBe(42);
    expect(findBook('jn')).toBe(42);
    expect(findBook('John')).toBe(42);
    expect(findBook('1 Jean')).toBe(61);
    expect(findBook('1jn')).toBe(61);
    expect(findBook('Psaume')).toBe(18);
    expect(findBook('Ps')).toBe(18);
    expect(findBook('Ésaïe')).toBe(22);
    expect(findBook('esaie')).toBe(22);
    expect(findBook('Isaïe')).toBe(22);
    expect(findBook('Apoc')).toBe(65);
    expect(findBook('1 Co')).toBe(45);
    expect(findBook('Hébreux')).toBe(57);
    expect(findBook('Cantique')).toBe(21);
    expect(findBook('zzz')).toBeNull();
  });

  it('analyse les différentes formes de références', () => {
    expect(parseReference('Jean 3:16')).toEqual({ book: 42, chapter: 3, verseFrom: 16, verseTo: 16 });
    expect(parseReference('jn 3.16-18')).toEqual({ book: 42, chapter: 3, verseFrom: 16, verseTo: 18 });
    expect(parseReference('Ps 23')).toEqual({ book: 18, chapter: 23 });
    expect(parseReference('1 Co 13:4-7')).toEqual({ book: 45, chapter: 13, verseFrom: 4, verseTo: 7 });
    expect(parseReference('Romains 8:38-9:2')).toEqual({ book: 44, chapter: 8, verseFrom: 38, chapterTo: 9, verseTo: 2 });
    expect(parseReference('II Rois 2')).toEqual({ book: 11, chapter: 2 });
    expect(parseReference('Isaïe 53:5')).toEqual({ book: 22, chapter: 53, verseFrom: 5, verseTo: 5 });
    expect(parseReference('Genèse 1 - 2')).toEqual({ book: 0, chapter: 1, chapterTo: 2 });
    expect(parseReference('n’importe quoi 3')).toBeNull();
  });

  it('extrait les versets (y compris sur deux chapitres)', () => {
    const v = versesFor(lsg, { book: 42, chapter: 3, verseFrom: 16, verseTo: 16 });
    expect(v).toHaveLength(1);
    expect(v[0].text).toMatch(/^Car Dieu a tant aimé le monde/);
    const cross = versesFor(lsg, { book: 44, chapter: 8, verseFrom: 38, chapterTo: 9, verseTo: 2 });
    expect(cross.map((x) => `${x.chapter}:${x.verse}`)).toEqual(['8:38', '8:39', '9:1', '9:2']);
    expect(versesFor(lsg, { book: 18, chapter: 23 })).toHaveLength(6);
    expect(versesFor(lsg, { book: 42, chapter: 3, verseFrom: 35, verseTo: 99 }).length).toBe(2);
  });

  it('formate les références', () => {
    expect(formatReference({ book: 42, chapter: 3, verseFrom: 16, verseTo: 18 })).toBe('Jean 3:16-18');
    expect(formatReference({ book: 42, chapter: 3, verseFrom: 16, verseTo: 16 }, 'en')).toBe('John 3:16');
    expect(formatReference({ book: 18, chapter: 23 })).toBe('Psaumes 23');
  });

  it('recherche par mots-clés sans tenir compte des accents', () => {
    const r = searchBible(lsg, 'tant aime le monde');
    expect(r.some((x) => x.book === 42 && x.chapter === 3 && x.verse === 16)).toBe(true);
    expect(searchBible(lsg, 'Éternel est mon berger').some((x) => x.book === 18 && x.chapter === 23)).toBe(true);
  });

  it('regroupe les versets par diapositive', () => {
    const v = versesFor(lsg, { book: 18, chapter: 23 });
    expect(groupVerses(v, 2).map((g) => g.length)).toEqual([2, 2, 2]);
    const auto = groupVerses(versesFor(lsg, { book: 44, chapter: 8 }), 0);
    expect(auto.every((g) => g.length >= 1)).toBe(true);
    expect(auto.flat()).toHaveLength(39);
  });
});

describe('import de Bibles', () => {
  it('lit le format Zefania XML', async () => {
    const { parseBibleFile } = await import('../src/lib/bible');
    const xml = `<?xml version="1.0"?><XMLBIBLE biblename="Test"><BIBLEBOOK bnumber="43" bname="Jean"><CHAPTER cnumber="3"><VERS vnumber="16">Texte  seize</VERS><VERS vnumber="17">Dix-sept</VERS></CHAPTER></BIBLEBOOK></XMLBIBLE>`;
    const r = parseBibleFile('t.xml', xml);
    expect(r.title).toBe('Test');
    expect(r.books).toHaveLength(66);
    expect(r.books[42][2][15]).toBe('Texte seize');
    expect(r.books[42][0]).toEqual([]);
  });
  it('lit le format Beblia XML', async () => {
    const { parseBibleFile } = await import('../src/lib/bible');
    const xml = `<bible translation="Ma Bible"><testament name="Old"><book number="1"><chapter number="1"><verse number="1">Au commencement</verse></chapter></book></testament></bible>`;
    const r = parseBibleFile('b.xml', xml);
    expect(r.title).toBe('Ma Bible');
    expect(r.books[0][0][0]).toBe('Au commencement');
  });
  it('refuse un fichier inconnu', async () => {
    const { parseBibleFile } = await import('../src/lib/bible');
    expect(() => parseBibleFile('x.xml', '<foo/>')).toThrow();
  });
});
