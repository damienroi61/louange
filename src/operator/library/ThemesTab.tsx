import { useStore } from '../../store/store';
import type { Slide, Theme } from '../../types';
import { SlideRenderer } from '../../components/SlideRenderer';
import { uid } from '../../lib/ids';

export const SAMPLE_SLIDE: Slide = {
  id: 'sample',
  kind: 'text',
  text: 'Car Dieu a tant aimé le monde\nqu’il a donné son Fils unique',
  footer: 'Jean 3:16 (LSG)',
};

export function duplicateTheme(t: Theme, name?: string): Theme {
  return { ...structuredClone(t), id: uid('th'), name: name ?? `${t.name} (copie)`, builtIn: false };
}

export function ThemesTab() {
  const themes = useStore((s) => s.themes);
  const settings = useStore((s) => s.settings);
  const previewItem = useStore((s) => s.previewItem);
  const items = useStore((s) => s.schedule.items);
  const st = useStore.getState();
  const list = Object.values(themes).sort((a, b) => Number(!!b.builtIn) - Number(!!a.builtIn) || a.name.localeCompare(b.name, 'fr'));
  const inSchedule = previewItem && items.some((i) => i.id === previewItem.id);

  return (
    <div className="themes-tab">
      <div className="lib-toolbar">
        <button className="small" onClick={() => st.setDialog({ type: 'theme' })}>
          + Nouveau thème
        </button>
        <span className="muted">Les thèmes définissent le fond, la police, la mise en page et les transitions.</span>
      </div>
      <div className="theme-grid">
        {list.map((t) => (
          <div key={t.id} className="theme-card">
            <SlideRenderer slide={SAMPLE_SLIDE} theme={t} aspect={settings.aspect} width={220} role="thumb" />
            <div className="theme-name">
              {t.name} {t.builtIn && <span className="muted">(intégré)</span>}
            </div>
            <div className="theme-badges">
              {settings.defaultSongTheme === t.id && <span className="badge">Chants</span>}
              {settings.defaultBibleTheme === t.id && <span className="badge">Bible</span>}
              {settings.defaultPresentationTheme === t.id && <span className="badge">Présentations</span>}
            </div>
            <div className="theme-actions">
              <button
                className="small"
                onClick={() => {
                  if (t.builtIn) {
                    const copy = duplicateTheme(t);
                    st.saveTheme(copy).then(() => st.setDialog({ type: 'theme', id: copy.id }));
                  } else st.setDialog({ type: 'theme', id: t.id });
                }}
              >
                Modifier
              </button>
              <button className="small" onClick={() => st.saveTheme(duplicateTheme(t))}>
                Dupliquer
              </button>
              <select
                className="small"
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'song') st.updateSettings({ defaultSongTheme: t.id });
                  if (v === 'bible') st.updateSettings({ defaultBibleTheme: t.id });
                  if (v === 'pres') st.updateSettings({ defaultPresentationTheme: t.id });
                  if (v === 'item' && previewItem) st.updateItem(previewItem.id, { themeId: t.id });
                }}
                aria-label="Utiliser ce thème"
              >
                <option value="">Utiliser pour…</option>
                <option value="song">Tous les chants</option>
                <option value="bible">Tous les passages bibliques</option>
                <option value="pres">Présentations et textes</option>
                {inSchedule && <option value="item">L’élément sélectionné : {previewItem!.title}</option>}
              </select>
              {!t.builtIn && (
                <button className="small danger" onClick={() => confirm(`Supprimer le thème « ${t.name} » ?`) && st.deleteTheme(t.id)}>
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
