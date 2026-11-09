import { useState } from 'react';
import { useStore } from '../store/store';
import { SlideRenderer } from '../components/SlideRenderer';
import { SlideGrid } from '../components/ui';
import { useNow, useSize } from '../lib/hooks';
import { formatDuration } from '../lib/ids';
import { useMonitorWidth } from './PreviewPanel';

function MediaControls() {
  const video = useStore((s) => s.video);
  const t = useStore((s) => s.videoTime);
  const st = useStore.getState();
  return (
    <div className="media-controls">
      <button className="icon-btn" onClick={() => st.videoCmd({ playing: true, seek: 0 })} title="Recommencer">
        ⏮
      </button>
      <button className="icon-btn" onClick={() => st.videoCmd({ playing: !video.playing })} title={video.playing ? 'Pause' : 'Lecture'}>
        {video.playing ? '⏸' : '▶'}
      </button>
      <span className="mono">{formatDuration(t.current * 1000)}</span>
      <input
        type="range"
        min={0}
        max={Math.max(1, t.duration)}
        step={0.1}
        value={Math.min(t.current, t.duration || 0)}
        onChange={(e) => st.videoCmd({ seek: Number(e.target.value), playing: video.playing })}
        aria-label="Position"
        className="grow"
      />
      <span className="mono">{formatDuration(t.duration * 1000)}</span>
      <span title="Volume">🔊</span>
      <input type="range" min={0} max={1} step={0.05} value={video.volume} onChange={(e) => st.videoCmd({ volume: Number(e.target.value), playing: video.playing })} aria-label="Volume" style={{ width: 70 }} />
    </div>
  );
}

function StageControls() {
  const msg = useStore((s) => s.stageMessage);
  const timer = useStore((s) => s.timer);
  const now = useNow(500);
  const [draft, setDraft] = useState('');
  const st = useStore.getState();
  const elapsed = timer.accumulated + (timer.running ? now - timer.startedAt : 0);
  const shown = timer.mode === 'countdown' ? timer.durationMs - elapsed : elapsed;
  return (
    <div className="stage-controls">
      <div className="row">
        <span className="muted small-label">Message scène</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={msg ? `Affiché : ${msg}` : 'Message pour les musiciens / l’orateur'}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              st.setStageMessage(draft);
              setDraft('');
            }
          }}
          className="grow"
        />
        <button className="small" onClick={() => (st.setStageMessage(draft), setDraft(''))}>
          Envoyer
        </button>
        {msg && (
          <button className="small" onClick={() => st.setStageMessage('')}>
            Effacer
          </button>
        )}
      </div>
      <div className="row">
        <span className="muted small-label">Minuteur</span>
        <select value={timer.mode} onChange={(e) => st.timerConfig({ mode: e.target.value as 'stopwatch' | 'countdown' })}>
          <option value="stopwatch">Chronomètre</option>
          <option value="countdown">Compte à rebours</option>
        </select>
        {timer.mode === 'countdown' && (
          <input
            type="number"
            min={1}
            max={600}
            value={Math.round(timer.durationMs / 60000)}
            onChange={(e) => st.timerConfig({ durationMs: Math.max(1, Number(e.target.value)) * 60000 })}
            style={{ width: 64 }}
            aria-label="Durée en minutes"
          />
        )}
        <span className={`mono timer-val ${shown < 0 ? 'over' : ''}`}>{formatDuration(shown)}</span>
        {timer.running ? (
          <button className="small" onClick={st.timerPause}>
            Pause
          </button>
        ) : (
          <button className="small" onClick={st.timerStart}>
            Démarrer
          </button>
        )}
        <button className="small" onClick={st.timerReset}>
          Réinitialiser
        </button>
      </div>
    </div>
  );
}

