import { useEffect, useState } from 'react';
import { useStore } from '../../store/store';
import type { CountdownConfig } from '../../types';
import { Field, Modal, Range } from '../../components/ui';
import { SongEditor } from './SongEditor';
import { ThemeEditor } from './ThemeEditor';
import { PresentationEditor } from './PresentationEditor';
import { SettingsDialog } from './SettingsDialog';
import { ALERT_TEMPLATES } from '../../lib/defaults';
import { SlideRenderer } from '../../components/SlideRenderer';
import { SAMPLE_SLIDE } from '../library/ThemesTab';

function AlertDialog() {
  const draft = useStore((s) => s.alertDraft);
  const active = useStore((s) => s.alert);
  const st = useStore.getState();
  const [num, setNum] = useState('');
  const text = draft.text.replace('{n}', num || '…');
  return (
    <Modal
      title="Alerte / message défilant"
      onClose={() => st.setDialog(null)}
      wide
      footer={
        <>
          {active && (
            <button className="danger" onClick={() => st.hideAlert()}>
              Masquer l’alerte
            </button>
          )}
          <div className="grow" />
          <button onClick={() => st.setDialog(null)}>Fermer</button>
          <button
            className="primary"
            disabled={!draft.text.trim()}
            onClick={() => {
              st.showAlert({ ...draft, text });
              st.setDialog(null);
            }}
            data-testid="show-alert"
          >
            Afficher à l’écran
          </button>
        </>
      }
    >
      <p className="muted">Le message s’affiche par-dessus la projection en cours (garderie, véhicule mal garé, annonce…).</p>
      <Field label="Message" hint="Utilisez {n} pour insérer un numéro (ex. numéro d’enfant).">
        <textarea rows={2} value={draft.text} onChange={(e) => st.setAlertDraft({ text: e.target.value })} data-testid="alert-text" />
      </Field>
      <div className="row wrap">
        {ALERT_TEMPLATES.map((t) => (
          <button key={t} className="small" onClick={() => st.setAlertDraft({ text: t })}>
            {t.slice(0, 38)}…
          </button>
        ))}
      </div>
      {draft.text.includes('{n}') && (
        <Field label="Numéro">
          <input value={num} onChange={(e) => setNum(e.target.value)} style={{ width: 140 }} autoFocus />
        </Field>
      )}
      <div className="row wrap">
        <Field label="Position">
          <select value={draft.position} onChange={(e) => st.setAlertDraft({ position: e.target.value as 'top' | 'bottom' })}>
            <option value="bottom">Bas de l’écran</option>
            <option value="top">Haut de l’écran</option>
          </select>
        </Field>
        <Field label="Style">
          <select value={draft.mode} onChange={(e) => st.setAlertDraft({ mode: e.target.value as 'scroll' | 'static' })}>
            <option value="scroll">Défilant</option>
            <option value="static">Fixe</option>
          </select>
        </Field>
        <Field label="Fond">
          <input type="color" value={draft.bgColor} onChange={(e) => st.setAlertDraft({ bgColor: e.target.value })} />
        </Field>
        <Field label="Texte">
          <input type="color" value={draft.color} onChange={(e) => st.setAlertDraft({ color: e.target.value })} />
        </Field>
      </div>
      <div className="row wrap">
        <Field label="Taille">
          <Range value={draft.size} min={24} max={120} onChange={(size) => st.setAlertDraft({ size })} />
        </Field>
        {draft.mode === 'scroll' && (
          <>
            <Field label="Vitesse">
              <Range value={draft.speed} min={40} max={500} step={10} onChange={(speed) => st.setAlertDraft({ speed })} />
            </Field>
            <Field label="Nombre de passages (0 = en continu)">
              <Range value={draft.repeat} min={0} max={10} onChange={(repeat) => st.setAlertDraft({ repeat })} />
            </Field>
          </>
        )}
      </div>
      <div className="alert-preview">
        <SlideRenderer
          slide={SAMPLE_SLIDE}
          theme={useStore.getState().resolveTheme(null)}
          aspect="16:9"
          width={480}
          role="monitor"
          alert={{ ...draft, text, shownAt: 1, repeat: 0 }}
        />
      </div>
    </Modal>
  );
}

