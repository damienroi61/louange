import { useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/store';
import type { Slide, Song } from '../../types';
import { Field, Modal, SlideGrid } from '../../components/ui';
import { newSong, parseSections, songFooter, songSlides } from '../../lib/songs';

const TAGS = ['Couplet', 'Refrain', 'Pré-refrain', 'Pont', 'Intro', 'Fin'];

export function SongEditor({ id }: { id?: string }) {
  const existing = useStore((s) => (id ? s.songs[id] : undefined));
  const themes = useStore((s) => s.themes);
  const settings = useStore((s) => s.settings);
  const st = useStore.getState();
  const [song, setSong] = useState<Song>(() => existing ?? newSong());
  const [idx, setIdx] = useState(0);
  const ta = useRef<HTMLTextAreaElement>(null);
  const set = (patch: Partial<Song>) => setSong((s) => ({ ...s, ...patch }));

  const sections = useMemo(() => parseSections(song.lyrics), [song.lyrics]);
  const slides: Slide[] = useMemo(() => {
    const footer = songFooter(song);
    return songSlides(song, settings.maxLinesPerSlide).map((p, i) => ({
      id: `ed-${i}`,
      kind: 'text',
      label: p.label,
      sectionKey: p.key.replace(/#\d+$/, ''),
      text: p.text,
      footer: i === 0 ? footer : undefined,
    }));
  }, [song, settings.maxLinesPerSlide]);
  const theme = themes[song.themeId || settings.defaultSongTheme] || Object.values(themes)[0];

  const insertTag = (tag: string) => {
    const el = ta.current;
    if (!el) return;
    let label = tag;
    if (tag === 'Couplet') label = `Couplet ${sections.filter((s) => s.key.startsWith('C')).length + 1}`;
    const before = song.lyrics.slice(0, el.selectionStart);
    const after = song.lyrics.slice(el.selectionEnd);
    const prefix = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const ins = `${prefix}[${label}]\n`;
    set({ lyrics: before + ins + after });
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = before.length + ins.length;
    });
  };

  const save = async () => {
    if (!song.title.trim()) return st.toast('Le titre est obligatoire', 'error');
    await st.saveSong(song);
    st.toast(`Chant « ${song.title} » enregistré`, 'success');
    st.setDialog(null);
  };

  return (
    <Modal
      title={existing ? `Modifier « ${existing.title} »` : 'Nouveau chant'}
      onClose={() => st.setDialog(null)}
      xwide
      footer={
        <>
          <span className="muted">Astuce : une ligne vide dans une section force une nouvelle diapositive.</span>
          <div className="grow" />
          <button onClick={() => st.setDialog(null)}>Annuler</button>
          <button className="primary" onClick={save} data-testid="save-song">
            Enregistrer
          </button>
        </>
      }
    >
      <div className="editor-split">
        <div className="editor-form">
          <div className="form-grid">
            <Field label="Titre" className="span2">
              <input value={song.title} onChange={(e) => set({ title: e.target.value })} autoFocus data-testid="song-title" />
            </Field>
            <Field label="Auteur(s)">
              <input value={song.author} onChange={(e) => set({ author: e.target.value })} />
            </Field>
            <Field label="Copyright">
              <input value={song.copyright} onChange={(e) => set({ copyright: e.target.value })} />
            </Field>
            <Field label="N° CCLI">
              <input value={song.ccli} onChange={(e) => set({ ccli: e.target.value })} />
            </Field>
            <Field label="Tonalité">
              <input value={song.key} onChange={(e) => set({ key: e.target.value })} placeholder="ex. Sol" />
            </Field>
            <Field label="Mots-clés">
              <input value={song.tags} onChange={(e) => set({ tags: e.target.value })} placeholder="louange, Noël…" />
            </Field>
            <Field label="Thème">
              <select value={song.themeId || ''} onChange={(e) => set({ themeId: e.target.value || undefined })}>
                <option value="">Thème par défaut des chants</option>
                {Object.values(themes).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="tag-bar">
            <span className="muted">Insérer :</span>
            {TAGS.map((t) => (
              <button key={t} className="small" onClick={() => insertTag(t)}>
                [{t}]
              </button>
            ))}
          </div>
          <textarea
            ref={ta}
            className="lyrics-input"
            value={song.lyrics}
            onChange={(e) => set({ lyrics: e.target.value })}
            placeholder={'[Couplet 1]\nPremière ligne\nDeuxième ligne\n\n[Refrain]\n…'}
            spellCheck
            data-testid="song-lyrics"
          />
          <Field label="Ordre de passage (facultatif)" hint={`Sections disponibles : ${sections.map((s) => s.key.replace(/#\d+$/, '')).join(' ') || '—'}  ·  Exemple : C1 R C2 R P R`}>
            <input value={song.arrangement} onChange={(e) => set({ arrangement: e.target.value })} placeholder="Laisser vide pour l’ordre naturel" />
          </Field>
        </div>
        <div className="editor-preview">
          <div className="muted">
            Aperçu : {slides.length} diapositive{slides.length > 1 ? 's' : ''} (max {settings.maxLinesPerSlide} lignes)
          </div>
          <SlideGrid slides={slides} theme={theme} aspect={settings.aspect} activeIndex={idx} thumbSize={190} onSelect={setIdx} empty="Saisissez les paroles…" />
        </div>
      </div>
    </Modal>
  );
}
