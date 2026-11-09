import { useStore } from '../store/store';
import { exportSchedule, downloadJSON, importBackup, pickFiles, type BackupFile } from '../lib/backup';
import { toggleWindow } from './windows';

export async function importLouangeFile() {
  const st = useStore.getState();
  const [file] = await pickFiles('.louange,.json', false);
  if (!file) return;
  try {
    const data = JSON.parse(await file.text()) as BackupFile;
    await importBackup(data);
    if (data.format === 'louange-schedule' && data.schedules?.[0]) {
      await st.importScheduleObject(data.schedules[0]);
      st.toast(`Programme « ${data.schedules[0].name} » importé`, 'success');
    } else {
      await st.init();
      st.toast('Sauvegarde restaurée', 'success');
    }
  } catch (e) {
    st.toast(`Import impossible : ${(e as Error).message}`, 'error');
  }
}

export function Toolbar() {
  const schedule = useStore((s) => s.schedule);
  const dirty = useStore((s) => s.dirty);
  const outputOpen = useStore((s) => s.outputOpen);
  const stageOpen = useStore((s) => s.stageOpen);
  const alert = useStore((s) => s.alert);
  const st = useStore.getState();

  const exportCurrent = async () => {
    const data = await exportSchedule(useStore.getState().schedule, Object.values(useStore.getState().themes));
    const safe = schedule.name.replace(/[\\/:*?"<>|]+/g, '_') || 'programme';
    downloadJSON(data, `${safe} ${schedule.date}.louange`);
  };

  return (
    <header className="toolbar">
      <div className="brand" title="Louange">
        <span className="brand-mark">✦</span> Louange
      </div>
      <div className="tb-group">
        <input
          className="schedule-name"
          value={schedule.name}
          onChange={(e) => st.renameSchedule(e.target.value)}
          aria-label="Nom du programme"
          title="Nom du programme"
        />
        <input
          type="date"
          className="schedule-date"
          value={schedule.date}
          onChange={(e) => st.renameSchedule(schedule.name, e.target.value)}
          aria-label="Date du programme"
        />
        {dirty && <span className="dirty-dot" title="Modifications non enregistrées" />}
      </div>
      <div className="tb-group">
        <button onClick={() => (!dirty || confirm('Créer un nouveau programme ? Les modifications non enregistrées seront perdues.')) && st.newSchedule()}>
          Nouveau
        </button>
        <button onClick={() => st.setDialog({ type: 'schedules' })}>Ouvrir…</button>
        <button onClick={() => st.saveSchedule()} title="Ctrl+S">
          Enregistrer
        </button>
        <button onClick={exportCurrent} title="Exporter le programme avec ses chants et médias (pour un autre ordinateur)">
          Exporter
        </button>
        <button onClick={importLouangeFile} title="Importer un programme ou une sauvegarde (.louange)">
          Importer
        </button>
      </div>
      <div className="tb-spacer" />
      <div className="tb-group">
        <button className={`win-btn ${outputOpen ? 'on' : ''}`} onClick={() => toggleWindow('output')} title="Ouvrir/fermer la sortie projecteur" data-testid="toggle-output">
          <span className="status-dot" /> Sortie
        </button>
        <button className={`win-btn ${stageOpen ? 'on' : ''}`} onClick={() => toggleWindow('stage')} title="Ouvrir/fermer le moniteur de scène">
          <span className="status-dot" /> Scène
        </button>
        <button className={alert ? 'alert-on' : ''} onClick={() => st.setDialog({ type: 'alert' })}>
          {alert ? '● Alerte active' : 'Alerte'}
        </button>
        <button onClick={() => st.setDialog({ type: 'settings' })}>Paramètres</button>
        <button onClick={() => st.setDialog({ type: 'help' })} aria-label="Aide">
          ?
        </button>
      </div>
    </header>
  );
}
