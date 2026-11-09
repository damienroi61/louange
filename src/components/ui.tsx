import { memo, useEffect, type ReactNode } from 'react';
import type { Settings, Slide, Theme } from '../types';
import { SlideRenderer } from './SlideRenderer';
import { useSize } from '../lib/hooks';

export function sectionClass(key?: string): string {
  if (!key) return '';
  if (key.startsWith('PR')) return 'sec-pr';
  if (key.startsWith('C')) return 'sec-c';
  if (key.startsWith('R')) return 'sec-r';
  if (key.startsWith('P')) return 'sec-p';
  return 'sec-o';
}

export const SlideThumb = memo(function SlideThumb(props: {
  slide: Slide;
  theme: Theme;
  aspect: Settings['aspect'];
  width: number;
  index: number;
  active?: boolean;
  live?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
}) {
  const { slide } = props;
  return (
    <button
      type="button"
      className={`thumb ${props.active ? 'active' : ''} ${props.live ? 'live' : ''}`}
      onClick={props.onClick}
      onDoubleClick={props.onDoubleClick}
      title={slide.text || slide.label}
      data-testid="slide-thumb"
    >
      <SlideRenderer slide={slide} theme={props.theme} aspect={props.aspect} width={props.width} role="thumb" />
      <div className={`thumb-label ${sectionClass(slide.sectionKey)}`}>
        <span className="thumb-num">{props.index + 1}</span>
        <span className="thumb-text">{slide.label || ''}</span>
      </div>
    </button>
  );
});

/** Grille de miniatures adaptative. */
export function SlideGrid(props: {
  slides: Slide[];
  theme: Theme;
  aspect: Settings['aspect'];
  activeIndex: number;
  live?: boolean;
  thumbSize: number;
  onSelect: (i: number) => void;
  onActivate?: (i: number) => void;
  empty?: ReactNode;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const gap = 8;
  const cols = Math.max(1, Math.floor((size.width - 8 + gap) / (props.thumbSize + gap)));
  const w = size.width ? Math.floor((size.width - 8 - gap * (cols - 1)) / cols) : props.thumbSize;
  return (
    <div className="slide-grid" ref={ref} style={{ gridTemplateColumns: `repeat(${cols}, ${w}px)` }}>
      {props.slides.length === 0 && <div className="empty">{props.empty}</div>}
      {size.width > 0 &&
        props.slides.map((s, i) => (
          <SlideThumb
            key={s.id}
            slide={s}
            theme={props.theme}
            aspect={props.aspect}
            width={w - 4}
            index={i}
            active={i === props.activeIndex}
            live={props.live && i === props.activeIndex}
            onClick={() => props.onSelect(i)}
            onDoubleClick={() => props.onActivate?.(i)}
          />
        ))}
    </div>
  );
}

export function Modal(props: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; xwide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [props.onClose]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className={`modal ${props.wide ? 'wide' : ''} ${props.xwide ? 'xwide' : ''}`} role="dialog" aria-label={props.title}>
        <div className="modal-head">
          <h2>{props.title}</h2>
          <button className="icon-btn" onClick={props.onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="modal-body">{props.children}</div>
        {props.footer && <div className="modal-foot">{props.footer}</div>}
      </div>
    </div>
  );
}

export function Field(props: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`field ${props.className || ''}`}>
      <span className="field-label">{props.label}</span>
      {props.children}
      {props.hint && <span className="field-hint">{props.hint}</span>}
    </label>
  );
}

export function Toggle(props: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={props.checked} onChange={(e) => props.onChange(e.target.checked)} />
      <span>{props.label}</span>
    </label>
  );
}

export function Range(props: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="range">
      <input type="range" min={props.min} max={props.max} step={props.step ?? 1} value={props.value} onChange={(e) => props.onChange(Number(e.target.value))} />
      <span className="range-val">
        {props.step && props.step < 1 ? props.value.toFixed(2) : props.value}
        {props.suffix || ''}
      </span>
    </div>
  );
}
