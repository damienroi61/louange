import { bridge } from '../lib/platform';
import { useStore } from '../store/store';

const popups: Partial<Record<'output' | 'stage', Window | null>> = {};

interface ScreenDetailed {
  availLeft: number;
  availTop: number;
  availWidth: number;
  availHeight: number;
  isPrimary: boolean;
}

async function secondaryScreenFeatures(index: number): Promise<string> {
  try {
    const w = window as unknown as { getScreenDetails?: () => Promise<{ screens: ScreenDetailed[]; currentScreen: ScreenDetailed }> };
    if (w.getScreenDetails) {
      const sd = await w.getScreenDetails();
      const others = sd.screens.filter((s) => s !== sd.currentScreen);
      const s = others[Math.min(index, others.length - 1)];
      if (s) return `popup,left=${s.availLeft},top=${s.availTop},width=${s.availWidth},height=${s.availHeight}`;
    }
  } catch {
    /* permission refusée : fenêtre classique */
  }
  return 'popup,width=960,height=540';
}

export async function openWindow(kind: 'output' | 'stage') {
  const st = useStore.getState();
  if (bridge) {
    await bridge.openWindow(kind, kind === 'output' ? st.settings.outputDisplayId : st.settings.stageDisplayId);
    st.setWindowOpen(kind, true);
    return;
  }
  const existing = popups[kind];
  if (existing && !existing.closed) {
    existing.focus();
    return;
  }
  const features = await secondaryScreenFeatures(kind === 'output' ? 0 : 1);
  const w = window.open(`${location.pathname}#/${kind}`, `louange-${kind}`, features);
  if (!w) {
    st.toast("La fenêtre a été bloquée par le navigateur. Autorisez les fenêtres pop-up pour ce site.", 'error');
    return;
  }
  popups[kind] = w;
  st.setWindowOpen(kind, true);
  const timer = setInterval(() => {
    if (w.closed) {
      clearInterval(timer);
      useStore.getState().setWindowOpen(kind, false);
    }
  }, 1000);
}

export async function closeWindow(kind: 'output' | 'stage') {
  if (bridge) await bridge.closeWindow(kind);
  else popups[kind]?.close();
  useStore.getState().setWindowOpen(kind, false);
}

export function toggleWindow(kind: 'output' | 'stage') {
  const open = kind === 'output' ? useStore.getState().outputOpen : useStore.getState().stageOpen;
  return open ? closeWindow(kind) : openWindow(kind);
}

if (bridge) {
  bridge.onWindowClosed((kind) => useStore.getState().setWindowOpen(kind as 'output' | 'stage', false));
}
