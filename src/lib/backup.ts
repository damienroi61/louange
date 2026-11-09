// Sauvegarde / restauration et export de programmes portables.
import type { MediaItem, Presentation, Schedule, Song, Theme } from '../types';
import { dbAll, dbGet, dbPut, type StoreName } from './db';

async function blobToBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer());
  let s = '';
  const CH = 0x8000;
  for (let i = 0; i < buf.length; i += CH) s += String.fromCharCode(...buf.subarray(i, i + CH));
  return btoa(s);
}

function base64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}

export interface BackupFile {
  format: 'louange-backup' | 'louange-schedule';
  version: 1;
  createdAt: number;
  songs: Song[];
  presentations: Presentation[];
  themes: Theme[];
  schedules: Schedule[];
  media: (MediaItem & { data?: string })[];
  settings?: unknown;
}

export async function exportAll(includeMedia: boolean): Promise<BackupFile> {
  const media = await dbAll<MediaItem>('media');
  const withData = includeMedia
    ? await Promise.all(
        media.map(async (m) => {
          const b = await dbGet<Blob>('blobs', m.id);
          return { ...m, data: b ? await blobToBase64(b) : undefined };
        }),
      )
    : media;
  return {
    format: 'louange-backup',
    version: 1,
    createdAt: Date.now(),
    songs: await dbAll('songs'),
    presentations: await dbAll('presentations'),
    themes: (await dbAll<Theme>('themes')).filter((t) => !t.builtIn),
    schedules: await dbAll('schedules'),
    media: withData,
    settings: await dbGet('kv', 'settings'),
  };
}

/** Programme portable : inclut les chants, présentations, thèmes et médias utilisés. */
export async function exportSchedule(schedule: Schedule, themes: Theme[]): Promise<BackupFile> {
  const songIds = new Set<string>();
  const presIds = new Set<string>();
  const mediaIds = new Set<string>();
  const themeIds = new Set<string>();
  for (const it of schedule.items) {
    if (it.type === 'song' && it.refId) songIds.add(it.refId);
    if (it.type === 'presentation' && it.refId) presIds.add(it.refId);
    if (it.type === 'media' && it.refId) mediaIds.add(it.refId);
    if (it.themeId) themeIds.add(it.themeId);
  }
  const songs = (await Promise.all([...songIds].map((id) => dbGet<Song>('songs', id)))).filter(Boolean) as Song[];
  const presentations = (await Promise.all([...presIds].map((id) => dbGet<Presentation>('presentations', id)))).filter(Boolean) as Presentation[];
  for (const s of songs) if (s.themeId) themeIds.add(s.themeId);
  for (const p of presentations) {
    if (p.themeId) themeIds.add(p.themeId);
    for (const sl of p.slides) if (sl.mediaId) mediaIds.add(sl.mediaId);
  }
  const usedThemes = themes.filter((t) => themeIds.has(t.id) && !t.builtIn);
  for (const t of usedThemes) if (t.background.type === 'image' || t.background.type === 'video') mediaIds.add(t.background.mediaId);
  const media = await Promise.all(
    [...mediaIds].map(async (id) => {
      const m = await dbGet<MediaItem>('media', id);
      const b = await dbGet<Blob>('blobs', id);
      return m ? { ...m, data: b ? await blobToBase64(b) : undefined } : null;
    }),
  );
  return {
    format: 'louange-schedule',
    version: 1,
    createdAt: Date.now(),
    songs,
    presentations,
    themes: usedThemes,
    schedules: [schedule],
    media: media.filter(Boolean) as BackupFile['media'],
  };
}

export async function importBackup(data: BackupFile): Promise<{ counts: Record<string, number> }> {
  if (data.format !== 'louange-backup' && data.format !== 'louange-schedule') throw new Error('Fichier non reconnu');
  const counts: Record<string, number> = {};
  const put = async (store: StoreName, items: { id: string }[]) => {
    for (const it of items) await dbPut(store, it.id, it);
    counts[store] = items.length;
  };
  await put('songs', data.songs || []);
  await put('presentations', data.presentations || []);
  await put('themes', data.themes || []);
  await put('schedules', data.schedules || []);
  for (const m of data.media || []) {
    const { data: b64, ...meta } = m;
    if (b64) await dbPut('blobs', m.id, base64ToBlob(b64, m.mime));
    await dbPut('media', m.id, meta);
  }
  counts.media = (data.media || []).length;
  if (data.format === 'louange-backup' && data.settings) await dbPut('kv', 'settings', data.settings);
  return { counts };
}

export function downloadJSON(obj: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  downloadBlob(blob, filename);
}

export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function pickFiles(accept: string, multiple = true): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.style.display = 'none';
    input.onchange = () => {
      resolve(Array.from(input.files || []));
      input.remove();
    };
    document.body.appendChild(input);
    input.click();
  });
}
