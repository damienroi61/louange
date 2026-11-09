import { useState } from 'react';
import { useStore } from '../../store/store';
import type { MediaItem, MediaType, ScheduleItem } from '../../types';
import { formatSize, importMediaFile, mediaTypeOf } from '../../lib/media';
import { pickFiles } from '../../lib/backup';
import { dragItem } from '../SchedulePanel';
import { formatDuration } from '../../lib/ids';

export function mediaItem(m: MediaItem): Omit<ScheduleItem, 'id'> {
  return { type: 'media', title: m.name, refId: m.id, loop: m.type === 'video' ? false : undefined };
}

export async function importFiles(files: File[]) {
  const st = useStore.getState();
  const added: MediaItem[] = [];
  for (const f of files) {
    if (!mediaTypeOf(f)) {
      st.toast(`${f.name} : format non pris en charge`, 'error');
      continue;
    }
    try {
      const m = await importMediaFile(f);
      if (m) added.push(m);
    } catch (e) {
      st.toast(`${f.name} : ${(e as Error).message}`, 'error');
    }
  }
  if (added.length) {
    st.addMedia(added);
    st.toast(`${added.length} média(s) importé(s)`, 'success');
  }
  return added;
}

const ICON: Record<MediaType, string> = { image: '🖼', video: '🎬', audio: '♪' };

export function MediaTab() {
  const media = useStore((s) => s.media);
  const logoId = useStore((s) => s.settings.logoMediaId);
  const st = useStore.getState();
  const [filter, setFilter] = useState<'all' | MediaType>('all');
  const [q, setQ] = useState('');
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const list = Object.values(media)
    .filter((m) => (filter === 'all' || m.type === filter) && m.name.toLowerCase().includes(q.toLowerCase()))
    .filter((m) => !/ — page \d+$| — \d+$/.test(m.name) || q)
    .sort((a, b) => b.createdAt - a.createdAt);

  const doImport = async (files: File[]) => {
    setBusy(true);
    try {
      await importFiles(files);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`media-tab ${over ? 'drop-over' : ''}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        doImport(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="lib-toolbar">
        <div className="seg">
          {(['all', 'image', 'video', 'audio'] as const).map((f) => (
            <button key={f} className={filter === f ? 'on' : ''} onClick={() => setFilter(f)}>
              {f === 'all' ? 'Tous' : f === 'image' ? 'Images' : f === 'video' ? 'Vidéos' : 'Audio'}
            </button>
          ))}
        </div>
        <input type="search" className="grow" placeholder="Filtrer par nom…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="small" disabled={busy} onClick={async () => doImport(await pickFiles('image/*,video/*,audio/*'))} data-testid="import-media">
          {busy ? 'Import…' : 'Importer des fichiers'}
        </button>
        <button className="small" onClick={() => st.setDialog({ type: 'camera' })}>
          ◉ Caméra
        </button>
      </div>
      <div className="media-grid">
        {list.length === 0 && <div className="empty">Glissez-déposez ici des images, vidéos ou fichiers audio, ou cliquez sur « Importer des fichiers ».</div>}
        {list.map((m) => (
          <div key={m.id} className="media-card" draggable onDragStart={(e) => dragItem(e, mediaItem(m))} onDoubleClick={() => st.preview(st.addItem(mediaItem(m)))}>
            <div className="media-thumb">
              {m.thumb ? <img src={m.thumb} alt="" /> : <span className="media-icon">{ICON[m.type]}</span>}
              <span className="media-badge">
                {ICON[m.type]} {m.duration ? formatDuration(m.duration * 1000) : ''}
              </span>
              {logoId === m.id && <span className="media-badge logo-badge">Logo</span>}
            </div>
            <div className="media-name" title={m.name}>
              {m.name}
            </div>
            <div className="media-meta muted">{formatSize(m.size)}</div>
            <div className="media-actions">
              <button className="small" title="Aperçu" onClick={() => st.preview({ ...mediaItem(m), id: `lib-media-${m.id}` })}>
                👁
              </button>
              <button className="small" title="Ajouter au programme" onClick={() => (st.addItem(mediaItem(m)), st.toast(`« ${m.name} » ajouté`, 'success'))}>
                +
              </button>
              <button className="small" title="Afficher en direct" onClick={() => st.goLiveItem({ ...mediaItem(m), id: `lib-media-${m.id}` })}>
                ▶
              </button>
              {(m.type === 'image' || m.type === 'video') && (
                <button
                  className="small"
                  title="Utiliser comme fond du direct (derrière le texte)"
                  onClick={() =>
                    st.setBackgroundOverride(m.type === 'image' ? { type: 'image', mediaId: m.id, fit: 'cover' } : { type: 'video', mediaId: m.id, fit: 'cover', loop: true, muted: true })
                  }
                >
                  Fond
                </button>
              )}
              {m.type === 'image' && (
                <button className="small" title="Définir comme logo" onClick={() => st.updateSettings({ logoMediaId: logoId === m.id ? undefined : m.id })}>
                  Logo
                </button>
              )}
              <button
                className="small"
                title="Renommer"
                onClick={() => {
                  const n = prompt('Nouveau nom', m.name);
                  if (n) st.renameMedia(m.id, n);
                }}
              >
                ✎
              </button>
              <button className="small danger" title="Supprimer" onClick={() => confirm(`Supprimer « ${m.name} » ?`) && st.deleteMedia(m.id)}>
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
