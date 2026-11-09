import { useEffect, useRef, useState } from 'react';
import type { LiveState } from '../types';
import { createBus } from '../lib/bus';
import { SlideRenderer } from '../components/SlideRenderer';
import { canvasWidth, CANVAS_H } from '../lib/fit';
import { FALLBACK_THEME } from '../lib/defaults';
import { isElectron } from '../lib/platform';

export function OutputApp() {
  const [state, setState] = useState<LiveState | null>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [hint, setHint] = useState(!isElectron);
  const [cursor, setCursor] = useState(true);
  const busRef = useRef<ReturnType<typeof createBus> | null>(null);
  const lastTime = useRef(0);

  useEffect(() => {
    document.title = 'Louange — Sortie';
    const bus = createBus((m) => {
      if (m.type === 'state') setState(m.state);
    });
    busRef.current = bus;
    bus.post({ type: 'hello', from: 'output' });
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F11' || (e.key === 'f' && !e.ctrlKey)) return toggleFs();
      bus.post({ type: 'key', key: e.key });
    };
    window.addEventListener('keydown', onKey);
    const t = setTimeout(() => setHint(false), 4000);
    let idle: ReturnType<typeof setTimeout>;
    const onMove = () => {
      setCursor(true);
      clearTimeout(idle);
      idle = setTimeout(() => setCursor(false), 2000);
    };
    window.addEventListener('mousemove', onMove);
    onMove();
    return () => {
      bus.close();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousemove', onMove);
      clearTimeout(t);
    };
  }, []);

  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    else document.documentElement.requestFullscreen().catch(() => undefined);
  };

  const aspect = state?.aspect ?? '16:9';
  const W = canvasWidth(aspect);
  const width = Math.min(size.w, (size.h * W) / CANVAS_H);

  return (
    <div className="output-root" style={{ cursor: cursor ? 'default' : 'none' }} onDoubleClick={toggleFs}>
      {state ? (
        <SlideRenderer
          slide={state.slide}
          theme={state.theme ?? FALLBACK_THEME}
          aspect={aspect}
          width={width}
          role="output"
          black={state.black}
          logo={state.logo}
          clearText={state.clearText}
          clearBackground={state.clearBackground}
          backgroundOverride={state.backgroundOverride}
          logoMediaId={state.logoMediaId}
          alert={state.alert}
          liveSince={state.liveSince}
          video={state.video}
          onVideoTime={(current, duration, paused) => {
            const now = Date.now();
            if (now - lastTime.current < 250 && !paused) return;
            lastTime.current = now;
            busRef.current?.post({ type: 'videoTime', current, duration, paused });
          }}
        />
      ) : (
        <div className="output-wait">En attente de la fenêtre opérateur…</div>
      )}
      {hint && <div className="output-hint">Double-cliquez (ou touche F) pour passer en plein écran</div>}
    </div>
  );
}
