import { useState } from 'react';
import { useStore } from '../../store/store';
import type { MediaItem, Presentation, ScheduleItem } from '../../types';
import { dbAll } from '../../lib/db';
import { importPresentationFile } from '../../lib/importers';
import { pickFiles } from '../../lib/backup';
import { dragItem } from '../SchedulePanel';
import { LibraryActions } from './SongsTab';
import { SlideRenderer } from '../../components/SlideRenderer';
import { isElectron } from '../../lib/platform';

export function presentationItem(p: Presentation): Omit<ScheduleItem, 'id'> {
  return { type: 'presentation', title: p.title, refId: p.id };
}

export function PresentationsTab() {
  const presentations = useStore((s) => s.presentations);
  const aspect = useStore((s) => s.settings.aspect);
  useStore((s) => s.themes);
  const st = useStore.getState();
  const [sel, setSel] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const list = Object.values(presentations).sort((a, b) => b.updatedAt - a.updatedAt);
  const p = (sel && presentations[sel]) || list[0];

  const doImport = async () => {
    const files = await pickFiles('.pdf,.pptx,.ppt,.odp,image/*');
    for (const f of files) {
      try {
        setProgress(`Import de ${f.name}…`);
        const pres = await importPresentationFile(f, (d, t) => setProgress(`Import de ${f.name} : ${d}/${t}`));
        await st.savePresentation(pres);
        st.addMedia(await dbAll<MediaItem>('media'));
        setSel(pres.id);
        st.toast(`« ${pres.title} » importée (${pres.slides.length} diapositives${pres.source === 'PowerPoint (texte)' ? ', texte uniquement' : ''})`, 'success');
      } catch (e) {
        st.toast(`${f.name} : ${(e as Error).message}`, 'error');
      }
    }
    setProgress('');
  };

  const theme = st.resolveTheme(p ? { id: 'x', ...presentationItem(p) } : null);

  return (
    <div className="lib-split">
      <div className="lib-list-col">
        <div className="lib-toolbar">
          <button className="small" onClick={() => st.setDialog({ type: 'presentation' })}>
            + Nouvelle
          </button>
          <button
            className="small"
            onClick={doImport}
            title={isElectron ? 'PDF, PowerPoint (via PowerPoint ou LibreOffice), images' : 'PDF, PowerPoint (texte), images'}
            disabled={!!progress}
          >
            Importer PDF / PowerPoint
          </button>
        </div>
        {progress && <div className="progress-line">{progress}</div>}
        <div className="lib-list">
          {list.length === 0 && <div className="empty">Aucune présentation. Créez-en une ou importez un PDF / PowerPoint.</div>}
          {list.map((x) => (
            <div
              key={x.id}
              className={`lib-row ${p?.id === x.id ? 'selected' : ''}`}
              draggable
              onDragStart={(e) => dragItem(e, presentationItem(x))}
              onClick={() => setSel(x.id)}
              onDoubleClick={() => st.preview(st.addItem(presentationItem(x)))}
            >
              <div className="lib-row-title">{x.title}</div>
              <div className="lib-row-sub">
                {x.slides.length} diapositive{x.slides.length > 1 ? 's' : ''} {x.source ? `· ${x.source}` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="lib-detail">
        {p ? (
          <>
            <div className="lib-detail-head">
              <h3>{p.title}</h3>
              <div className="grow" />
              <LibraryActions item={presentationItem(p)} />
              <button className="small" onClick={() => st.setDialog({ type: 'presentation', id: p.id })}>
                Modifier
              </button>
              <button className="small danger" onClick={() => confirm(`Supprimer « ${p.title} » ?`) && st.deletePresentation(p.id)}>
                Supprimer
              </button>
            </div>
            <div className="pres-strip">
              {p.slides.slice(0, 40).map((s, i) => (
                <div key={s.id} className="pres-mini">
                  <SlideRenderer
                    slide={{ id: s.id, kind: s.kind === 'image' ? 'image' : 'text', text: s.text, mediaId: s.mediaId, background: s.background }}
                    theme={theme}
                    aspect={aspect}
                    width={160}
                    role="thumb"
                  />
                  <span className="muted">{i + 1}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty" />
        )}
      </div>
    </div>
  );
}