export function LivePanel() {
  const item = useStore((s) => s.liveItem);
  const slides = useStore((s) => s.liveSlides);
  const index = useStore((s) => s.liveIndex);
  const black = useStore((s) => s.black);
  const logo = useStore((s) => s.logo);
  const clearText = useStore((s) => s.clearText);
  const clearBackground = useStore((s) => s.clearBackground);
  const backgroundOverride = useStore((s) => s.backgroundOverride);
  const alert = useStore((s) => s.alert);
  const video = useStore((s) => s.video);
  const videoTime = useStore((s) => s.videoTime);
  const liveSince = useStore((s) => s.liveSince);
  const outputOpen = useStore((s) => s.outputOpen);
  const settings = useStore((s) => s.settings);
  useStore((s) => s.themes);
  const st = useStore.getState();
  const theme = st.resolveTheme(item);
  const [ref, size] = useSize<HTMLDivElement>();
  const mw = useMonitorWidth(size, settings.aspect);
  const slide = index >= 0 ? slides[index] ?? null : null;
  const [showStage, setShowStage] = useState(false);
  const isMedia = slide && (slide.kind === 'video' || slide.kind === 'audio');

  return (
    <section className="panel live-panel" aria-label="Direct">
      <div className="panel-head">
        <h3 className="live-title">
          <span className="rec-dot" /> Direct
        </h3>
        <span className="panel-title" title={item?.title}>
          {item?.title || '—'}
        </span>
        <span className="muted">{slides.length ? `${index + 1}/${slides.length}` : ''}</span>
      </div>
      <div className="monitor-wrap" ref={ref}>
        {mw > 0 && (
          <SlideRenderer
            slide={slide}
            theme={theme}
            aspect={settings.aspect}
            width={mw}
            role="monitor"
            className="monitor live"
            black={black}
            logo={logo}
            clearText={clearText}
            clearBackground={clearBackground}
            backgroundOverride={backgroundOverride}
            logoMediaId={settings.logoMediaId}
            alert={alert}
            liveSince={liveSince}
            video={video}
            videoSyncTime={outputOpen && slide?.kind === 'video' ? videoTime.current : undefined}
            onVideoTime={slide?.kind === 'audio' || !outputOpen ? (c, d, p) => st.setVideoTime({ current: c, duration: d, paused: p }) : undefined}
            onAlertDone={(shownAt) => {
              if (useStore.getState().alert?.shownAt === shownAt) st.hideAlert();
            }}
          />
        )}
      </div>
      <div className="live-controls">
        <button className={`ctl ${black ? 'on' : ''}`} onClick={st.toggleBlack} title="Écran noir (B)" data-testid="btn-black">
          Noir <kbd>B</kbd>
        </button>
        <button className={`ctl ${logo ? 'on' : ''}`} onClick={st.toggleLogo} title="Afficher le logo (L)">
          Logo <kbd>L</kbd>
        </button>
        <button className={`ctl ${clearText ? 'on' : ''}`} onClick={st.toggleClearText} title="Masquer le texte (C)">
          Sans texte <kbd>C</kbd>
        </button>
        <button className={`ctl ${clearBackground ? 'on' : ''}`} onClick={st.toggleClearBackground} title="Masquer le fond (X)">
          Sans fond <kbd>X</kbd>
        </button>
        {backgroundOverride && (
          <button className="ctl on" onClick={() => st.setBackgroundOverride(null)} title="Revenir au fond du thème">
            Fond perso ✕
          </button>
        )}
        <button className="ctl danger" onClick={st.clearAll} title="Tout effacer (Échap)">
          Tout effacer <kbd>Échap</kbd>
        </button>
        <div className="grow" />
        <button className="ctl" onClick={st.prev} title="Précédent (←)">
          ◀
        </button>
        <button className="ctl" onClick={st.next} title="Suivant (→ ou Espace)" data-testid="btn-next">
          ▶
        </button>
      </div>
      {isMedia && <MediaControls />}
      <SlideGrid
        slides={slides}
        theme={theme}
        aspect={settings.aspect}
        activeIndex={index}
        live
        thumbSize={150}
        onSelect={(i) => st.setLiveIndex(i)}
        empty="Rien à l’écran. Envoyez un élément depuis l’aperçu (Entrée)."
      />
      <div className="stage-toggle">
        <button className="link" onClick={() => setShowStage(!showStage)}>
          {showStage ? '▾' : '▸'} Moniteur de scène et minuteur
        </button>
      </div>
      {showStage && <StageControls />}
    </section>
  );
}
