import type { Song, SongSection } from '../types';
import { normalize, uid } from './ids';

interface SectionKind {
  re: RegExp;
  label: string;
  key: string;
}

// Types de sections reconnus (français et anglais)
const KINDS: SectionKind[] = [
  { re: /^(pr[eé][- ]?refrain|pre[- ]?chorus)$/, label: 'Pré-refrain', key: 'PR' },
  { re: /^(couplet|strophe|verse|verset|v)$/, label: 'Couplet', key: 'C' },
  { re: /^(refrain|chorus|ch|r)$/, label: 'Refrain', key: 'R' },
  { re: /^(pont|bridge|p|b)$/, label: 'Pont', key: 'P' },
  { re: /^(intro|introduction|i)$/, label: 'Intro', key: 'I' },
  { re: /^(fin|final|outro|ending|coda|conclusion|e)$/, label: 'Fin', key: 'F' },
  { re: /^(tag)$/, label: 'Tag', key: 'T' },
];

const HEADER_RE = /^\s*\[([^\]]+)\]\s*$/;
const BARE_HEADER_RE =
  /^\s*(couplet|strophe|verse|refrain|chorus|pont|bridge|pr[eé]-?refrain|pre-?chorus|intro|fin|outro|ending|coda|tag)\s*(\d+)?\s*:?\s*$/i;

export function classifySection(raw: string): { label: string; key: string } {
  const txt = raw.trim();
  const m = /^(.*?)[\s.]*(\d+)?$/.exec(txt) || [txt, txt, undefined];
  const word = normalize((m[1] || '').trim());
  const num = m[2];
  for (const k of KINDS) {
    if (k.re.test(word)) {
      const label = num ? `${k.label} ${num}` : k.key === 'C' ? `${k.label} 1` : k.label;
      const key = k.key === 'C' ? `C${num || 1}` : `${k.key}${num && num !== '1' ? num : ''}`;
      return { label, key };
    }
  }
  return { label: txt, key: txt.replace(/\s+/g, '').toUpperCase() };
}

/** Découpe les paroles en sections. */
export function parseSections(lyrics: string): SongSection[] {
  const lines = lyrics.replace(/\r\n?/g, '\n').split('\n');
  const hasHeaders = lines.some((l) => HEADER_RE.test(l) || BARE_HEADER_RE.test(l));
  const sections: SongSection[] = [];

  if (!hasHeaders) {
    // Pas de balises : chaque strophe séparée par une ligne vide = un couplet
    const stanzas = lyrics
      .replace(/\r\n?/g, '\n')
      .split(/\n\s*\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    stanzas.forEach((text, i) => sections.push({ label: `Couplet ${i + 1}`, key: `C${i + 1}`, text }));
    return sections;
  }

  let current: SongSection | null = null;
  let buf: string[] = [];
  let verseCounter = 0;
  const flush = () => {
    if (current) {
      current.text = buf.join('\n').replace(/^\n+|\n+$/g, '');
      if (current.text.trim()) sections.push(current);
    } else if (buf.join('').trim()) {
      sections.push({ label: 'Intro', key: 'I', text: buf.join('\n').trim() });
    }
    buf = [];
  };
  for (const line of lines) {
    const h = HEADER_RE.exec(line);
    const b = !h ? BARE_HEADER_RE.exec(line) : null;
    if (h || b) {
      flush();
      const raw = (h ? h[1] : `${b![1]} ${b![2] || ''}`).trim();
      const cls = classifySection(raw);
      if (/^C\d+$/.test(cls.key)) {
        const explicit = /\d/.test(raw);
        const n = explicit ? parseInt(cls.key.slice(1), 10) : verseCounter + 1;
        verseCounter = Math.max(verseCounter, n);
        cls.key = `C${n}`;
        cls.label = `Couplet ${n}`;
      }
      current = { ...cls, text: '' };
    } else {
      buf.push(line);
    }
  }
  flush();

  // Clés uniques
  const seen = new Map<string, number>();
  for (const s of sections) {
    const n = (seen.get(s.key) || 0) + 1;
    seen.set(s.key, n);
    if (n > 1) s.key = `${s.key}#${n}`;
  }
  return sections;
}

/** Applique l'ordre de l'arrangement (« C1 R C2 R P R »). */
export function arrange(sections: SongSection[], arrangement: string): SongSection[] {
  const tokens = arrangement
    .split(/[\s,;]+/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  if (!tokens.length) return sections;
  const byKey = new Map<string, SongSection>();
  for (const s of sections) byKey.set(s.key.toUpperCase(), s);
  const out: SongSection[] = [];
  for (let t of tokens) {
    t = t.replace(/^V(\d+)$/, 'C$1').replace(/^CH$/, 'R').replace(/^B(\d*)$/, 'P$1');
    const s = byKey.get(t) || (/^C$/.test(t) ? byKey.get('C1') : undefined);
    if (s) out.push(s);
  }
  return out.length ? out : sections;
}

/** Découpe un texte en blocs d'au plus `maxLines` lignes, équilibrés. */
export function splitLines(text: string, maxLines: number): string[] {
  // Une ligne vide à l'intérieur d'une section force une nouvelle diapositive
  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() !== ''))
    .filter((b) => b.length);
  const out: string[] = [];
  for (const lines of blocks) {
    if (maxLines <= 0 || lines.length <= maxLines) {
      out.push(lines.join('\n'));
      continue;
    }
    const parts = Math.ceil(lines.length / maxLines);
    const per = Math.ceil(lines.length / parts);
    for (let i = 0; i < lines.length; i += per) out.push(lines.slice(i, i + per).join('\n'));
  }
  return out;
}

