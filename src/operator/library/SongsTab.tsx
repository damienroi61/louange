import { useMemo, useState } from 'react';
import { useStore } from '../../store/store';
import type { ScheduleItem, Song } from '../../types';
import { exportOpenLyrics, importSongFile, parseSections, searchSongs } from '../../lib/songs';
import { downloadBlob, downloadJSON, pickFiles } from '../../lib/backup';
import { dragItem } from '../SchedulePanel';
import { sectionClass } from '../../components/ui';

export function songItem(song: Song): Omit<ScheduleItem, 'id'> {
  return { type: 'song', title: song.title, refId: song.id };
}

export function LibraryActions({ item, label }: { item: Omit<ScheduleItem, 'id'>; label?: string }) {
  const st = useStore.getState();
  const tempId = `lib-${item.type}-${item.refId || item.title}`;
  return (
    <div className="lib-actions">
      <button className="small" onClick={() => st.preview({ ...item, id: tempId })} data-testid="lib-preview">
        Aperçu
      </button>
      <button
        className="small"
        onClick={() => {
          const it = st.addItem(item);
          st.preview(it);
          st.toast(`« ${item.title} » ajouté au programme`, 'success');
        }}
        data-testid="lib-add"
      >
        + Programme
      </button>
      <button className="small primary" onClick={() => st.goLiveItem({ ...item, id: tempId })} data-testid="lib-live">
        Direct ▶
      </button>
      {label}
    </div>
  );
}

export function SongsTab() {
  const songs = useStore((s) => s.songs);
  const st = useStore.getState();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const list = useMemo(() => searchSongs(Object.values(songs), q), [songs, q]);
  const song = sel ? songs[sel] : list[0];

  const doImport = async () => {
    const files = await pickFiles('.txt,.xml,.cho,.chopro,.chordpro,.crd,.pro,.json');
    let n = 0;
    for (const f of files) {
      try {
        for (const s of importSongFile(f.name, await f.text())) {
          await st.saveSong(s);
          n++;
        }
      } catch (e) {
        st.toast(`${f.name} : ${(e as Error).message}`, 'error');
      }
    }
    if (n) st.toast(`${n} chant(s) importé(s)`, 'success');
  };

  return (
    <div className="lib-split">
      <div className="lib-list-col">
        <div className="lib-toolbar">
          <input
            type="search"
            placeholder="Rechercher un titre, des paroles, un auteur…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="grow"
            data-testid="song-search"
            id="library-search"
          />
          <button className="small" onClick={() => st.setDialog({ type: 'song' })} data-testid="new-song">
            + Nouveau
          </button>
          <button className="small" onClick={doImport} title="Texte (.txt), OpenLyrics (.xml), ChordPro (.cho), JSON">
            Importer
          </button>
          <button className="small" onClick={() => downloadJSON(Object.values(songs), 'chants-louange.json')} title="Exporter tous les chants">
            Exporter
          </button>
        </div>
        <div className="lib-list" role="listbox" aria-label="Chants">
          {list.length === 0 && <div className="empty">Aucun chant trouvé.</div>}
          {list.slice(0, 500).map((s) => (
            <div
              key={s.id}
              role="option"
              aria-selected={song?.id === s.id}
              className={`lib-row ${song?.id === s.id ? 'selected' : ''}`}
              draggable
              onDragStart={(e) => dragItem(e, songItem(s))}
              onClick={() => setSel(s.id)}
              onDoubleClick={() => {
                const it = st.addItem(songItem(s));
                st.preview(it);
              }}
              data-testid="song-row"
            >
              <div className="lib-row-title">{s.title}</div>
              <div className="lib-row-sub">{[s.author, s.key && `Ton : ${s.key}`].filter(Boolean).join(' · ')}</div>
            </div>
          ))}
        </div>
        <div className="muted lib-count">{Object.keys(songs).length} chants</div>
      </div>
      <div className="lib-detail">
        {song ? (
          <>
            <div className="lib-detail-head">
              <div>
                <h3>{song.title}</h3>
                <div className="muted">{[song.author, song.copyright && `© ${song.copyright}`, song.ccli && `CCLI ${song.ccli}`].filter(Boolean).join(' · ')}</div>
              </div>
              <div className="grow" />
              <LibraryActions item={songItem(song)} />
              <button className="small" onClick={() => st.setDialog({ type: 'song', id: song.id })}>
                Modifier
              </button>
              <button className="small" onClick={() => downloadBlob(new Blob([exportOpenLyrics(song)], { type: 'application/xml' }), `${song.title}.xml`)} title="Exporter en OpenLyrics">
                XML
              </button>
              <button
                className="small danger"
                onClick={() => {
                  if (confirm(`Supprimer « ${song.title} » ?`)) st.deleteSong(song.id);
                }}
              >
                Supprimer
              </button>
            </div>
            <div className="lyrics-preview">
              {parseSections(song.lyrics).map((sec) => (
                <div key={sec.key} className="lyrics-sec">
                  <div className={`sec-tag ${sectionClass(sec.key)}`}>{sec.label}</div>
                  <pre>{sec.text}</pre>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty">Créez ou importez des chants pour commencer.</div>
        )}
      </div>
    </div>
  );
}
