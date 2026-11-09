import { useEffect, useState } from 'react';
import { useStore } from '../../store/store';
import { Field, Modal, Range, Toggle } from '../../components/ui';
import { allTranslations } from '../../lib/bible';
import { bridge, type DisplayInfo } from '../../lib/platform';
import { downloadJSON, exportAll } from '../../lib/backup';
import { dbClear } from '../../lib/db';
import { useRemoteStore } from '../OperatorApp';
import { importLouangeFile } from '../Toolbar';
import { todayISO } from '../../lib/ids';

export function SettingsDialog() {
  const settings = useStore((s) => s.settings);
  const media = useStore((s) => s.media);
  const themes = useStore((s) => s.themes);
  const remote = useRemoteStore();
  const st = useStore.getState();
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [busy, setBusy] = useState(false);
  const up = st.updateSettings;

  useEffect(() => {
    bridge?.getDisplays().then(setDisplays);
  }, []);

  const backup = async (withMedia: boolean) => {
    setBusy(true);
    try {
      downloadJSON(await exportAll(withMedia), `louange-sauvegarde-${todayISO()}.louange`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Paramètres" onClose={() => st.setDialog(null)} wide footer={<button onClick={() => st.setDialog(null)}>Fermer</button>}>
      <div className="settings">
        <fieldset>
          <legend>Écrans</legend>
          <Field label="Format de sortie">
            <select value={settings.aspect} onChange={(e) => up({ aspect: e.target.value as typeof settings.aspect })}>
              <option value="16:9">16:9 (écran large, 1920×1080)</option>
              <option value="16:10">16:10</option>
              <option value="4:3">4:3 (ancien projecteur)</option>
            </select>
          </Field>
          {bridge ? (
            <>
              <Field label="Écran de projection">
                <select value={settings.outputDisplayId ?? ''} onChange={(e) => up({ outputDisplayId: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">Automatique (2ᵉ écran)</option>
                  {displays.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Écran du moniteur de scène">
                <select value={settings.stageDisplayId ?? ''} onChange={(e) => up({ stageDisplayId: e.target.value ? Number(e.target.value) : undefined })}>
                  <option value="">Automatique (3ᵉ écran)</option>
                  {displays.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>
              <button className="small" onClick={() => bridge!.identifyDisplays()}>
                Identifier les écrans
              </button>
            </>
          ) : (
            <p className="muted">
              Version navigateur : la sortie s’ouvre dans une nouvelle fenêtre. Déplacez-la sur le projecteur puis double-cliquez dessus pour le plein écran. Dans Chrome/Edge, autorisez la
              « gestion des fenêtres » pour qu’elle s’ouvre directement sur le 2ᵉ écran.
            </p>
          )}
          <Field label="Logo (touche L)">
            <select value={settings.logoMediaId || ''} onChange={(e) => up({ logoMediaId: e.target.value || undefined })}>
              <option value="">Aucun (écran noir avec ✦)</option>
              {Object.values(media)
                .filter((m) => m.type === 'image')
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </Field>
        </fieldset>
        <fieldset>
          <legend>Chants</legend>
          <Field label="Nombre maximum de lignes par diapositive">
            <Range value={settings.maxLinesPerSlide} min={1} max={12} onChange={(v) => up({ maxLinesPerSlide: v })} />
          </Field>
          <Field label="Thème par défaut">
            <select value={settings.defaultSongTheme} onChange={(e) => up({ defaultSongTheme: e.target.value })}>
              {Object.values(themes).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>
        <fieldset>
          <legend>Bible</legend>
          <Field label="Traduction par défaut">
            <select value={settings.defaultTranslation} onChange={(e) => up({ defaultTranslation: e.target.value })}>
              {allTranslations().map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Versets par diapositive (par défaut)">
            <select value={settings.versesPerSlide} onChange={(e) => up({ versesPerSlide: Number(e.target.value) })}>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
              <option value={0}>Automatique</option>
            </select>
          </Field>
          <Toggle checked={settings.showVerseNumbers} onChange={(v) => up({ showVerseNumbers: v })} label="Afficher les numéros de versets" />
          <Field label="Thème par défaut">
            <select value={settings.defaultBibleTheme} onChange={(e) => up({ defaultBibleTheme: e.target.value })}>
              {Object.values(themes).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>
        <fieldset>
          <legend>Comportement</legend>
          <Toggle
            checked={settings.autoAdvanceItems}
            onChange={(v) => up({ autoAdvanceItems: v })}
            label="Après la dernière diapositive, passer automatiquement à l’élément suivant du programme"
          />
        </fieldset>
        <fieldset>
          <legend>Moniteur de scène</legend>
          <Toggle checked={settings.stageShowNext} onChange={(v) => up({ stageShowNext: v })} label="Afficher la diapositive suivante" />
          <Field label="Taille du texte">
            <Range value={settings.stageFontSize} min={24} max={140} onChange={(v) => up({ stageFontSize: v })} suffix=" px" />
          </Field>
        </fieldset>
        <fieldset>
          <legend>Télécommande (téléphone / tablette)</legend>
          {bridge ? (
            <>
              <Toggle checked={settings.remoteEnabled} onChange={(v) => up({ remoteEnabled: v })} label="Activer la télécommande sur le réseau local" />
              <div className="row">
                <Field label="Port">
                  <input type="number" value={settings.remotePort} min={1024} max={65535} onChange={(e) => up({ remotePort: Number(e.target.value) || 8090 })} style={{ width: 100 }} />
                </Field>
                <Field label="Code PIN (facultatif)">
                  <input value={settings.remotePin} onChange={(e) => up({ remotePin: e.target.value.replace(/\D/g, '').slice(0, 8) })} style={{ width: 120 }} />
                </Field>
              </div>
              {settings.remoteEnabled && (
                <div className="remote-urls">
                  {remote.error ? (
                    <span className="error-box">{remote.error}</span>
                  ) : (
                    <>
                      <span className="muted">Ouvrez une de ces adresses sur un téléphone connecté au même Wi-Fi :</span>
                      {remote.urls.map((u) => (
                        <code key={u}>{u}</code>
                      ))}
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="muted">Disponible dans l’application de bureau.</p>
          )}
        </fieldset>
        <fieldset>
          <legend>Sauvegarde</legend>
          <div className="row wrap">
            <button disabled={busy} onClick={() => backup(true)}>
              Sauvegarder tout (avec médias)
            </button>
            <button disabled={busy} onClick={() => backup(false)}>
              Sauvegarder (sans médias)
            </button>
            <button onClick={importLouangeFile}>Restaurer une sauvegarde…</button>
            <button
              className="danger"
              onClick={async () => {
                if (!confirm('Effacer TOUTE la bibliothèque (chants, médias, présentations, thèmes, programmes) ? Cette action est irréversible.')) return;
                for (const s of ['songs', 'media', 'blobs', 'presentations', 'themes', 'schedules'] as const) await dbClear(s);
                location.reload();
              }}
            >
              Tout effacer
            </button>
          </div>
        </fieldset>
      </div>
    </Modal>
  );
}
