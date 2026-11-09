import { useStore } from '../store/store';
import { SlideRenderer } from '../components/SlideRenderer';
import { SlideGrid } from '../components/ui';
import { useSize } from '../lib/hooks';
import { canvasWidth, CANVAS_H } from '../lib/fit';

export function useMonitorWidth(size: { width: number; height: number }, aspect: '16:9' | '4:3' | '16:10') {
  const W = canvasWidth(aspect);
  return Math.max(0, Math.floor(Math.min(size.width, (size.height * W) / CANVAS_H)));
}

export function PreviewPanel() {
  const item = useStore((s) => s.previewItem);
  const slides = useStore((s) => s.previewSlides);
  const index = useStore((s) => s.previewIndex);
  const aspect = useStore((s) => s.settings.aspect);
  useStore((s) => s.themes);
  useStore((s) => s.settings);
  const st = useStore.getState();
  const theme = st.resolveTheme(item);
  const [ref, size] = useSize<HTMLDivElement>();
  const mw = useMonitorWidth(size, aspect);
  const slide = slides[index] ?? null;

  return (
    <section className="panel preview-panel" aria-label="Aperçu">
      <div className="panel-head">
        <h3>Aperçu</h3>
        <span className="panel-title" title={item?.title}>
          {item?.title || '—'}
        </span>
        <button className="primary small" disabled={!item} onClick={() => st.previewToLive()} title="Entrée" data-testid="go-live">
          Envoyer au direct ▶
        </button>
      </div>
      <div className="monitor-wrap" ref={ref}>
        {mw > 0 && <SlideRenderer slide={slide} theme={theme} aspect={aspect} width={mw} role="thumb" className="monitor" />}
      </div>
      <SlideGrid
        slides={slides}
        theme={theme}
        aspect={aspect}
        activeIndex={index}
        thumbSize={150}
        onSelect={(i) => st.selectPreviewSlide(i)}
        onActivate={(i) => st.previewToLive(i)}
        empty={item ? 'Aucune diapositive' : 'Sélectionnez un élément du programme ou de la bibliothèque'}
      />
    </section>
  );
}
