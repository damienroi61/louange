import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useStore } from '../store/store';
import { createBus } from '../lib/bus';
import { bridge, type RemoteCommand } from '../lib/platform';
import { Toolbar } from './Toolbar';
import { SchedulePanel } from './SchedulePanel';
import { PreviewPanel } from './PreviewPanel';
import { LivePanel } from './LivePanel';
import { Library } from './library/Library';
import { Dialogs } from './dialogs/Dialogs';

export const useRemoteStore = create<{ urls: string[]; error: string }>(() => ({ urls: [], error: '' }));

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
}

/** Raccourcis clavier de l'opérateur. Renvoie true si la touche a été traitée. */
export function handleKey(key: string, opts: { ctrl?: boolean; shift?: boolean } = {}): boolean {
  const s = useStore.getState();
  if (opts.ctrl) {
    if (key.toLowerCase() === 's') {
      s.saveSchedule();
      return true;
    }
    return false;
  }
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
    case 'PageDown':
    case ' ':
      s.next();
      return true;
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'PageUp':
      s.prev();
      return true;
    case 'Home':
      s.setLiveIndex(0);
      return true;
    case 'End':
      s.setLiveIndex(s.liveSlides.length - 1);
      return true;
    case 'Enter':
      s.previewToLive();
      return true;
    case 'Escape':
      s.clearAll();
      return true;
  }
  const k = key.toLowerCase();
  if (k === 'b') s.toggleBlack();
  else if (k === 'l') s.toggleLogo();
  else if (k === 'c') s.toggleClearText();
  else if (k === 'x') s.toggleClearBackground();
  else if (/^[1-9]$/.test(k)) s.jumpSection(`C${k}`);
  else if (k === 'r') s.jumpSection('R');
  else if (k === 'p') s.jumpSection('P');
  else if (k === 'i') s.jumpSection('I');
  else if (k === 'e') s.jumpSection('F');
  else return false;
  return true;
}

function useLiveSync() {
  useEffect(() => {
    const bus = createBus((m) => {
      const st = useStore.getState();
      if (m.type === 'hello') {
        bus.post({ type: 'state', state: st.liveState() });
        if (m.from === 'output' || m.from === 'stage') st.setWindowOpen(m.from, true);
      } else if (m.type === 'videoTime') {
        st.setVideoTime({ current: m.current, duration: m.duration, paused: m.paused });
      } else if (m.type === 'key') {
        handleKey(m.key);
      }
    });
    let last = '';
    let queued = false;
    const push = () => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        const state = useStore.getState().liveState();
        const json = JSON.stringify(state);
        if (json !== last) {
          last = json;
          bus.post({ type: 'state', state });
        }
      });
    };
    push();
    const unsub = useStore.subscribe(push);
    return () => {
      unsub();
      bus.close();
    };
  }, []);
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || useStore.getState().dialog) return;
      if (e.altKey || e.metaKey) return;
      if (handleKey(e.key, { ctrl: e.ctrlKey, shift: e.shiftKey })) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function remoteSnapshot() {
  const s = useStore.getState();
  const live = s.liveState();
  return {
    schedule: s.schedule.items.map((i) => ({ title: i.title, type: i.type })),
    scheduleName: s.schedule.name,
    liveItem: s.liveItem ? s.schedule.items.findIndex((i) => i.id === s.liveItem!.id) : -1,
    liveIndex: s.liveIndex,
    slides: s.liveSlides.map((sl) => ({ label: sl.label || '', text: sl.kind === 'text' ? sl.text : `[${sl.label || sl.kind}]` })),
    itemTitle: live.itemTitle,
    current: live.slide ? (live.slide.kind === 'text' ? live.slide.text : `[${live.slide.label || live.slide.kind}]`) : '',
    next: live.next ? (live.next.kind === 'text' ? live.next.text : `[${live.next.label || live.next.kind}]`) : '',
    black: s.black,
    logo: s.logo,
    clearText: s.clearText,
    timer: s.timer,
    stageMessage: s.stageMessage,
  };
}

function useRemote() {
  const enabled = useStore((s) => s.settings.remoteEnabled);
  const port = useStore((s) => s.settings.remotePort);
  const pin = useStore((s) => s.settings.remotePin);
  const registered = useRef(false);
  useEffect(() => {
    if (!bridge) return;
    if (!registered.current) {
      registered.current = true;
      bridge.remote.onCommand(async (cmd: RemoteCommand) => {
        const s = useStore.getState();
        if (cmd.action === 'next') s.next();
        else if (cmd.action === 'prev') s.prev();
        else if (cmd.action === 'black') s.toggleBlack();
        else if (cmd.action === 'logo') s.toggleLogo();
        else if (cmd.action === 'clear') s.toggleClearText();
        else if (cmd.action === 'goto' && typeof cmd.slide === 'number') s.setLiveIndex(cmd.slide);
        else if (cmd.action === 'gotoItem' && typeof cmd.item === 'number') {
          const it = s.schedule.items[cmd.item];
          if (it) await s.goLiveItem(it, cmd.slide ?? 0);
        }
      });
    }
    if (!enabled) {
      bridge.remote.stop();
      useRemoteStore.setState({ urls: [], error: '' });
      return;
    }
    let alive = true;
    bridge.remote.start(port, pin).then((r) => {
      if (!alive) return;
      useRemoteStore.setState({ urls: r.urls || [], error: r.ok ? '' : r.error || 'Erreur' });
    });
    let last = '';
    const push = () => {
      const snap = remoteSnapshot();
      const json = JSON.stringify(snap);
      if (json !== last) {
        last = json;
        bridge!.remote.pushState(snap);
      }
    };
    push();
    const unsub = useStore.subscribe(push);
    return () => {
      alive = false;
      unsub();
    };
  }, [enabled, port, pin]);
}

function Splitter() {
  const update = useStore((s) => s.updateSettings);
  const onDown = (e: React.PointerEvent) => {
    const startY = e.clientY;
    const startH = useStore.getState().settings.libraryHeight;
    let h = startH;
    const move = (ev: PointerEvent) => {
      h = Math.max(160, Math.min(window.innerHeight - 260, startH - (ev.clientY - startY)));
      document.documentElement.style.setProperty('--lib-h', `${h}px`);
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      update({ libraryHeight: Math.round(h) });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  return <div className="splitter" onPointerDown={onDown} title="Glisser pour redimensionner" />;
}

function Toasts() {
  const toasts = useStore((s) => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function OperatorApp() {
  const ready = useStore((s) => s.ready);
  const libH = useStore((s) => s.settings.libraryHeight);
  useEffect(() => {
    useStore
      .getState()
      .init()
      .catch((e) => {
        console.error(e);
        alert(`Erreur au démarrage : ${e?.message || e}`);
      });
  }, []);
  useEffect(() => {
    document.documentElement.style.setProperty('--lib-h', `${libH}px`);
  }, [libH]);
  useLiveSync();
  useShortcuts();
  useRemote();
  if (!ready) return <div className="loading">Chargement de Louange…</div>;
  return (
    <div className="app">
      <Toolbar />
      <div className="top-area">
        <SchedulePanel />
        <PreviewPanel />
        <LivePanel />
      </div>
      <Splitter />
      <Library />
      <Dialogs />
      <Toasts />
    </div>
  );
}