export interface SongSlidePart {
  label: string;
  key: string;
  text: string;
}

export function songSlides(song: Pick<Song, 'lyrics' | 'arrangement'>, maxLines: number): SongSlidePart[] {
  const sections = arrange(parseSections(song.lyrics), song.arrangement || '');
  const out: SongSlidePart[] = [];
  for (const s of sections) {
    const parts = splitLines(s.text, maxLines);
    parts.forEach((text, i) =>
      out.push({ label: parts.length > 1 ? `${s.label} (${i + 1}/${parts.length})` : s.label, key: s.key, text }),
    );
  }
  return out;
}

export function songFooter(song: Song): string {
  const parts: string[] = [];
  if (song.author) parts.push(song.author);
  if (song.copyright) parts.push(`© ${song.copyright}`);
  if (song.ccli) parts.push(`CCLI ${song.ccli}`);
  return parts.join(' · ');
}

export function newSong(partial: Partial<Song> = {}): Song {
  const now = Date.now();
  return {
    id: uid('s'),
    title: '',
    author: '',
    copyright: '',
    ccli: '',
    key: '',
    tags: '',
    lyrics: '',
    arrangement: '',
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

// ---------- Import ----------

/** Texte brut : 1re ligne = titre (si suivie d'une ligne vide ou si le fichier a un nom), reste = paroles. */
export function importPlainText(content: string, fileName = ''): Song {
  const text = content.replace(/^﻿/, '').replace(/\r\n?/g, '\n').trim();
  const lines = text.split('\n');
  let title = fileName.replace(/\.[^.]+$/, '').trim();
  let body = text;
  const titleMatch = /^(titre|title)\s*:\s*(.+)$/i.exec(lines[0] || '');
  if (titleMatch) {
    title = titleMatch[2].trim();
    body = lines.slice(1).join('\n').trim();
  } else if (!title || (lines.length > 2 && lines[1].trim() === '' && !HEADER_RE.test(lines[0]))) {
    title = lines[0].trim();
    body = lines.slice(1).join('\n').trim();
  }
  let author = '';
  let copyright = '';
  const meta = body.split('\n');
  while (meta.length && /^(auteur|author|copyright|©)\s*:?/i.test(meta[0])) {
    const l = meta.shift()!;
    const v = l.replace(/^(auteur|author|copyright|©)\s*:?\s*/i, '').trim();
    if (/^(auteur|author)/i.test(l)) author = v;
    else copyright = v;
  }
  return newSong({ title: title || 'Sans titre', author, copyright, lyrics: meta.join('\n').trim() });
}

/** ChordPro : supprime les accords [G] et lit les directives {title:…}. */
export function importChordPro(content: string): Song {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const song = newSong();
  const out: string[] = [];
  let verseN = 0;
  for (const raw of lines) {
    const line = raw.trim();
    const d = /^\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}$/i.exec(line);
    if (d) {
      const name = d[1].toLowerCase();
      const val = (d[2] || '').trim();
      if (name === 'title' || name === 't') song.title = val;
      else if (name === 'artist' || name === 'composer' || name === 'lyricist' || name === 'subtitle' || name === 'st')
        song.author = song.author || val;
      else if (name === 'copyright') song.copyright = val;
      else if (name === 'key') song.key = val;
      else if (name === 'ccli') song.ccli = val;
      else if (name === 'soc' || name === 'start_of_chorus') out.push('', val ? `[${val}]` : '[Refrain]');
      else if (name === 'sov' || name === 'start_of_verse') out.push('', `[${val || `Couplet ${++verseN}`}]`);
      else if (name === 'sob' || name === 'start_of_bridge') out.push('', `[${val || 'Pont'}]`);
      else if (name === 'comment' || name === 'c') {
        if (/^(refrain|chorus|couplet|verse|pont|bridge)/i.test(val)) out.push('', `[${val}]`);
      }
      continue;
    }
    if (line.startsWith('#')) continue;
    out.push(raw.replace(/\[[^\]]*\]/g, '').replace(/\s{2,}/g, ' ').trimEnd());
  }
  song.title = song.title || 'Sans titre';
  song.lyrics = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return song;
}

const OL_NAMES: Record<string, string> = {
  v: 'Couplet',
  c: 'Refrain',
  b: 'Pont',
  p: 'Pré-refrain',
  i: 'Intro',
  e: 'Fin',
  o: 'Autre',
};

