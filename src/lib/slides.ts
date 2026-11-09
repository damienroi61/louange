import type { MediaItem, Presentation, ScheduleItem, Settings, Slide, Song } from '../types';
import { formatVerseGroup, loadBible, translationInfo, versesFor, type VerseRef } from './bible';
import { songFooter, songSlides } from './songs';

export interface BuildContext {
  songs: Record<string, Song>;
  presentations: Record<string, Presentation>;
  media: Record<string, MediaItem>;
  settings: Settings;
}

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
export const superscript = (n: number) =>
  String(n)
    .split('')
    .map((d) => SUP[d] ?? d)
    .join('');

/** Regroupe les versets en diapositives. perSlide = 0 → automatique (selon la longueur). */
export function groupVerses(verses: VerseRef[], perSlide: number, maxChars = 320): VerseRef[][] {
  const groups: VerseRef[][] = [];
  if (perSlide > 0) {
    for (let i = 0; i < verses.length; i += perSlide) groups.push(verses.slice(i, i + perSlide));
    return groups;
  }
  let cur: VerseRef[] = [];
  let len = 0;
  for (const v of verses) {
    if (cur.length && len + v.text.length > maxChars) {
      groups.push(cur);
      cur = [];
      len = 0;
    }
    cur.push(v);
    len += v.text.length;
  }
  if (cur.length) groups.push(cur);
  return groups;
}

function verseText(group: VerseRef[], numbers: boolean): string {
  return group.map((v) => (numbers ? `${superscript(v.verse)} ${v.text}` : v.text)).join(' ');
}

export async function buildSlides(item: ScheduleItem, ctx: BuildContext): Promise<Slide[]> {
  const sid = (i: number) => `${item.id}:${i}`;
  switch (item.type) {
    case 'song': {
      const song = item.refId ? ctx.songs[item.refId] : undefined;
      if (!song) return [{ id: sid(0), kind: 'text', label: 'Chant introuvable', text: item.title }];
      const parts = songSlides(song, ctx.settings.maxLinesPerSlide);
      const footer = songFooter(song);
      if (!parts.length) return [{ id: sid(0), kind: 'text', label: 'Titre', text: song.title }];
      return parts.map((p, i) => ({
        id: sid(i),
        kind: 'text',
        label: p.label,
        sectionKey: p.key.replace(/#\d+$/, ''),
        text: p.text,
        footer: i === 0 ? footer : undefined,
      }));
    }
    case 'bible': {
      const sel = item.bible;
      if (!sel) return [];
      const data = await loadBible(sel.translation);
      const ref = { book: sel.book, chapter: sel.chapter, verseFrom: sel.verseFrom, chapterTo: sel.chapterTo, verseTo: sel.verseTo };
      const verses = versesFor(data, ref);
      const groups = groupVerses(verses, sel.versesPerSlide);
      const info = translationInfo(sel.translation);
      let secondary: Map<string, string> | null = null;
      let secInfo: ReturnType<typeof translationInfo> | null = null;
      if (sel.secondary && sel.secondary !== sel.translation) {
        try {
          const d2 = await loadBible(sel.secondary);
          secInfo = translationInfo(sel.secondary);
          secondary = new Map(versesFor(d2, ref).map((v) => [`${v.chapter}:${v.verse}`, v.text]));
        } catch {
          secondary = null;
        }
      }
      return groups.map((g, i) => {
        const refText = formatVerseGroup(sel.book, g, info.lang);
        const sec = secondary
          ? g
              .map((v) => {
                const t = secondary!.get(`${v.chapter}:${v.verse}`) || '';
                return sel.showVerseNumbers ? `${superscript(v.verse)} ${t}` : t;
              })
              .join(' ')
          : undefined;
        return {
          id: sid(i),
          kind: 'text' as const,
          label: refText,
          text: verseText(g, sel.showVerseNumbers),
          secondaryText: sec,
          footer: `${refText} (${info.short}${secInfo ? ' / ' + secInfo.short : ''})`,
        };
      });
    }
    case 'media': {
      const m = item.refId ? ctx.media[item.refId] : undefined;
      if (!m) return [{ id: sid(0), kind: 'blank', label: 'Média introuvable', text: '' }];
      return [
        {
          id: sid(0),
          kind: m.type,
          label: m.name,
          text: m.type === 'audio' ? '' : '',
          mediaId: m.id,
          loop: item.loop ?? m.type === 'video',
          muted: item.muted ?? false,
          fit: 'contain',
        },
      ];
    }
    case 'presentation': {
      const p = item.refId ? ctx.presentations[item.refId] : undefined;
      if (!p) return [{ id: sid(0), kind: 'text', label: 'Présentation introuvable', text: item.title }];
      return p.slides.map((s, i) => ({
        id: sid(i),
        kind: s.kind === 'image' ? 'image' : 'text',
        label: `Diapo ${i + 1}`,
        text: s.text,
        mediaId: s.mediaId,
        background: s.background,
        fit: 'contain',
      }));
    }
    case 'countdown':
      return [
        {
          id: sid(0),
          kind: 'countdown',
          label: 'Compte à rebours',
          text: '',
          countdown: item.countdown ?? { mode: 'duration', minutes: 5, time: '10:00', title: 'Le culte commence dans', endText: 'Bienvenue !' },
        },
      ];
    case 'web':
      return [{ id: sid(0), kind: 'web', label: item.url || 'Page web', text: '', url: item.url }];
    case 'camera':
      return [{ id: sid(0), kind: 'camera', label: 'Caméra', text: '', deviceId: item.deviceId }];
    case 'text': {
      const blocks = (item.text || '')
        .replace(/\r\n?/g, '\n')
        .split(/\n\s*\n/)
        .map((b) => b.trim())
        .filter(Boolean);
      if (!blocks.length) return [{ id: sid(0), kind: 'text', label: 'Texte', text: '' }];
      return blocks.map((b, i) => ({ id: sid(i), kind: 'text', label: `Texte ${i + 1}`, text: b }));
    }
    case 'blank':
    default:
      return [{ id: sid(0), kind: 'blank', label: 'Écran vide', text: '' }];
  }
}

export function themeIdFor(item: ScheduleItem, ctx: BuildContext): string {
  if (item.themeId) return item.themeId;
  if (item.type === 'song') return (item.refId && ctx.songs[item.refId]?.themeId) || ctx.settings.defaultSongTheme;
  if (item.type === 'bible') return ctx.settings.defaultBibleTheme;
  if (item.type === 'presentation') return (item.refId && ctx.presentations[item.refId]?.themeId) || ctx.settings.defaultPresentationTheme;
  return ctx.settings.defaultPresentationTheme;
}

export const ITEM_ICONS: Record<ScheduleItem['type'], string> = {
  song: '♪',
  bible: '✝',
  media: '▣',
  presentation: '▤',
  countdown: '⏱',
  web: '🌐',
  camera: '◉',
  text: '¶',
  blank: '□',
};

export const ITEM_LABELS: Record<ScheduleItem['type'], string> = {
  song: 'Chant',
  bible: 'Bible',
  media: 'Média',
  presentation: 'Présentation',
  countdown: 'Compte à rebours',
  web: 'Page web',
  camera: 'Caméra',
  text: 'Texte',
  blank: 'Écran vide',
};
