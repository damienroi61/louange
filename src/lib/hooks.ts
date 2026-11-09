import { useEffect, useState } from 'react';
import type { MediaItem } from '../types';
import { dbGet, mediaUrl } from './db';

export function useMediaUrl(id: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    mediaUrl(id).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id]);
  return url;
}

const metaCache = new Map<string, Promise<MediaItem | undefined>>();
export function useMediaMeta(id: string | undefined): MediaItem | undefined {
  const [m, setM] = useState<MediaItem | undefined>();
  useEffect(() => {
    if (!id) return setM(undefined);
    let alive = true;
    let p = metaCache.get(id);
    if (!p) {
      p = dbGet<MediaItem>('media', id);
      metaCache.set(id, p);
    }
    p.then((v) => alive && setM(v));
    return () => {
      alive = false;
    };
  }, [id]);
  return m;
}

export function useNow(intervalMs = 500, enabled = true): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, enabled]);
  return now;
}

export function useSize<T extends HTMLElement>(): [(el: T | null) => void, { width: number; height: number }] {
  const [el, setEl] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setSize({ width: Math.floor(r.width), height: Math.floor(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, size];
}
