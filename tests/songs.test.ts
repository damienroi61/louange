import { describe, expect, it } from 'vitest';
import { arrange, exportOpenLyrics, importChordPro, importOpenLyrics, importPlainText, parseSections, searchSongs, songSlides, splitLines } from '../src/lib/songs';
import { seedSongs } from '../src/lib/defaults';

const LYRICS = `[Couplet 1]
L1
L2
L3
L4
L5
L6

[Refrain]
R1
R2

[Couplet 2]
M1
M2

[Pont]
P1`;

describe('paroles de chants', () => {
  it('découpe les sections avec leurs clés', () => {
    const s = parseSections(LYRICS);
    expect(s.map((x) => x.key)).toEqual(['C1', 'R', 'C2', 'P']);
    expect(s.map((x) => x.label)).toEqual(['Couplet 1', 'Refrain', 'Couplet 2', 'Pont']);
  });

  it('numérote les couplets sans numéro et reconnaît l’anglais', () => {
    const s = parseSections('[Verse]\na\n\n[Chorus]\nb\n\n[Verse]\nc\n\n[Bridge]\nd\n\n[Pre-chorus]\ne');
    expect(s.map((x) => x.key)).toEqual(['C1', 'R', 'C2', 'P', 'PR']);
  });

  it('sans balises : chaque strophe devient un couplet', () => {
    const s = parseSections('a\nb\n\nc\nd\n\ne');
    expect(s.map((x) => x.label)).toEqual(['Couplet 1', 'Couplet 2', 'Couplet 3']);
  });

  it('applique l’ordre de passage', () => {
    const s = arrange(parseSections(LYRICS), 'C1 R C2 R P R');
    expect(s.map((x) => x.key)).toEqual(['C1', 'R', 'C2', 'R', 'P', 'R']);
    expect(arrange(parseSections(LYRICS), 'v1 ch').map((x) => x.key)).toEqual(['C1', 'R']);
  });

  it('équilibre les diapositives trop longues', () => {
    expect(splitLines('1\n2\n3\n4\n5\n6', 4)).toEqual(['1\n2\n3', '4\n5\n6']);
    expect(splitLines('1\n2\n\n3', 4)).toEqual(['1\n2', '3']);
    const slides = songSlides({ lyrics: LYRICS, arrangement: '' }, 4);
    expect(slides.map((s) => s.label)).toEqual(['Couplet 1 (1/2)', 'Couplet 1 (2/2)', 'Refrain', 'Couplet 2', 'Pont']);
  });

  it('importe du texte brut', () => {
    const s = importPlainText('Mon chant\n\nLigne 1\nLigne 2\n\nLigne 3');
    expect(s.title).toBe('Mon chant');
    expect(parseSections(s.lyrics)).toHaveLength(2);
  });

  it('importe du ChordPro en retirant les accords', () => {
    const s = importChordPro('{title: Gloire}\n{artist: Moi}\n{start_of_verse}\n[G]Gloire à [D]Dieu\n{end_of_verse}\n{start_of_chorus}\n[C]Alléluia\n{end_of_chorus}');
    expect(s.title).toBe('Gloire');
    expect(s.author).toBe('Moi');
    expect(s.lyrics).toContain('Gloire à Dieu');
    expect(s.lyrics).not.toContain('[G]');
    expect(parseSections(s.lyrics).map((x) => x.key)).toEqual(['C1', 'R']);
  });

  it('exporte puis réimporte en OpenLyrics sans perte', () => {
    const song = { ...seedSongs()[0] };
    const xml = exportOpenLyrics(song);
    const back = importOpenLyrics(xml);
    expect(back.title).toBe(song.title);
    expect(parseSections(back.lyrics).map((s) => s.text)).toEqual(parseSections(song.lyrics).map((s) => s.text));
    expect(back.arrangement).toBe('C1 R C2 R C3 R');
  });

  it('recherche dans les titres et les paroles', () => {
    const songs = seedSongs();
    expect(searchSongs(songs, 'gloire')[0].title).toBe('À toi la gloire');
    expect(searchSongs(songs, 'wretch')[0].title).toBe('Amazing Grace');
    expect(searchSongs(songs, 'ressuscite').length).toBe(1);
  });
});
