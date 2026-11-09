import type { CSSProperties } from 'react';
import type { Settings, Theme } from '../types';

export const CANVAS_H = 1080;
export function canvasWidth(aspect: Settings['aspect']): number {
  if (aspect === '4:3') return 1440;
  if (aspect === '16:10') return 1728;
  return 1920;
}

export function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function textStyle(theme: Theme, size: number): CSSProperties {
  const f = theme.font;
  const shadow = theme.shadow.enabled ? `${theme.shadow.x}px ${theme.shadow.y}px ${theme.shadow.blur}px ${theme.shadow.color}` : 'none';
  return {
    fontFamily: f.family,
    fontSize: size,
    color: f.color,
    fontWeight: f.bold ? 700 : 400,
    fontStyle: f.italic ? 'italic' : 'normal',
    textTransform: f.uppercase ? 'uppercase' : 'none',
    lineHeight: f.lineHeight,
    letterSpacing: `${f.letterSpacing}px`,
    textAlign: theme.align,
    textShadow: shadow,
    WebkitTextStroke: theme.outline.enabled ? `${theme.outline.width}px ${theme.outline.color}` : undefined,
    paintOrder: 'stroke fill',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  };
}

export interface BoxGeometry {
  left: number;
  top: number;
  width: number;
  height: number;
  innerW: number;
  innerH: number;
}

export function boxGeometry(theme: Theme, W: number): BoxGeometry {
  const b = theme.box;
  const left = (W * b.left) / 100;
  const top = (CANVAS_H * b.top) / 100;
  const width = Math.max(50, W - left - (W * b.right) / 100);
  const height = Math.max(50, CANVAS_H - top - (CANVAS_H * b.bottom) / 100);
  return { left, top, width, height, innerW: Math.max(20, width - b.padding * 2), innerH: Math.max(20, height - b.padding * 2) };
}

let measurer: HTMLDivElement | null = null;
const fitCache = new Map<string, number>();

function getMeasurer(): HTMLDivElement {
  if (!measurer) {
    measurer = document.createElement('div');
    measurer.setAttribute('aria-hidden', 'true');
    Object.assign(measurer.style, {
      position: 'absolute',
      left: '-100000px',
      top: '0',
      visibility: 'hidden',
      pointerEvents: 'none',
    });
    document.body.appendChild(measurer);
  }
  return measurer;
}

export const SECONDARY_SCALE = 0.85;

function applyStyle(el: HTMLElement, st: CSSProperties) {
  const css = el.style as unknown as Record<string, string>;
  for (const [k, v] of Object.entries(st)) {
    if (v === undefined) continue;
    css[k] = k === 'fontSize' ? `${v}px` : String(v);
  }
}

/** Plus grande taille de police (≤ taille du thème) pour que le texte tienne dans la zone. */
export function fitFontSize(text: string, theme: Theme, boxW: number, boxH: number, secondary?: string): number {
  const max = theme.font.size;
  if (!theme.font.autoFit || typeof document === 'undefined') return max;
  if (!text.trim() && !secondary) return max;
  const key = JSON.stringify([text, secondary || '', theme.font, theme.outline.width, boxW, boxH]);
  const hit = fitCache.get(key);
  if (hit) return hit;
  const m = getMeasurer();
  const fits = (size: number) => {
    m.innerHTML = '';
    m.style.width = `${boxW}px`;
    const p = document.createElement('div');
    applyStyle(p, textStyle(theme, size));
    p.textContent = text;
    m.appendChild(p);
    if (secondary) {
      const s = document.createElement('div');
      applyStyle(s, textStyle(theme, size * SECONDARY_SCALE));
      s.style.marginTop = `${size * 0.4}px`;
      s.textContent = secondary;
      m.appendChild(s);
    }
    return m.scrollHeight <= boxH && m.scrollWidth <= boxW + 1;
  };
  let lo = 14;
  let hi = max;
  if (fits(hi)) {
    fitCache.set(key, hi);
    return hi;
  }
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  if (fitCache.size > 4000) fitCache.clear();
  fitCache.set(key, lo);
  return lo;
}

export function clearFitCache() {
  fitCache.clear();
}
