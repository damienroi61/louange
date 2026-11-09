import { useStore, type LibraryTab } from '../../store/store';
import { SongsTab } from './SongsTab';
import { BibleTab } from './BibleTab';
import { MediaTab } from './MediaTab';
import { PresentationsTab } from './PresentationsTab';
import { ThemesTab } from './ThemesTab';

const TABS: { id: LibraryTab; label: string }[] = [
  { id: 'songs', label: '♪ Chants' },
  { id: 'bible', label: '✝ Bible' },
  { id: 'media', label: '▣ Médias' },
  { id: 'presentations', label: '▤ Présentations' },
  { id: 'themes', label: '🎨 Thèmes' },
];

export function Library() {
  const tab = useStore((s) => s.libraryTab);
  const setTab = useStore((s) => s.setLibraryTab);
  return (
    <section className="library" aria-label="Bibliothèque">
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <div className="tab-body">
        {tab === 'songs' && <SongsTab />}
        {tab === 'bible' && <BibleTab />}
        {tab === 'media' && <MediaTab />}
        {tab === 'presentations' && <PresentationsTab />}
        {tab === 'themes' && <ThemesTab />}
      </div>
    </section>
  );
}