/** OpenLyrics (XML), format d'échange standard. */
export function importOpenLyrics(xml: string): Song {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Fichier OpenLyrics invalide');
  const q = (tag: string) => doc.getElementsByTagName(tag);
  const song = newSong();
  song.title = q('title')[0]?.textContent?.trim() || 'Sans titre';
  song.author = Array.from(q('author'))
    .map((a) => a.textContent?.trim())
    .filter(Boolean)
    .join(', ');
  song.copyright = q('copyright')[0]?.textContent?.trim() || '';
  song.ccli = q('ccliNo')[0]?.textContent?.trim() || '';
  song.key = q('key')[0]?.textContent?.trim() || '';
  const keyMap = new Map<string, string>();
  const parts: string[] = [];
  for (const v of Array.from(q('verse'))) {
    const name = (v.getAttribute('name') || 'v1').toLowerCase();
    const m = /^([a-z])(\d*)([a-z]?)$/.exec(name);
    const kind = m ? OL_NAMES[m[1]] || 'Couplet' : 'Couplet';
    const num = m?.[2] || '';
    const label = kind === 'Couplet' ? `Couplet ${num || 1}` : num && num !== '1' ? `${kind} ${num}` : kind;
    const lines: string[] = [];
    for (const l of Array.from(v.getElementsByTagName('lines'))) {
      const txt = serializeLines(l);
      if (lines.length) lines.push('');
      lines.push(txt);
    }
    parts.push(`[${label}]\n${lines.join('\n').trim()}`);
    keyMap.set(name, classifySection(label).key);
  }
  song.lyrics = parts.join('\n\n');
  const order = q('verseOrder')[0]?.textContent?.trim();
  if (order) {
    song.arrangement = order
      .split(/\s+/)
      .map((n) => keyMap.get(n.toLowerCase()))
      .filter(Boolean)
      .join(' ');
  }
  return song;
}

function serializeLines(el: Element): string {
  let out = '';
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) out += n.textContent;
    else if (n.nodeName.toLowerCase() === 'br') out += '\n';
    else if (n.nodeName.toLowerCase() === 'chord') out += '';
    else out += serializeLines(n as Element);
  });
  return out
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .join('\n')
    .trim();
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function exportOpenLyrics(song: Song): string {
  const sections = parseSections(song.lyrics);
  const nameOf = (s: SongSection) => {
    const k = s.key.replace(/#\d+$/, '');
    const m = /^([A-Z]+)(\d*)$/.exec(k);
    const map: Record<string, string> = { C: 'v', R: 'c', P: 'b', PR: 'p', I: 'i', F: 'e' };
    return m ? `${map[m[1]] || 'o'}${m[2] || '1'}` : 'o1';
  };
  const verses = sections
    .map((s) => `    <verse name="${nameOf(s)}">\n      <lines>${esc(s.text).split('\n').join('<br/>')}</lines>\n    </verse>`)
    .join('\n');
  const order = song.arrangement
    ? arrange(sections, song.arrangement)
        .map(nameOf)
        .join(' ')
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<song xmlns="http://openlyrics.info/namespace/2009/song" version="0.9" createdIn="Louange">
  <properties>
    <titles><title>${esc(song.title)}</title></titles>
${song.author ? `    <authors><author>${esc(song.author)}</author></authors>\n` : ''}${song.copyright ? `    <copyright>${esc(song.copyright)}</copyright>\n` : ''}${song.ccli ? `    <ccliNo>${esc(song.ccli)}</ccliNo>\n` : ''}${song.key ? `    <key>${esc(song.key)}</key>\n` : ''}${order ? `    <verseOrder>${order}</verseOrder>\n` : ''}  </properties>
  <lyrics>
${verses}
  </lyrics>
</song>
`;
}

export function importSongFile(name: string, content: string): Song[] {
  const lower = name.toLowerCase();
  if (lower.endsWith('.xml') && content.includes('<song')) return [importOpenLyrics(content)];
  if (/\.(cho|chopro|chordpro|crd|pro)$/.test(lower) || /\{\s*(title|t)\s*:/i.test(content)) return [importChordPro(content)];
  if (lower.endsWith('.json')) {
    const data = JSON.parse(content);
    const arr: Partial<Song>[] = Array.isArray(data) ? data : data.songs || [data];
    return arr.map((s) => newSong({ ...s, id: uid('s') }));
  }
  return [importPlainText(content, name)];
}

export function searchSongs(songs: Song[], query: string): Song[] {
  const q = normalize(query).trim();
  if (!q) return [...songs].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  const words = q.split(/\s+/);
  const scored = songs
    .map((s) => {
      const title = normalize(s.title);
      const hay = `${title} ${normalize(s.author)} ${normalize(s.tags)} ${normalize(s.lyrics)}`;
      if (!words.every((w) => hay.includes(w))) return null;
      const score = (title.startsWith(q) ? 3 : 0) + (title.includes(q) ? 2 : 0);
      return { s, score };
    })
    .filter(Boolean) as { s: Song; score: number }[];
  return scored.sort((a, b) => b.score - a.score || a.s.title.localeCompare(b.s.title, 'fr')).map((x) => x.s);
}
