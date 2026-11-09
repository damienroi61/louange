// Communication entre la fenêtre opérateur et les fenêtres de sortie/scène.
import type { LiveState } from '../types';

export type BusMessage =
  | { type: 'state'; state: LiveState }
  | { type: 'hello'; from: 'output' | 'stage' | 'monitor' }
  | { type: 'videoTime'; current: number; duration: number; paused: boolean }
  | { type: 'alertDone'; shownAt: number }
  | { type: 'key'; key: string };

const CHANNEL = 'louange-live';

export function createBus(onMessage: (m: BusMessage) => void) {
  const ch = new BroadcastChannel(CHANNEL);
  ch.onmessage = (e) => onMessage(e.data as BusMessage);
  return {
    post: (m: BusMessage) => ch.postMessage(m),
    close: () => ch.close(),
  };
}
