import { create } from 'zustand';
import type {
  AlertConfig,
  Background,
  LiveState,
  MediaItem,
  Presentation,
  Schedule,
  ScheduleItem,
  Settings,
  Slide,
  Song,
  Theme,
  Timer,
  VideoControl,
} from '../types';
import { dbAll, dbDelete, dbGet, dbPut, forgetMediaUrl } from '../lib/db';
import { BUILTIN_THEMES, DEFAULT_ALERT, DEFAULT_SETTINGS, DEFAULT_TIMER, FALLBACK_THEME, seedSongs } from '../lib/defaults';
import { todayISO, uid } from '../lib/ids';
import { buildSlides, themeIdFor, type BuildContext } from '../lib/slides';
import { clearFitCache } from '../lib/fit';
import { setCustomTranslations, type TranslationInfo } from '../lib/bible';

export type Dialog =
  | null
  | { type: 'song'; id?: string; draft?: Song }
  | { type: 'theme'; id?: string }
  | { type: 'presentation'; id?: string }
  | { type: 'settings' }
  | { type: 'alert' }
  | { type: 'schedules' }
  | { type: 'countdown'; itemId?: string }
  | { type: 'web' }
  | { type: 'camera' }
  | { type: 'text'; itemId?: string }
  | { type: 'itemTheme'; itemId: string }
  | { type: 'help' };

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

export type LibraryTab = 'songs' | 'bible' | 'media' | 'presentations' | 'themes';

interface State {
  ready: boolean;
  songs: Record<string, Song>;
  media: Record<string, MediaItem>;
  presentations: Record<string, Presentation>;
  themes: Record<string, Theme>;
  schedules: Schedule[];
  settings: Settings;
  schedule: Schedule;
  dirty: boolean;

  previewItem: ScheduleItem | null;
  previewSlides: Slide[];
  previewIndex: number;

  liveItem: ScheduleItem | null;
  liveSlides: Slide[];
  liveIndex: number;
  liveSince: number;

  black: boolean;
  logo: boolean;
  clearText: boolean;
  clearBackground: boolean;
  backgroundOverride: Background | null;
  alert: (AlertConfig & { shownAt: number }) | null;
  alertDraft: AlertConfig;
  stageMessage: string;
  timer: Timer;
  video: VideoControl;
  videoTime: { current: number; duration: number; paused: boolean };

  outputOpen: boolean;
  stageOpen: boolean;
  dialog: Dialog;
  toasts: Toast[];
  libraryTab: LibraryTab;
  selectedScheduleId: string | null;
  customBibles: TranslationInfo[];
}

interface Actions {
  init(): Promise<void>;
  ctx(): BuildContext;
  toast(text: string, kind?: Toast['kind']): void;
  setDialog(d: Dialog): void;
  setLibraryTab(t: LibraryTab): void;

  saveSong(song: Song): Promise<void>;
  deleteSong(id: string): Promise<void>;
  addMedia(items: MediaItem[]): void;
  deleteMedia(id: string): Promise<void>;
  renameMedia(id: string, name: string): Promise<void>;
  savePresentation(p: Presentation): Promise<void>;
  deletePresentation(id: string): Promise<void>;
  saveTheme(t: Theme): Promise<void>;
  deleteTheme(id: string): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  addCustomBible(info: Omit<TranslationInfo, 'id' | 'custom'>, books: string[][][]): Promise<TranslationInfo>;
  removeCustomBible(id: string): Promise<void>;

  addItem(item: Omit<ScheduleItem, 'id'> & { id?: string }, index?: number): ScheduleItem;
  updateItem(id: string, patch: Partial<ScheduleItem>): void;
  removeItem(id: string): void;
  moveItem(from: number, to: number): void;
  newSchedule(): void;
  renameSchedule(name: string, date?: string): void;
  saveSchedule(): Promise<void>;
  openSchedule(id: string): Promise<void>;
  deleteSchedule(id: string): Promise<void>;
  importScheduleObject(s: Schedule): Promise<void>;

  preview(item: ScheduleItem, index?: number): Promise<void>;
  selectPreviewSlide(i: number): void;
  previewToLive(index?: number): void;
  goLiveItem(item: ScheduleItem, index?: number): Promise<void>;
  setLiveIndex(i: number): void;
  next(): void;
  prev(): void;
  jumpSection(key: string): void;
  refreshSlides(): Promise<void>;

