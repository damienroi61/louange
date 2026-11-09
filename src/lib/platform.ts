// Pont vers Electron (si présent). Dans un navigateur, ces fonctions sont absentes.
export interface DisplayInfo {
  id: number;
  label: string;
  bounds: { x: number; y: number; width: number; height: number };
  primary: boolean;
}

export interface RemoteCommand {
  action: 'next' | 'prev' | 'black' | 'logo' | 'clear' | 'goto' | 'gotoItem';
  item?: number;
  slide?: number;
}

export interface LouangeBridge {
  isElectron: true;
  platform: string;
  getDisplays(): Promise<DisplayInfo[]>;
  openWindow(kind: 'output' | 'stage', displayId?: number): Promise<void>;
  closeWindow(kind: 'output' | 'stage'): Promise<void>;
  isWindowOpen(kind: 'output' | 'stage'): Promise<boolean>;
  identifyDisplays(): Promise<void>;
  onWindowClosed(cb: (kind: string) => void): void;
  getPathForFile(file: File): string;
  convertPresentation(path: string): Promise<{ ok: boolean; kind?: 'images' | 'pdf'; files?: string[]; error?: string }>;
  readFile(path: string): Promise<Uint8Array>;
  remote: {
    start(port: number, pin: string): Promise<{ ok: boolean; urls?: string[]; error?: string }>;
    stop(): Promise<void>;
    pushState(state: unknown): void;
    onCommand(cb: (cmd: RemoteCommand) => void): void;
  };
}

declare global {
  interface Window {
    louange?: LouangeBridge;
  }
}

export const bridge: LouangeBridge | undefined = typeof window !== 'undefined' ? window.louange : undefined;
export const isElectron = !!bridge;
