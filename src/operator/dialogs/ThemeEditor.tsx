import { useState } from 'react';
import { useStore } from '../../store/store';
import type { Background, Theme } from '../../types';
import { Field, Modal, Range, Toggle } from '../../components/ui';
import { SlideRenderer } from '../../components/SlideRenderer';
import { BUILTIN_THEMES } from '../../lib/defaults';
import { uid } from '../../lib/ids';
import { useSize } from '../../lib/hooks';
import { SAMPLE_SLIDE } from '../library/ThemesTab';
import { clearFitCache } from '../../lib/fit';

export const FONTS = [
  'Segoe UI, Inter, Helvetica, Arial, sans-serif',
  'Arial, Helvetica, sans-serif',
  'Verdana, Geneva, sans-serif',
  'Tahoma, Geneva, sans-serif',
  'Trebuchet MS, sans-serif',
  'Calibri, Carlito, sans-serif',
  'Montserrat, Segoe UI, sans-serif',
  'Georgia, "Times New Roman", serif',
  '"Times New Roman", Times, serif',
  'Garamond, "EB Garamond", serif',
  'Palatino Linotype, Palatino, serif',
  'Impact, Haettenschweiler, sans-serif',
  '"Comic Sans MS", cursive',
];

export function BackgroundEditor({ bg, onChange }: { bg: Background; onChange: (b: Background) => void }) {
  const media = useStore((s) => s.media);
  const images = Object.values(media).filter((m) => m.type === 'image');
  const videos = Object.values(media).filter((m) => m.type === 'video');
  const setType = (type: Background['type']) => {
    if (type === 'color') onChange({ type, color: bg.type === 'gradient' ? bg.from : '#000000' });
    else if (type === 'gradient') onChange({ type, from: bg.type === 'color' ? bg.color : '#0b1633', to: '#24467f', angle: 160 });
    else if (type === 'image') onChange({ type, mediaId: images[0]?.id || '', fit: 'cover' });
    else onChange({ type, mediaId: videos[0]?.id || '', fit: 'cover', loop: true, muted: true });
  };
  return (
    <>
      <Field label="Type de fond">
        <select value={bg.type} onChange={(e) => setType(e.target.value as Background['type'])}>
          <option value="color">Couleur unie</option>
          <option value="gradient">Dégradé</option>
          <option value="image">Image</option>
          <option value="video">Vidéo (fond animé)</option>
        </select>
      </Field>
      {bg.type === 'color' && (
        <Field label="Couleur">
          <input type="color" value={bg.color} onChange={(e) => onChange({ ...bg, color: e.target.value })} />
        </Field>
      )}
      {bg.type === 'gradient' && (
        <>
          <div className="row">
            <Field label="De">
              <input type="color" value={bg.from} onChange={(e) => onChange({ ...bg, from: e.target.value })} />
            </Field>
            <Field label="À">
              <input type="color" value={bg.to} onChange={(e) => onChange({ ...bg, to: e.target.value })} />
            </Field>
          </div>
          <Field label="Angle">
            <Range value={bg.angle} min={0} max={360} onChange={(angle) => onChange({ ...bg, angle })} suffix="°" />
          </Field>
        </>
      )}
      {(bg.type === 'image' || bg.type === 'video') && (
        <>
          <Field label={bg.type === 'image' ? 'Image' : 'Vidéo'} hint={(bg.type === 'image' ? images : videos).length ? undefined : 'Importez d’abord le fichier dans l’onglet Médias.'}>
            <select value={bg.mediaId} onChange={(e) => onChange({ ...bg, mediaId: e.target.value })}>
              <option value="">— choisir —</option>
              {(bg.type === 'image' ? images : videos).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cadrage">
            <select value={bg.fit} onChange={(e) => onChange({ ...bg, fit: e.target.value as 'cover' | 'contain' })}>
              <option value="cover">Remplir l’écran</option>
              <option value="contain">Adapter (bandes noires)</option>
            </select>
          </Field>
          {bg.type === 'video' && (
            <div className="row">
              <Toggle checked={bg.loop} onChange={(loop) => onChange({ ...bg, loop })} label="En boucle" />
              <Toggle checked={bg.muted} onChange={(muted) => onChange({ ...bg, muted })} label="Muet" />
            </div>
          )}
        </>
      )}
    </>
  );
}

export function ThemeEditor({ id }: { id?: string }) {
  const existing = useStore((s) => (id ? s.themes[id] : undefined));
  const aspect = useStore((s) => s.settings.aspect);
  const st = useStore.getState();
  const [t, setT] = useState<Theme>(() => (existing ? structuredClone(existing) : { ...structuredClone(BUILTIN_THEMES[0]), id: uid('th'), name: 'Nouveau thème', builtIn: false }));
  const [sample, setSample] = useState(SAMPLE_SLIDE.text);
  const [ref, size] = useSize<HTMLDivElement>();
  const set = (patch: Partial<Theme>) => setT((x) => ({ ...x, ...patch }));
  const font = (patch: Partial<Theme['font']>) => setT((x) => ({ ...x, font: { ...x.font, ...patch } }));
  const box = (patch: Partial<Theme['box']>) => setT((x) => ({ ...x, box: { ...x.box, ...patch } }));
  const shadow = (patch: Partial<Theme['shadow']>) => setT((x) => ({ ...x, shadow: { ...x.shadow, ...patch } }));
  const outline = (patch: Partial<Theme['outline']>) => setT((x) => ({ ...x, outline: { ...x.outline, ...patch } }));
  const footer = (patch: Partial<Theme['footer']>) => setT((x) => ({ ...x, footer: { ...x.footer, ...patch } }));

  const save = async () => {
    clearFitCache();
    await st.saveTheme(t);
    st.toast(`Thème « ${t.name} » enregistré`, 'success');
    st.setDialog(null);
  };

  return (
    <Modal
      title={existing ? `Thème « ${existing.name} »` : 'Nouveau thème'}
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
      <div className="theme-editor">
        <div className="theme-controls">
          <Field label="Nom du thème">
            <input value={t.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <fieldset>
            <legend>Fond</legend>
            <BackgroundEditor bg={t.background} onChange={(background) => set({ background })} />
            <Field label="Assombrir le fond">
              <Range value={t.overlayOpacity} min={0} max={0.9} step={0.05} onChange={(overlayOpacity) => set({ overlayOpacity })} />
            </Field>
          </fieldset>
          <fieldset>
            <legend>Texte</legend>
            <Field label="Police">
              <select value={FONTS.includes(t.font.family) ? t.font.family : '__custom'} onChange={(e) => e.target.value !== '__custom' && font({ family: e.target.value })}>
                {FONTS.map((f) => (
                  <option key={f} value={f} style={{ fontFamily: f }}>
                    {f.split(',')[0].replace(/"/g, '')}
                  </option>
                ))}
                <option value="__custom">Autre…</option>
              </select>
            </Field>
            {!FONTS.includes(t.font.family) && (
              <Field label="Nom de la police installée">
                <input value={t.font.family} onChange={(e) => font({ family: e.target.value })} />
              </Field>
            )}
            <Field label="Taille maximale">
              <Range value={t.font.size} min={20} max={220} onChange={(size) => font({ size })} suffix=" px" />
            </Field>
            <Toggle checked={t.font.autoFit} onChange={(autoFit) => font({ autoFit })} label="Réduire automatiquement pour tenir à l’écran" />
            <div className="row">
              <Field label="Couleur">
                <input type="color" value={t.font.color} onChange={(e) => font({ color: e.target.value })} />
              </Field>
              <Toggle checked={t.font.bold} onChange={(bold) => font({ bold })} label="Gras" />
              <Toggle checked={t.font.italic} onChange={(italic) => font({ italic })} label="Italique" />
              <Toggle checked={t.font.uppercase} onChange={(uppercase) => font({ uppercase })} label="MAJUSCULES" />
            </div>
            <Field label="Interligne">
              <Range value={t.font.lineHeight} min={0.9} max={2} step={0.05} onChange={(lineHeight) => font({ lineHeight })} />
            </Field>
            <Field label="Espacement des lettres">
              <Range value={t.font.letterSpacing} min={-3} max={12} onChange={(letterSpacing) => font({ letterSpacing })} suffix=" px" />
            </Field>
          </fieldset>
          <fieldset>
            <legend>Mise en page</legend>
            <div className="row">
              <Field label="Horizontal">
                <select value={t.align} onChange={(e) => set({ align: e.target.value as Theme['align'] })}>
                  <option value="left">Gauche</option>
                  <option value="center">Centré</option>
                  <option value="right">Droite</option>
                </select>
              </Field>
              <Field label="Vertical">
                <select value={t.vAlign} onChange={(e) => set({ vAlign: e.target.value as Theme['vAlign'] })}>
                  <option value="top">Haut</option>
                  <option value="middle">Milieu</option>
                  <option value="bottom">Bas</option>
                </select>
              </Field>
            </div>
            <Field label="Marge haute">
              <Range value={t.box.top} min={0} max={85} onChange={(top) => box({ top })} suffix=" %" />
            </Field>
            <Field label="Marge basse">
              <Range value={t.box.bottom} min={0} max={85} onChange={(bottom) => box({ bottom })} suffix=" %" />
            </Field>
            <Field label="Marges gauche / droite">
              <Range value={t.box.left} min={0} max={40} onChange={(v) => box({ left: v, right: v })} suffix=" %" />
            </Field>
            <div className="row">
              <Field label="Fond de la zone de texte">
                <input type="color" value={t.box.bgColor} onChange={(e) => box({ bgColor: e.target.value })} />
              </Field>
              <Field label="Opacité">
                <Range value={t.box.bgOpacity} min={0} max={1} step={0.05} onChange={(bgOpacity) => box({ bgOpacity })} />
              </Field>
            </div>
            <div className="row">
              <Field label="Arrondi">
                <Range value={t.box.radius} min={0} max={60} onChange={(radius) => box({ radius })} />
              </Field>
              <Field label="Marge interne">
                <Range value={t.box.padding} min={0} max={80} onChange={(padding) => box({ padding })} />
              </Field>
            </div>
          </fieldset>
          <fieldset>
            <legend>Effets</legend>
            <div className="row">
              <Toggle checked={t.shadow.enabled} onChange={(enabled) => shadow({ enabled })} label="Ombre" />
              <input type="color" value={t.shadow.color} onChange={(e) => shadow({ color: e.target.value })} aria-label="Couleur de l’ombre" />
            </div>
            {t.shadow.enabled && (
              <>
                <Field label="Flou">
                  <Range value={t.shadow.blur} min={0} max={40} onChange={(blur) => shadow({ blur })} />
                </Field>
                <Field label="Décalage">
                  <Range value={t.shadow.x} min={-15} max={15} onChange={(v) => shadow({ x: v, y: v })} />
                </Field>
              </>
            )}
            <div className="row">
              <Toggle checked={t.outline.enabled} onChange={(enabled) => outline({ enabled })} label="Contour" />
              <input type="color" value={t.outline.color} onChange={(e) => outline({ color: e.target.value })} aria-label="Couleur du contour" />
            </div>
            {t.outline.enabled && (
              <Field label="Épaisseur">
                <Range value={t.outline.width} min={1} max={10} onChange={(width) => outline({ width })} />
              </Field>
            )}
          </fieldset>
          <fieldset>
            <legend>Pied de page (référence, copyright)</legend>
            <Toggle checked={t.footer.show} onChange={(show) => footer({ show })} label="Afficher" />
            <div className="row">
              <Field label="Taille">
                <Range value={t.footer.size} min={14} max={80} onChange={(size) => footer({ size })} />
              </Field>
              <Field label="Couleur">
                <input type="color" value={t.footer.color} onChange={(e) => footer({ color: e.target.value })} />
              </Field>
              <Field label="Alignement">
                <select value={t.footer.align} onChange={(e) => footer({ align: e.target.value as Theme['align'] })}>
                  <option value="left">Gauche</option>
                  <option value="center">Centré</option>
                  <option value="right">Droite</option>
                </select>
              </Field>
            </div>
          </fieldset>
          <fieldset>
            <legend>Transition</legend>
            <div className="row">
              <Field label="Effet">
                <select value={t.transition.type} onChange={(e) => set({ transition: { ...t.transition, type: e.target.value as Theme['transition']['type'] } })}>
                  <option value="none">Aucune</option>
                  <option value="fade">Fondu</option>
                  <option value="slide">Glissement</option>
                  <option value="zoom">Zoom</option>
                </select>
              </Field>
              <Field label="Durée">
                <Range value={t.transition.duration} min={100} max={2000} step={50} onChange={(duration) => set({ transition: { ...t.transition, duration } })} suffix=" ms" />
              </Field>
            </div>
          </fieldset>
        </div>
        <div className="theme-preview">
          <div className="monitor-wrap" ref={ref}>
            {size.width > 0 && (
              <SlideRenderer slide={{ ...SAMPLE_SLIDE, text: sample }} theme={t} aspect={aspect} width={Math.min(size.width, Math.floor((size.height * 16) / 9))} role="monitor" />
            )}
          </div>
          <Field label="Texte d’essai">
            <textarea rows={4} value={sample} onChange={(e) => setSample(e.target.value)} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