function SchedulesDialog() {
  const schedules = useStore((s) => s.schedules);
  const current = useStore((s) => s.schedule.id);
  const dirty = useStore((s) => s.dirty);
  const st = useStore.getState();
  return (
    <Modal title="Programmes enregistrés" onClose={() => st.setDialog(null)} wide>
      {schedules.length === 0 && <div className="empty">Aucun programme enregistré. Utilisez « Enregistrer » dans la barre d’outils.</div>}
      <div className="sched-files">
        {schedules.map((s) => (
          <div key={s.id} className={`sched-file ${s.id === current ? 'selected' : ''}`}>
            <div className="grow">
              <div className="lib-row-title">{s.name}</div>
              <div className="muted">
                {new Date(s.date + 'T12:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {s.items.length} élément(s)
              </div>
            </div>
            <button
              className="primary small"
              onClick={async () => {
                if (dirty && !confirm('Le programme en cours a des modifications non enregistrées. Continuer ?')) return;
                await st.openSchedule(s.id);
                st.setDialog(null);
              }}
            >
              Ouvrir
            </button>
            <button className="small danger" onClick={() => confirm(`Supprimer « ${s.name} » ?`) && st.deleteSchedule(s.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function CountdownDialog({ itemId }: { itemId?: string }) {
  const item = useStore((s) => s.schedule.items.find((i) => i.id === itemId));
  const st = useStore.getState();
  const [c, setC] = useState<CountdownConfig>(item?.countdown ?? { mode: 'duration', minutes: 5, time: '10:00', title: 'Le culte commence dans', endText: 'Bienvenue !' });
  const save = () => {
    const title = c.mode === 'until' ? `Compte à rebours jusqu’à ${c.time}` : `Compte à rebours ${c.minutes} min`;
    if (item) st.updateItem(item.id, { countdown: c, title });
    else st.preview(st.addItem({ type: 'countdown', title, countdown: c }));
    st.setDialog(null);
  };
  return (
    <Modal
      title="Compte à rebours"
      onClose={() => st.setDialog(null)}
      footer={
        <>
          <div className="grow" />
          <button onClick={() => st.setDialog(null)}>Annuler</button>
          <button className="primary" onClick={save}>
            {item ? 'Enregistrer' : 'Ajouter au programme'}
          </button>
        </>
      }
    >
      <Field label="Mode">
        <select value={c.mode} onChange={(e) => setC({ ...c, mode: e.target.value as CountdownConfig['mode'] })}>
          <option value="duration">Durée (démarre quand il passe au direct)</option>
          <option value="until">Jusqu’à une heure précise</option>
        </select>
      </Field>
      {c.mode === 'duration' ? (
        <Field label="Minutes">
          <input type="number" min={1} max={180} value={c.minutes} onChange={(e) => setC({ ...c, minutes: Math.max(1, Number(e.target.value)) })} />
        </Field>
      ) : (
        <Field label="Heure de début du culte">
          <input type="time" value={c.time} onChange={(e) => setC({ ...c, time: e.target.value })} />
        </Field>
      )}
      <Field label="Texte au-dessus">
        <input value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} />
      </Field>
      <Field label="Texte à la fin">
        <input value={c.endText} onChange={(e) => setC({ ...c, endText: e.target.value })} />
      </Field>
    </Modal>
  );
}

function WebDialog() {
  const st = useStore.getState();
  const [url, setUrl] = useState('https://');
  const [title, setTitle] = useState('');
  return (
    <Modal
      title="Page web"
      onClose={() => st.setDialog(null)}
      footer={
        <>
          <div className="grow" />
          <button onClick={() => st.setDialog(null)}>Annuler</button>
          <button
            className="primary"
            onClick={() => {
              const u = /^https?:\/\//.test(url) ? url : `https://${url}`;
              st.preview(st.addItem({ type: 'web', title: title || u.replace(/^https?:\/\//, ''), url: u }));
              st.setDialog(null);
            }}
          >
            Ajouter au programme
          </button>
        </>
      }
    >
      <Field label="Adresse" hint="Certains sites refusent d’être affichés dans une autre application.">
        <input value={url} onChange={(e) => setUrl(e.target.value)} autoFocus />
      </Field>
      <Field label="Titre (facultatif)">
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
    </Modal>
  );
}

function CameraDialog() {
  const st = useStore.getState();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        s.getTracks().forEach((t) => t.stop());
        const all = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
        setDevices(all);
        setDeviceId(all[0]?.deviceId || '');
      } catch (e) {
        setErr(`Aucune caméra accessible : ${(e as Error).message}`);
      }
    })();
  }, []);
  return (
    <Modal
      title="Caméra / carte d’acquisition en direct"
      onClose={() => st.setDialog(null)}
      footer={
        <>
          <div className="grow" />
          <button onClick={() => st.setDialog(null)}>Annuler</button>
          <button
            className="primary"
            disabled={!devices.length}
            onClick={() => {
              const d = devices.find((x) => x.deviceId === deviceId);
              st.preview(st.addItem({ type: 'camera', title: d?.label || 'Caméra', deviceId }));
              st.setDialog(null);
            }}
          >
            Ajouter au programme
          </button>
        </>
      }
    >
      {err ? (
        <div className="error-box">{err}</div>
      ) : (
        <Field label="Source vidéo">
          <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Caméra ${i + 1}`}
              </option>
            ))}
          </select>
        </Field>
      )}
    </Modal>
  );
}

function TextDialog({ itemId }: { itemId?: string }) {
  const item = useStore((s) => s.schedule.items.find((i) => i.id === itemId));
  const st = useStore.getState();
  const [title, setTitle] = useState(item?.title || 'Annonces');
  const [text, setText] = useState(item?.text || '');
  return (
    <Modal
      title="Texte libre / annonces"
      onClose={() => st.setDialog(null)}
      wide
      footer={
        <>
          <div className="grow" />
          <button onClick={() => st.setDialog(null)}>Annuler</button>
          <button
            className="primary"
            onClick={() => {
              if (item) st.updateItem(item.id, { title, text });
              else st.preview(st.addItem({ type: 'text', title, text }));
              st.setDialog(null);
            }}
          >
            {item ? 'Enregistrer' : 'Ajouter au programme'}
          </button>
        </>
      }
    >
      <Field label="Titre">
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Texte" hint="Séparez les diapositives par une ligne vide.">
        <textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </Field>
    </Modal>
  );
}

function ItemThemeDialog({ itemId }: { itemId: string }) {
  const item = useStore((s) => s.schedule.items.find((i) => i.id === itemId));
  const themes = useStore((s) => s.themes);
  const aspect = useStore((s) => s.settings.aspect);
  const st = useStore.getState();
  if (!item) return null;
  return (
    <Modal title={`Thème de « ${item.title} »`} onClose={() => st.setDialog(null)} wide>
      <div className="theme-grid">
        <button className={`theme-card ${!item.themeId ? 'selected' : ''}`} onClick={() => (st.updateItem(item.id, { themeId: undefined }), st.setDialog(null))}>
          <div className="theme-default">Thème par défaut</div>
        </button>
        {Object.values(themes).map((t) => (
          <button key={t.id} className={`theme-card ${item.themeId === t.id ? 'selected' : ''}`} onClick={() => (st.updateItem(item.id, { themeId: t.id }), st.setDialog(null))}>
            <SlideRenderer slide={SAMPLE_SLIDE} theme={t} aspect={aspect} width={200} role="thumb" />
            <div className="theme-name">{t.name}</div>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function HelpDialog() {
  const st = useStore.getState();
  const rows: [string, string][] = [
    ['→  ↓  Espace  Page suiv.', 'Diapositive suivante'],
    ['←  ↑  Page préc.', 'Diapositive précédente'],
    ['Début / Fin', 'Première / dernière diapositive'],
    ['Entrée', 'Envoyer l’aperçu au direct'],
    ['B', 'Écran noir'],
    ['L', 'Logo'],
    ['C', 'Masquer / afficher le texte'],
    ['X', 'Masquer / afficher le fond'],
    ['Échap', 'Tout effacer'],
    ['1 … 9', 'Aller au couplet n°'],
    ['R  /  P  /  I  /  E', 'Refrain / Pont / Intro / Fin'],
    ['Ctrl+S', 'Enregistrer le programme'],
  ];
  return (
    <Modal title="Aide" onClose={() => st.setDialog(null)} wide>
      <h4>Prise en main</h4>
      <ol className="help-list">
        <li>Ouvrez la <b>Sortie</b> (barre du haut) : une fenêtre apparaît sur le projecteur.</li>
        <li>Construisez le <b>programme</b> du culte : glissez des chants, des versets, des médias ou des présentations depuis la bibliothèque.</li>
        <li>Cliquez sur un élément du programme pour le voir dans l’<b>Aperçu</b>, puis double-cliquez une diapositive (ou Entrée) pour l’envoyer au <b>Direct</b>.</li>
        <li>Pendant le culte, avancez avec les flèches ou la barre d’espace. Le <b>moniteur de scène</b> montre le texte suivant aux musiciens.</li>
      </ol>
      <h4>Raccourcis clavier</h4>
      <table className="kbd-table">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td>
                <kbd>{k}</kbd>
              </td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>Format des paroles</h4>
      <pre className="code-sample">{`[Couplet 1]\nPremière ligne\nDeuxième ligne\n\n[Refrain]\nLigne du refrain\n\n[Pont]\n…`}</pre>
      <p className="muted">Bibles incluses (domaine public) : Louis Segond 1910, Darby 1885, King James Version.</p>
    </Modal>
  );
}

export function Dialogs() {
  const d = useStore((s) => s.dialog);
  if (!d) return null;
  switch (d.type) {
    case 'song':
      return <SongEditor key={d.id || 'new'} id={d.id} />;
    case 'theme':
      return <ThemeEditor key={d.id || 'new'} id={d.id} />;
    case 'presentation':
      return <PresentationEditor key={d.id || 'new'} id={d.id} />;
    case 'settings':
      return <SettingsDialog />;
    case 'alert':
      return <AlertDialog />;
    case 'schedules':
      return <SchedulesDialog />;
    case 'countdown':
      return <CountdownDialog itemId={d.itemId} />;
    case 'web':
      return <WebDialog />;
    case 'camera':
      return <CameraDialog />;
    case 'text':
      return <TextDialog itemId={d.itemId} />;
    case 'itemTheme':
      return <ItemThemeDialog itemId={d.itemId} />;
    case 'help':
      return <HelpDialog />;
    default:
      return null;
  }
}
