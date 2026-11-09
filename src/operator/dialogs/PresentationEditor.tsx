import { useState } from 'react';
import { useStore } from '../../store/store';
import type { Presentation, PresentationSlide } from '../../types';
import { Field, Modal } from '../../components/ui';
import { SlideRenderer } from '../../components/SlideRenderer';
import { BackgroundEditor } from './ThemeEditor';
import { uid } from '../../lib/ids';
import { useSize } from '../../lib/hooks';

export function PresentationEditor({ id }: { id?: string }) {
  const existing = useStore((s) => (id ? s.presentations[id] : undefined));
  const themes = useStore((s) => s.themes);
  const media = useStore((s) => s.media);
  const settings = useStore((s) => s.settings);
  const st = useStore.getState();
  const [p, setP] = useState<Presentation>(
    () =>
      existing ?? {
        id: uid('p'),
        title: 'Nouvelle présentation',
        slides: [{ id: uid('ps'), kind: 'text', text: 'Titre de la diapositive' }],
        source: 'Manuel',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
  );
  const [cur, setCur] = useState(0);
  const [ref, size] = useSize<HTMLDivElement>();
  const slide = p.slides[cur];
  const theme = themes[p.themeId || settings.defaultPresentationTheme] || Object.values(themes)[0];
  const images = Object.values(media).filter((m) => m.type === 'image');

  const setSlide = (patch: Partial<PresentationSlide>) => setP((x) => ({ ...x, slides: x.slides.map((s, i) => (i === cur ? { ...s, ...patch } : s)) }));
  const add = (kind: 'text' | 'image') => {
    const s: PresentationSlide = { id: uid('ps'), kind, text: '', mediaId: kind === 'image' ? images[0]?.id : undefined };
    setP((x) => {
      const slides = [...x.slides];
      slides.splice(cur + 1, 0, s);
      return { ...x, slides };
    });
    setCur(cur + 1);
  };
  const move = (d: number) => {
    const j = cur + d;
    if (j < 0 || j >= p.slides.length) return;
    setP((x) => {
      const slides = [...x.slides];
      [slides[cur], slides[j]] = [slides[j], slides[cur]];
      return { ...x, slides };
    });
    setCur(j);
  };
  const remove = () => {
    if (p.slides.length <= 1) return;
    setP((x) => ({ ...x, slides: x.slides.filter((_, i) => i !== cur) }));
    setCur(Math.max(0, cur - 1));
  };
  const save = async () => {
    await st.savePresentation(p);
    st.toast(`Présentation « ${p.title} » enregistrée`, 'success');
    st.setDialog(null);
  };
  const toSlide = (s: PresentationSlide) => ({ id: s.id, kind: s.kind === 'image' ? ('image' as const) : ('text' as const), text: s.text, mediaId: s.mediaId, background: s.background });

  return (
    <Modal
      title={existing ? `Présentation « ${existing.title} »` : 'Nouvelle présentation'}
      onClose={() => st.setDialog(null)}
      xwide
      footer={
        <>
          <div className="grow" />
          <button onClick={() => st.setDialog(null)}>Annuler</button>
          <button className="primary" onClick={save}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="pres-editor">
        <div className="pres-list">
          <div className="row">
            <Field label="Titre" className="grow">
              <input value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} />
            </Field>
          </div>
          <Field label="Thème">
            <select value={p.themeId || ''} onChange={(e) => setP({ ...p, themeId: e.target.value || undefined })}>
              <option value="">Thème par défaut des présentations</option>
              {Object.values(themes).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="row">
            <button className="small" onClick={() => add('text')}>
              + Texte
            </button>
            <button className="small" onClick={() => add('image')} disabled={!images.length} title={images.length ? '' : 'Importez des images dans l’onglet Médias'}>
              + Image
            </button>
            <button className="small" onClick={() => move(-1)}>
              ↑
            </button>
            <button className="small" onClick={() => move(1)}>
              ↓
            </button>
            <button className="small danger" onClick={remove}>
              ✕
            </button>
          </div>
          <div className="pres-thumbs">
            {p.slides.map((s, i) => (
              <button key={s.id} className={`thumb ${i === cur ? 'active' : ''}`} onClick={() => setCur(i)}>
                <SlideRenderer slide={toSlide(s)} theme={theme} aspect={settings.aspect} width={150} role="thumb" />
                <div className="thumb-label">
                  <span className="thumb-num">{i + 1}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="pres-edit">
          <div className="monitor-wrap" ref={ref}>
            {slide && size.width > 0 && <SlideRenderer slide={toSlide(slide)} theme={theme} aspect={settings.aspect} width={Math.min(size.width, Math.floor((size.height * 16) / 9))} role="thumb" />}
          </div>
          {slide && (
            <div className="pres-fields">
              {slide.kind === 'image' && (
                <Field label="Image">
                  <select value={slide.mediaId || ''} onChange={(e) => setSlide({ mediaId: e.target.value })}>
                    {images.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label={slide.kind === 'image' ? 'Texte par-dessus l’image (facultatif)' : 'Texte'}>
                <textarea rows={6} value={slide.text} onChange={(e) => setSlide({ text: e.target.value })} />
              </Field>
              <div className="row">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={!!slide.background}
                    onChange={(e) => setSlide({ background: e.target.checked ? { type: 'color', color: '#14213d' } : undefined })}
                  />
                  <span>Fond spécifique à cette diapositive</span>
                </label>
              </div>
              {slide.background && <BackgroundEditor bg={slide.background} onChange={(background) => setSlide({ background })} />}
              <Field label="Notes (non projetées)">
                <textarea rows={2} value={slide.notes || ''} onChange={(e) => setSlide({ notes: e.target.value })} />
              </Field>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
