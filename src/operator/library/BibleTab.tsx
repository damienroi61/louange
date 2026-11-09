import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/store';
import type { BibleSelection, ScheduleItem } from '../../types';
import { BOOKS, allTranslations, bookName, formatReference, loadBible, parseBibleFile, parseReference, searchBible, translationInfo, type BibleData } from '../../lib/bible';
import { pickFiles } from '../../lib/backup';
import { dragItem } from '../SchedulePanel';
import { LibraryActions } from './SongsTab';

interface Sel {
  chapter: number;
  from: number;
  chapterTo: number;
  to: number;
}

async function importBible(onDone: (id: string) => void) {
  const st = useStore.getState();
  const [file] = await pickFiles('.xml,.json', false);
  if (!file) return;
  try {
    const { books, title } = parseBibleFile(file.name, await file.text());
    const name = prompt('Nom de cette traduction', title.replace(/\.[^.]+$/, '')) || title;
    const short = (prompt('Abréviation (affichée après la référence)', name.split(/\s+/).map((w) => w[0]).join('').slice(0, 5).toUpperCase()) || 'BIB').slice(0, 8);
    const lang = /king james|english|kjv|web|esv|niv/i.test(name) ? 'en' : 'fr';
    const t = await st.addCustomBible({ name, short, lang }, books);
    st.toast(`Bible « ${name} » importée`, 'success');
    onDone(t.id);
  } catch (e) {
    st.toast(`Import impossible : ${(e as Error).message}`, 'error');
  }
}