  toggleBlack(): void;
  toggleLogo(): void;
  toggleClearText(): void;
  toggleClearBackground(): void;
  setBackgroundOverride(bg: Background | null): void;
  clearAll(): void;

  showAlert(a: AlertConfig): void;
  hideAlert(): void;
  setAlertDraft(a: Partial<AlertConfig>): void;
  setStageMessage(m: string): void;

  timerStart(): void;
  timerPause(): void;
  timerReset(): void;
  timerConfig(patch: Partial<Timer>): void;

  videoCmd(patch: Partial<Omit<VideoControl, 'nonce'>>): void;
  setVideoTime(t: State['videoTime']): void;
  setWindowOpen(kind: 'output' | 'stage', open: boolean): void;

  liveState(): LiveState;
  resolveTheme(item: ScheduleItem | null): Theme;
}

const emptySchedule = (): Schedule => ({ id: uid('sch'), name: 'Nouveau programme', date: todayISO(), items: [], updatedAt: Date.now() });

let toastId = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useStore = create<State & Actions>()((set, get) => {
  const persistCurrent = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      dbPut('kv', 'currentSchedule', get().schedule).catch(() => undefined);
    }, 300);
  };
  const setSchedule = (fn: (s: Schedule) => Schedule) => {
    set((st) => ({ schedule: { ...fn(st.schedule), updatedAt: Date.now() }, dirty: true }));
    persistCurrent();
  };

  return {
    ready: false,
    songs: {},
    media: {},
    presentations: {},
    themes: Object.fromEntries(BUILTIN_THEMES.map((t) => [t.id, t])),
    schedules: [],
    settings: DEFAULT_SETTINGS,
    schedule: emptySchedule(),
    dirty: false,
    previewItem: null,
    previewSlides: [],
    previewIndex: 0,
    liveItem: null,
    liveSlides: [],
    liveIndex: -1,
    liveSince: Date.now(),
    black: false,
    logo: false,
    clearText: false,
    clearBackground: false,
    backgroundOverride: null,
    alert: null,
    alertDraft: DEFAULT_ALERT,
    stageMessage: '',
    timer: DEFAULT_TIMER,
    video: { playing: true, nonce: 0, volume: 1 },
    videoTime: { current: 0, duration: 0, paused: true },
    outputOpen: false,
    stageOpen: false,
    dialog: null,
    toasts: [],
    libraryTab: 'songs',
    selectedScheduleId: null,
    customBibles: [],

    async init() {
      const customBibles = (await dbGet<TranslationInfo[]>('kv', 'customBibles')) || [];
      setCustomTranslations(customBibles);
      const [songs, media, presentations, themes, schedules, settings, current, seeded, alertDraft] = await Promise.all([
        dbAll<Song>('songs'),
        dbAll<MediaItem>('media'),
        dbAll<Presentation>('presentations'),
        dbAll<Theme>('themes'),
        dbAll<Schedule>('schedules'),
        dbGet<Settings>('kv', 'settings'),
        dbGet<Schedule>('kv', 'currentSchedule'),
        dbGet<boolean>('kv', 'seeded'),
        dbGet<AlertConfig>('kv', 'alertDraft'),
      ]);
      let allSongs = songs;
      if (!seeded && songs.length === 0) {
        allSongs = seedSongs();
        for (const s of allSongs) await dbPut('songs', s.id, s);
        await dbPut('kv', 'seeded', true);
      }
      set({
        ready: true,
        songs: Object.fromEntries(allSongs.map((s) => [s.id, s])),
        media: Object.fromEntries(media.map((m) => [m.id, m])),
        presentations: Object.fromEntries(presentations.map((p) => [p.id, p])),
        themes: { ...Object.fromEntries(BUILTIN_THEMES.map((t) => [t.id, t])), ...Object.fromEntries(themes.map((t) => [t.id, t])) },
        schedules: schedules.sort((a, b) => b.updatedAt - a.updatedAt),
        settings: { ...DEFAULT_SETTINGS, ...(settings || {}) },
        schedule: current || emptySchedule(),
        alertDraft: alertDraft || DEFAULT_ALERT,
        customBibles,
      });
    },

    ctx() {
      const s = get();
      return { songs: s.songs, presentations: s.presentations, media: s.media, settings: s.settings };
    },

    toast(text, kind = 'info') {
      const id = ++toastId;
      set((s) => ({ toasts: [...s.toasts, { id, text, kind }] }));
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), kind === 'error' ? 6000 : 3000);
    },
    setDialog: (dialog) => set({ dialog }),
    setLibraryTab: (libraryTab) => set({ libraryTab }),

    async saveSong(song) {
      const s = { ...song, updatedAt: Date.now() };
      await dbPut('songs', s.id, s);
      set((st) => ({ songs: { ...st.songs, [s.id]: s } }));
      await get().refreshSlides();
    },
    async deleteSong(id) {
      await dbDelete('songs', id);
      set((st) => {
        const songs = { ...st.songs };
        delete songs[id];
        return { songs };
      });
    },
    addMedia(items) {
      set((st) => ({ media: { ...st.media, ...Object.fromEntries(items.map((m) => [m.id, m])) } }));
    },
    async deleteMedia(id) {
      await dbDelete('media', id);
      await dbDelete('blobs', id);
      forgetMediaUrl(id);
      set((st) => {
        const media = { ...st.media };
        delete media[id];
        return { media };
      });
    },
    async renameMedia(id, name) {
      const m = get().media[id];
      if (!m) return;
      const n = { ...m, name };
      await dbPut('media', id, n);
      set((st) => ({ media: { ...st.media, [id]: n } }));
    },
    async savePresentation(p) {
      const n = { ...p, updatedAt: Date.now() };
      await dbPut('presentations', n.id, n);
      set((st) => ({ presentations: { ...st.presentations, [n.id]: n } }));
      await get().refreshSlides();
    },
    async deletePresentation(id) {
      await dbDelete('presentations', id);
      set((st) => {
        const presentations = { ...st.presentations };
        delete presentations[id];
        return { presentations };
      });
    },
    async saveTheme(t) {
      const n = { ...t, builtIn: false };
      await dbPut('themes', n.id, n);
      clearFitCache();
      set((st) => ({ themes: { ...st.themes, [n.id]: n } }));
    },
    async deleteTheme(id) {
      if (get().themes[id]?.builtIn) return;
      await dbDelete('themes', id);
      set((st) => {
        const themes = { ...st.themes };
        delete themes[id];
        return { themes };
      });
    },
    async updateSettings(patch) {
      const settings = { ...get().settings, ...patch };
      set({ settings });
      await dbPut('kv', 'settings', settings);
      if ('maxLinesPerSlide' in patch) await get().refreshSlides();
    },

    async addCustomBible(info, books) {
      const t: TranslationInfo = { ...info, id: uid('bible-'), custom: true };
      await dbPut('kv', `bible:${t.id}`, { id: t.id, name: t.name, lang: t.lang, books });
      const list = [...get().customBibles, t];
      await dbPut('kv', 'customBibles', list);
      setCustomTranslations(list);
      set({ customBibles: list });
      return t;
    },
    async removeCustomBible(id) {
      const list = get().customBibles.filter((b) => b.id !== id);
      await dbPut('kv', 'customBibles', list);
      await dbDelete('kv', `bible:${id}`);
      setCustomTranslations(list);
      set({ customBibles: list });
    },

    addItem(item, index) {
      const it: ScheduleItem = { ...item, id: item.id || uid('it') } as ScheduleItem;
      setSchedule((s) => {
        const items = [...s.items];
        items.splice(index ?? items.length, 0, it);
        return { ...s, items };
      });
      return it;
    },
    updateItem(id, patch) {
      setSchedule((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
      const st = get();
      const upd = st.schedule.items.find((i) => i.id === id);
      if (upd && st.previewItem?.id === id) get().preview(upd, st.previewIndex);
      if (upd && st.liveItem?.id === id) {
        set({ liveItem: upd });
        get().refreshSlides();
      }
    },
    removeItem(id) {
      setSchedule((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) }));
      if (get().previewItem?.id === id) set({ previewItem: null, previewSlides: [], previewIndex: 0 });
    },
    moveItem(from, to) {
      setSchedule((s) => {
        const items = [...s.items];
        const [x] = items.splice(from, 1);
        items.splice(to > from ? to - 1 : to, 0, x);
        return { ...s, items };
      });
    },
    newSchedule() {
      set({ schedule: emptySchedule(), dirty: false, previewItem: null, previewSlides: [] });
      persistCurrent();
    },
    renameSchedule(name, date) {
      setSchedule((s) => ({ ...s, name, date: date ?? s.date }));
    },
    async saveSchedule() {
      const s = { ...get().schedule, updatedAt: Date.now() };
      await dbPut('schedules', s.id, s);
      set((st) => ({ schedule: s, dirty: false, schedules: [s, ...st.schedules.filter((x) => x.id !== s.id)] }));
      persistCurrent();
      get().toast(`Programme « ${s.name} » enregistré`, 'success');
    },
    async openSchedule(id) {
      const s = await dbGet<Schedule>('schedules', id);
      if (!s) return;
      set({ schedule: s, dirty: false, previewItem: null, previewSlides: [] });
      persistCurrent();
    },
    async deleteSchedule(id) {
      await dbDelete('schedules', id);
      set((st) => ({ schedules: st.schedules.filter((s) => s.id !== id) }));
    },
    async importScheduleObject(s) {
      await get().init();
      set({ schedule: s, dirty: true, previewItem: null, previewSlides: [] });
      persistCurrent();
    },

    async preview(item, index = 0) {
      set({ previewItem: item, previewIndex: index });
      try {
        const slides = await buildSlides(item, get().ctx());
        if (get().previewItem?.id !== item.id) return;
        set({ previewSlides: slides, previewIndex: Math.min(index, Math.max(0, slides.length - 1)) });
      } catch (e) {
        get().toast(`Impossible de préparer « ${item.title} » : ${(e as Error).message}`, 'error');
      }
    },
    selectPreviewSlide(i) {
      set({ previewIndex: i });
    },
    previewToLive(index) {
      const s = get();
      if (!s.previewItem || !s.previewSlides.length) return;
      const i = index ?? s.previewIndex;
      set({
        liveItem: s.previewItem,
        liveSlides: s.previewSlides,
        liveIndex: i,
        liveSince: Date.now(),
        video: { ...s.video, playing: true, seek: 0, nonce: s.video.nonce + 1 },
        logo: false,
        black: false,
      });
    },
    async goLiveItem(item, index = 0) {
      const slides = await buildSlides(item, get().ctx());
      const v = get().video;
      set({
        liveItem: item,
        liveSlides: slides,
        liveIndex: Math.max(0, Math.min(index, slides.length - 1)),
        liveSince: Date.now(),
        video: { ...v, playing: true, seek: 0, nonce: v.nonce + 1 },
        logo: false,
        black: false,
      });
    },
    setLiveIndex(i) {
      const s = get();
      if (i < 0 || i >= s.liveSlides.length) return;
      const changedKind = s.liveSlides[i]?.mediaId !== s.liveSlides[s.liveIndex]?.mediaId;
      set({
        liveIndex: i,
        liveSince: s.liveSlides[i]?.kind === 'countdown' && s.liveIndex !== i ? Date.now() : s.liveSince,
        ...(changedKind ? { video: { ...s.video, playing: true, seek: 0, nonce: s.video.nonce + 1 } } : {}),
      });
    },
    next() {
      const s = get();
      if (!s.liveItem) {
        if (s.previewItem) get().previewToLive();
        return;
      }
      if (s.liveIndex < s.liveSlides.length - 1) return get().setLiveIndex(s.liveIndex + 1);
      if (s.settings.autoAdvanceItems) {
        const idx = s.schedule.items.findIndex((i) => i.id === s.liveItem!.id);
        const nextItem = idx >= 0 ? s.schedule.items[idx + 1] : undefined;
        if (nextItem) {
          get().goLiveItem(nextItem, 0);
          get().preview(s.schedule.items[idx + 2] ?? nextItem, 0);
        }
      }
    },
    prev() {
      const s = get();
      if (!s.liveItem) return;
      if (s.liveIndex > 0) return get().setLiveIndex(s.liveIndex - 1);
      if (s.settings.autoAdvanceItems) {
        const idx = s.schedule.items.findIndex((i) => i.id === s.liveItem!.id);
        const prevItem = idx > 0 ? s.schedule.items[idx - 1] : undefined;
        if (prevItem) buildSlides(prevItem, get().ctx()).then((sl) => get().goLiveItem(prevItem, sl.length - 1));
      }
    },
    jumpSection(key) {
      const s = get();
      const k = key.toUpperCase();
      const slides = s.liveSlides;
      if (!slides.length) return;
      for (let step = 1; step <= slides.length; step++) {
        const i = (s.liveIndex + step) % slides.length;
        if (slides[i].sectionKey?.toUpperCase() === k && slides[(i - 1 + slides.length) % slides.length]?.sectionKey !== slides[i].sectionKey) {
          return get().setLiveIndex(i);
        }
      }
      const any = slides.findIndex((sl) => sl.sectionKey?.toUpperCase() === k);
      if (any >= 0) get().setLiveIndex(any);
    },
    async refreshSlides() {
      const s = get();
      const ctx = get().ctx();
      if (s.previewItem) {
        const item = s.schedule.items.find((i) => i.id === s.previewItem!.id) || s.previewItem;
        const slides = await buildSlides(item, ctx).catch(() => s.previewSlides);
        set({ previewItem: item, previewSlides: slides, previewIndex: Math.min(get().previewIndex, Math.max(0, slides.length - 1)) });
      }
      if (s.liveItem) {
        const item = s.schedule.items.find((i) => i.id === s.liveItem!.id) || s.liveItem;
        const slides = await buildSlides(item, ctx).catch(() => s.liveSlides);
        set({ liveItem: item, liveSlides: slides, liveIndex: Math.min(get().liveIndex, slides.length - 1) });
      }
    },

    toggleBlack: () => set((s) => ({ black: !s.black })),
    toggleLogo: () => set((s) => ({ logo: !s.logo })),
    toggleClearText: () => set((s) => ({ clearText: !s.clearText })),
    toggleClearBackground: () => set((s) => ({ clearBackground: !s.clearBackground })),
    setBackgroundOverride: (backgroundOverride) => set({ backgroundOverride }),
    clearAll: () =>
      set({ black: false, logo: false, clearText: false, clearBackground: false, backgroundOverride: null, alert: null, liveItem: null, liveSlides: [], liveIndex: -1 }),

    showAlert(a) {
      set({ alert: { ...a, shownAt: Date.now() } });
      dbPut('kv', 'alertDraft', a).catch(() => undefined);
    },
    hideAlert: () => set({ alert: null }),
    setAlertDraft: (a) => set((s) => ({ alertDraft: { ...s.alertDraft, ...a } })),
    setStageMessage: (stageMessage) => set({ stageMessage }),

    timerStart: () => set((s) => (s.timer.running ? {} : { timer: { ...s.timer, running: true, startedAt: Date.now() } })),
    timerPause: () =>
      set((s) => (s.timer.running ? { timer: { ...s.timer, running: false, accumulated: s.timer.accumulated + (Date.now() - s.timer.startedAt) } } : {})),
    timerReset: () => set((s) => ({ timer: { ...s.timer, running: false, accumulated: 0, startedAt: 0 } })),
    timerConfig: (patch) => set((s) => ({ timer: { ...s.timer, ...patch } })),

    videoCmd: (patch) => set((s) => ({ video: { ...s.video, seek: undefined, ...patch, nonce: s.video.nonce + 1 } })),
    setVideoTime: (videoTime) => set({ videoTime }),
    setWindowOpen: (kind, open) => set(kind === 'output' ? { outputOpen: open } : { stageOpen: open }),

    resolveTheme(item) {
      const s = get();
      if (!item) return s.themes[s.settings.defaultSongTheme] || FALLBACK_THEME;
      return s.themes[themeIdFor(item, s.ctx())] || FALLBACK_THEME;
    },

    liveState() {
      const s = get();
      const slide = s.liveIndex >= 0 ? s.liveSlides[s.liveIndex] ?? null : null;
      return {
        slide,
        next: s.liveSlides[s.liveIndex + 1] ?? null,
        theme: get().resolveTheme(s.liveItem),
        itemTitle: s.liveItem?.title || '',
        itemType: s.liveItem?.type,
        slideIndex: s.liveIndex,
        slideCount: s.liveSlides.length,
        liveSince: s.liveSince,
        black: s.black,
        logo: s.logo,
        clearText: s.clearText,
        clearBackground: s.clearBackground,
        backgroundOverride: s.backgroundOverride,
        alert: s.alert,
        stageMessage: s.stageMessage,
        timer: s.timer,
        video: s.video,
        logoMediaId: s.settings.logoMediaId,
        aspect: s.settings.aspect,
        stageShowNext: s.settings.stageShowNext,
        stageFontSize: s.settings.stageFontSize,
      };
    },
  };
});
