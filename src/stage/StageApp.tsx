import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LiveState, Slide } from '../types';
import { createBus } from '../lib/bus';
import { useNow } from '../lib/hooks';
import { formatDuration } from '../lib/ids';

function slideText(s: Slide | null): string {
  if (!s) return '';
  if (s.kind === 'text') return s.text;
  if (s.kind === 'countdown') return 'Compte à rebours';
  return `[${s.label || s.kind}]`;
}

/** Texte qui se réduit automatiquement pour tenir dans son conteneur. */
function AutoFit({ text, max, className }: { text: string; max: number; className?: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(max);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    let lo = 12;
    let hi = max;
    i.style.fontSize = `${hi}px`;
    if (i.scrollHeight <= o.clientHeight && i.scrollWidth <= o.clientWidth) return setSize(hi);
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      i.style.fontSize = `${mid}px`;
      if (i.scrollHeight <= o.clientHeight && i.scrollWidth <= o.clientWidth) lo = mid;
      else hi = mid;
    }
    i.style.fontSize = `${lo}px`;
    setSize(lo);
  }, [text, max, box]);
  return (
    <div ref={outer} className={className} style={{ overflow: 'hidden' }}>
      <div ref={inner} style={{ fontSize: size, whiteSpace: 'pre-wrap', lineHeight: 1.25 }}>
        {text}
      </div>
    </div>
  );
}

export function StageApp() {
  const [state, setState] = useState<LiveState | null>(null);
  const now = useNow(250);
  useEffect(() => {
    document.title = 'Louange — Moniteur de scène';
    const bus = createBus((m) => {
      if (m.type === 'state') setState(m.state);
    });
    bus.post({ type: 'hello', from: 'stage' });
    return () => bus.close();
  }, []);

  const t = state?.timer;
  const elapsed = t ? t.accumulated + (t.running ? now - t.startedAt : 0) : 0;
  const timerMs = t?.mode === 'countdown' ? t.durationMs - elapsed : elapsed;
  const clock = new Date(now).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const current = slideText(state?.slide ?? null);
  const next = slideText(state?.next ?? null);

  return (
    <div className="stage-root">
      <div className="stage-top">
        <div className="stage-clock">{clock}</div>
        <div className={`stage-timer ${timerMs < 0 ? 'over' : ''} ${t?.running ? 'running' : ''}`}>
          {t && (t.running || t.accumulated > 0 || t.mode === 'countdown') ? formatDuration(timerMs) : ''}
        </div>
        <div className="stage-info">
          <div className="stage-item">{state?.itemTitle || '—'}</div>
          <div className="stage-label">
            {state?.slide?.label || ''}
            {state && state.slideCount > 0 ? `  ·  ${state.slideIndex + 1}/${state.slideCount}` : ''}
          </div>
        </div>
      </div>
      {state?.stageMessage && <div className="stage-message">{state.stageMessage}</div>}
      <AutoFit className={`stage-current ${state?.black ? 'is-black' : ''}`} text={current} max={state?.stageFontSize ?? 64} />
      {(state?.stageShowNext ?? true) && (
        <div className="stage-next">
          <div className="stage-next-label">Suivant{state?.next?.label ? ` — ${state.next.label}` : ''}</div>
          <AutoFit className="stage-next-text" text={next} max={Math.round((state?.stageFontSize ?? 64) * 0.6)} />
        </div>
      )}
    </div>
  );
}