export function BibleTab() {
  const settings = useStore((s) => s.settings);
  useStore((s) => s.customBibles);
  const st = useStore.getState();
  const [translation, setTranslation] = useState(settings.defaultTranslation);
  const [secondary, setSecondary] = useState('');
  const [data, setData] = useState<BibleData | null>(null);
  const [error, setError] = useState('');
  const [book, setBook] = useState(42);
  const [chapter, setChapter] = useState(3);
  const [sel, setSel] = useState<Sel | null>({ chapter: 3, from: 16, chapterTo: 3, to: 16 });
  const [refInput, setRefInput] = useState('');
  const [mode, setMode] = useState<'browse' | 'search'>('browse');
  const [query, setQuery] = useState('');
  const [perSlide, setPerSlide] = useState(settings.versesPerSlide);
  const [numbers, setNumbers] = useState(settings.showVerseNumbers);
  const [anchor, setAnchor] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setError('');
    loadBible(translation)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(String(e.message || e)));
    return () => {
      alive = false;
    };
  }, [translation]);

  const lang = translationInfo(translation).lang;
  const chapters = data?.books[book]?.length ?? 0;
  const verses = data?.books[book]?.[chapter - 1] ?? [];
  const results = useMemo(() => (data && mode === 'search' && query.trim().length >= 3 ? searchBible(data, query) : []), [data, mode, query]);

  const goRef = () => {
    const r = parseReference(refInput);
    if (!r) return st.toast('Référence non reconnue (ex. : Jean 3:16-18, Ps 23, 1 Co 13:4-7)', 'error');
    setMode('browse');
    setBook(r.book);
    setChapter(r.chapter);
    if (r.verseFrom) setSel({ chapter: r.chapter, from: r.verseFrom, chapterTo: r.chapterTo ?? r.chapter, to: r.verseTo ?? r.verseFrom });
    else if (r.chapterTo) setSel({ chapter: r.chapter, from: 1, chapterTo: r.chapterTo, to: 999 });
    else setSel(null);
    setTimeout(() => document.querySelector('.verse.in-sel')?.scrollIntoView({ block: 'center' }), 50);
  };

  const clickVerse = (v: number, shift: boolean) => {
    if (shift && anchor !== null) {
      setSel({ chapter, from: Math.min(anchor, v), chapterTo: chapter, to: Math.max(anchor, v) });
    } else {
      setAnchor(v);
      setSel({ chapter, from: v, chapterTo: chapter, to: v });
    }
  };

  const effective: Sel = sel ?? { chapter, from: 1, chapterTo: chapter, to: verses.length || 1 };
  const selection: BibleSelection = {
    translation,
    secondary: secondary || undefined,
    book,
    chapter: effective.chapter,
    verseFrom: effective.from,
    chapterTo: effective.chapterTo,
    verseTo: effective.to,
    versesPerSlide: perSlide,
    showVerseNumbers: numbers,
  };
  const lastVerseTo = data?.books[book]?.[effective.chapterTo - 1]?.length ?? effective.to;
  const refLabel = formatReference(
    { book, chapter: effective.chapter, verseFrom: effective.from, chapterTo: effective.chapterTo, verseTo: Math.min(effective.to, lastVerseTo) },
    lang,
  );
  const item: Omit<ScheduleItem, 'id'> = {
    type: 'bible',
    title: `${refLabel} (${translationInfo(translation).short}${secondary ? ' / ' + translationInfo(secondary).short : ''})`,
    bible: selection,
  };
  const inSel = (v: number) => !!sel && sel.chapter === chapter && v >= sel.from && (sel.chapterTo > chapter || v <= sel.to);

  return (
    <div className="bible-tab">
      <div className="lib-toolbar">
        <select value={translation} onChange={(e) => setTranslation(e.target.value)} aria-label="Traduction">
          {allTranslations().map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select value={secondary} onChange={(e) => setSecondary(e.target.value)} aria-label="Seconde traduction" title="Afficher une seconde traduction sous le texte">
          <option value="">— Sans 2ᵉ traduction —</option>
          {allTranslations().filter((t) => t.id !== translation).map((t) => (
            <option key={t.id} value={t.id}>
              + {t.name}
            </option>
          ))}
        </select>
        <button className="small" onClick={() => importBible(setTranslation)} title="Importer une traduction (Zefania XML, Beblia XML ou JSON) dont vous possédez les droits">
          + Bible
        </button>
        {translationInfo(translation).custom && (
          <button
            className="small danger"
            title="Supprimer cette traduction importée"
            onClick={() => {
              if (confirm(`Supprimer la traduction « ${translationInfo(translation).name} » ?`)) {
                st.removeCustomBible(translation);
                setTranslation('lsg1910');
              }
            }}
          >
            ✕
          </button>
        )}
        <div className="seg">
          <button className={mode === 'browse' ? 'on' : ''} onClick={() => setMode('browse')}>
            Référence
          </button>
          <button className={mode === 'search' ? 'on' : ''} onClick={() => setMode('search')}>
            Recherche
          </button>
        </div>
        {mode === 'browse' ? (
          <input
            className="grow"
            placeholder="Tapez une référence puis Entrée : Jean 3:16-18, Ps 23, 1 Co 13:4-7…"
            value={refInput}
            onChange={(e) => setRefInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && goRef()}
            data-testid="bible-ref"
          />
        ) : (
          <input className="grow" placeholder="Mots à rechercher (au moins 3 lettres)…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        )}
      </div>
      {error && <div className="error-box">{error}</div>}
      <div className="bible-body">
        {mode === 'browse' && (
          <div className="bible-nav">
            <div className="book-list">
              {BOOKS.map((b, i) => (
                <button key={b.fr} className={`book ${i === book ? 'on' : ''} ${i >= 39 ? 'nt' : ''}`} onClick={() => (setBook(i), setChapter(1), setSel(null))}>
                  {lang === 'en' ? b.en : b.fr}
                </button>
              ))}
            </div>
            <div className="chapter-grid">
              {Array.from({ length: chapters }, (_, i) => (
                <button key={i} className={`chap ${i + 1 === chapter ? 'on' : ''}`} onClick={() => (setChapter(i + 1), setSel(null))}>
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="verses">
          {mode === 'browse' ? (
            <>
              <div className="verses-head">
                {bookName(book, lang)} {chapter} <span className="muted">— cliquez un verset, Maj+clic pour une plage, ou rien pour tout le chapitre</span>
              </div>
              {verses.map((t, i) => (
                <div
                  key={i}
                  className={`verse ${inSel(i + 1) ? 'in-sel' : ''}`}
                  onClick={(e) => clickVerse(i + 1, e.shiftKey)}
                  onDoubleClick={() => {
                    const it = st.addItem({ ...item, bible: { ...selection, chapter, verseFrom: i + 1, chapterTo: chapter, verseTo: i + 1 } });
                    st.preview(it);
                  }}
                  draggable
                  onDragStart={(e) => dragItem(e, item)}
                >
                  <sup>{i + 1}</sup> {t}
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="verses-head">
                {results.length} résultat{results.length > 1 ? 's' : ''}
                {results.length >= 300 ? ' (limités à 300)' : ''}
              </div>
              {results.map((r) => (
                <div
                  key={`${r.book}.${r.chapter}.${r.verse}`}
                  className="verse"
                  onClick={() => {
                    setMode('browse');
                    setBook(r.book);
                    setChapter(r.chapter);
                    setSel({ chapter: r.chapter, from: r.verse, chapterTo: r.chapter, to: r.verse });
                    setTimeout(() => document.querySelector('.verse.in-sel')?.scrollIntoView({ block: 'center' }), 50);
                  }}
                >
                  <b>
                    {bookName(r.book, lang)} {r.chapter}:{r.verse}
                  </b>{' '}
                  {r.text}
                </div>
              ))}
            </>
          )}
        </div>
        <div className="bible-side">
          <div className="bible-ref-label" data-testid="bible-selection">
            {refLabel}
          </div>
          <label className="field">
            <span className="field-label">Versets par diapositive</span>
            <select value={perSlide} onChange={(e) => setPerSlide(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={0}>Automatique (selon la longueur)</option>
            </select>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={numbers} onChange={(e) => setNumbers(e.target.checked)} /> Numéros de versets
          </label>
          <div draggable onDragStart={(e) => dragItem(e, item)} className="drag-hint" title="Glissez vers le programme">
            ⠿ Glisser vers le programme
          </div>
          <LibraryActions item={item} />
        </div>
      </div>
    </div>
  );
}
