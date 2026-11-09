import type { MediaItem, MediaType } from '../types';
import { dbPut } from './db';
import { uid } from './ids';

export function mediaTypeOf(file: { type: string; name: string }): MediaType | null {
  const t = file.type;
  const n = file.name.toLowerCase();
  if (t.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/.test(n)) return 'image';
  if (t.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|ogv)$/.test(n)) return 'video';
  if (t.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/.test(n)) return 'audio';
  return null;
}

function drawThumb(src: CanvasImageSource, w: number, h: number): string {
  const W = 320;
  const H = 180;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  const s = Math.min(W / w, H / h);
  const dw = w * s;
  const dh = h * s;
  g.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh);
  return c.toDataURL('image/jpeg', 0.75);
}

async function imageThumb(blob: Blob): Promise<string | undefined> {
  try {
    const bmp = await createImageBitmap(blob);
    const t = drawThumb(bmp, bmp.width, bmp.height);
    bmp.close();
    return t;
  } catch {
    return undefined;
  }
}

function videoThumb(blob: Blob): Promise<{ thumb?: string; duration?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement('video');
    v.muted = true;
    v.preload = 'auto';
    v.src = url;
    let done = false;
    const finish = (r: { thumb?: string; duration?: number }) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(r);
    };
    const timer = setTimeout(() => finish({}), 8000);
    v.onloadedmetadata = () => {
      v.currentTime = Math.min(1, (v.duration || 2) / 3);
    };
    v.onseeked = () => {
      clearTimeout(timer);
      try {
        finish({ thumb: drawThumb(v, v.videoWidth || 16, v.videoHeight || 9), duration: v.duration });
      } catch {
        finish({ duration: v.duration });
      }
    };
    v.onerror = () => {
      clearTimeout(timer);
      finish({});
    };
  });
}

export async function importMediaBlob(blob: Blob, name: string, forcedType?: MediaType): Promise<MediaItem | null> {
  const type = forcedType ?? mediaTypeOf({ type: blob.type, name });
  if (!type) return null;
  const id = uid('m');
  const item: MediaItem = { id, name: name.replace(/\.[^.]+$/, ''), type, mime: blob.type, size: blob.size, createdAt: Date.now() };
  if (type === 'image') item.thumb = await imageThumb(blob);
  else if (type === 'video') Object.assign(item, await videoThumb(blob));
  await dbPut('blobs', id, blob);
  await dbPut('media', id, item);
  return item;
}

export function importMediaFile(file: File): Promise<MediaItem | null> {
  return importMediaBlob(file, file.name);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} Go`;
}
