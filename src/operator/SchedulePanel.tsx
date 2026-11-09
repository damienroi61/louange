import { useState } from 'react';
import { useStore } from '../store/store';
import type { ScheduleItem } from '../types';
import { ITEM_ICONS, ITEM_LABELS } from '../lib/slides';
import { importMediaFile, mediaTypeOf } from '../lib/media';

export const DND_ITEM = 'application/x-louange-item';
const DND_INDEX = 'application/x-louange-index';

export function dragItem(e: React.DragEvent, item: Omit<ScheduleItem, 'id'>) {
  e.dataTransfer.setData(DND_ITEM, JSON.stringify(item));
  e.dataTransfer.effectAllowed = 'copy';
}

export function SchedulePanel() {
  const items = useStore((s) => s.schedule.items);
  const previewId = useStore((s) => s.previewItem?.id);
  const liveId = useStore((s) => s.liveItem?.id);
  const st = useStore.getState();
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);

  const onDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDropAt(null);
    const from = e.dataTransfer.getData(DND_INDEX);
    if (from !== '') {
      st.moveItem(Number(from), index);
      return;
    }
    const raw = e.dataTransfer.getData(DND_ITEM);
    if (raw) {
      const it = st.addItem(JSON.parse(raw), index);
      st.preview(it);
      return;
    }
    const files = Array.from(e.dataTransfer.files).filter((f) => mediaTypeOf(f));
    let i = index;
    for (const f of files) {
      const m = await importMediaFile(f);
      if (m) {
        st.addMedia([m]);
        st.addItem({ type: 'media', title: m.name, refId: m.id }, i++);
      }
    }
  };

  const rowDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropAt(e.clientY < r.top + r.height / 2 ? i : i + 1);
  };

  const quickAdd = (type: ScheduleItem['type']) => {
    setMenu(false);
    if (type === 'countdown') return st.setDialog({ type: 'countdown' });
    if (type === 'web') return st.setDialog({ type: 'web' });
    if (type === 'camera') return st.setDialog({ type: 'camera' });
    if (type === 'text') return st.setDialog({ type: 'text' });
    const it = st.addItem({ type: 'blank', title: 'Écran vide' });
    st.preview(it);
  };

  return (
    <section className="panel schedule-panel" aria-label="Programme">
      <div className="panel-head">
        <h3>Programme</h3>
        <span className="muted">{items.length} élément{items.length > 1 ? 's' : ''}</span>
        <div className="menu-wrap">
          <button className="small" onClick={() => setMenu(!menu)} aria-haspopup="menu">
            + Ajouter
          </button>
          {menu && (
            <div className="menu" role="menu" onMouseLeave={() => setMenu(false)}>
              <button onClick={() => quickAdd('text')}>¶ Texte libre / annonce</button>
              <button onClick={() => quickAdd('countdown')}>⏱ Compte à rebours</button>
              <button onClick={() => quickAdd('web')}>🌐 Page web</button>
              <button onClick={() => quickAdd('camera')}>◉ Caméra en direct</button>
              <button onClick={() => quickAdd('blank')}>□ Écran vide</button>
            </div>
          )}
        </div>
      </div>
      <div
        className="schedule-list"
        onDragOver={(e) => {
          e.preventDefault();
          if (e.target === e.currentTarget) setDropAt(items.length);
        }}
        onDragLeave={(e) => e.target === e.currentTarget && setDropAt(null)}
        onDrop={(e) => onDrop(e, dropAt ?? items.length)}
        data-testid="schedule-list"
      >
        {items.length === 0 && (
          <div className="empty">
            Glissez ici des chants, versets, médias ou présentations depuis la bibliothèque, ou utilisez le bouton « Ajouter au programme ».
          </div>
        )}
        {items.map((it, i) => (
          <div key={it.id}>
            {dropAt === i && <div className="drop-line" />}
            <div
              className={`sched-item ${previewId === it.id ? 'selected' : ''} ${liveId === it.id ? 'is-live' : ''}`}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DND_INDEX, String(i));
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => rowDragOver(e, i)}
              onDrop={(e) => {
                e.stopPropagation();
                onDrop(e, dropAt ?? i);
              }}
              onClick={() => st.preview(it)}
              onDoubleClick={() => st.goLiveItem(it)}
              data-testid="schedule-item"
            >
              <span className={`sched-icon type-${it.type}`}>{ITEM_ICONS[it.type]}</span>
              <div className="sched-text">
                <div className="sched-title">{it.title}</div>
                <div className="sched-type">{ITEM_LABELS[it.type]}</div>
              </div>
              {liveId === it.id && <span className="live-badge">DIRECT</span>}
              <div className="sched-actions">
                <button className="icon-btn" title="Thème de cet élément" onClick={(e) => (e.stopPropagation(), st.setDialog({ type: 'itemTheme', itemId: it.id }))}>
                  🎨
                </button>
                {(it.type === 'song' || it.type === 'presentation' || it.type === 'text' || it.type === 'countdown') && (
                  <button
                    className="icon-btn"
                    title="Modifier"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (it.type === 'song') st.setDialog({ type: 'song', id: it.refId });
                      else if (it.type === 'presentation') st.setDialog({ type: 'presentation', id: it.refId });
                      else if (it.type === 'text') st.setDialog({ type: 'text', itemId: it.id });
                      else st.setDialog({ type: 'countdown', itemId: it.id });
                    }}
                  >
                    ✎
                  </button>
                )}
                <button className="icon-btn" title="Retirer du programme" onClick={(e) => (e.stopPropagation(), st.removeItem(it.id))}>
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
        {dropAt === items.length && items.length > 0 && <div className="drop-line" />}
      </div>
    </section>
  );
}
