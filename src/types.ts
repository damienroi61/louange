// Modèle de données de Louange

export type Background =
  | { type: 'color'; color: string }
  | { type: 'gradient'; from: string; to: string; angle: number }
  | { type: 'image'; mediaId: string; fit: 'cover' | 'contain' }
  | { type: 'video'; mediaId: string; fit: 'cover' | 'contain'; loop: boolean; muted: boolean };

export type TransitionType = 'none' | 'fade' | 'slide' | 'zoom';

export interface Theme {
  id: string;
  name: string;
  background: Background;
  overlayOpacity: number; // assombrissement 0..1
  font: {
    family: string;
    size: number; // px pour une sortie 1920x1080
    autoFit: boolean;
    color: string;
    bold: boolean;
    italic: boolean;
    uppercase: boolean;
    lineHeight: number;
    letterSpacing: number;
  };
  align: 'left' | 'center' | 'right';
  vAlign: 'top' | 'middle' | 'bottom';
  box: {
    top: number; // marges en % de la sortie
    left: number;
    right: number;
    bottom: number;
    bgColor: string;
    bgOpacity: number;
    radius: number;
    padding: number;
  };
  shadow: { enabled: boolean; color: string; blur: number; x: number; y: number };
  outline: { enabled: boolean; color: string; width: number };
  footer: { show: boolean; size: number; color: string; align: 'left' | 'center' | 'right' };
  transition: { type: TransitionType; duration: number };
  builtIn?: boolean;
}

export type SlideKind = 'text' | 'image' | 'video' | 'audio' | 'camera' | 'web' | 'countdown' | 'blank';

export interface Slide {
  id: string;
  kind: SlideKind;
  label?: string; // « Couplet 1 », « Refrain », « Jean 3:16 »…
  sectionKey?: string; // « C1 », « R », « P »… (chants)
  text: string;
  footer?: string; // référence biblique, copyright…
  secondaryText?: string; // seconde traduction
  mediaId?: string;
  url?: string;
  deviceId?: string;
  countdown?: CountdownConfig;
  background?: Background; // surcharge du fond du thème
  fit?: 'cover' | 'contain';
  loop?: boolean;
  muted?: boolean;
}

export interface CountdownConfig {
  mode: 'duration' | 'until';
  minutes: number; // pour « duration »
  time: string; // « HH:MM » pour « until »
  title: string; // texte au-dessus du chrono
  endText: string; // texte affiché à la fin
}

export interface SongSection {
  label: string; // « Couplet 1 », « Refrain »…
  key: string; // « C1 », « R », « P »…
  text: string;
}

export interface Song {
  id: string;
  title: string;
  author: string;
  copyright: string;
  ccli: string;
  key: string; // tonalité
  tags: string;
  lyrics: string; // texte avec balises [Couplet 1], [Refrain]…
  arrangement: string; // ex. « C1 R C2 R P R » (vide = ordre naturel)
  themeId?: string;
  createdAt: number;
  updatedAt: number;
}

export type MediaType = 'image' | 'video' | 'audio';

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  mime: string;
  size: number;
  thumb?: string; // dataURL
  duration?: number;
  createdAt: number;
}

export interface PresentationSlide {
  id: string;
  kind: 'text' | 'image';
  text: string;
  mediaId?: string;
  background?: Background;
  notes?: string;
}

export interface Presentation {
  id: string;
  title: string;
  slides: PresentationSlide[];
  themeId?: string;
  source?: string; // « PDF », « PowerPoint », « Manuel »
  createdAt: number;
  updatedAt: number;
}

export interface BibleSelection {
  translation: string;
  secondary?: string;
  book: number; // 0..65
  chapter: number; // 1..
  verseFrom: number;
  chapterTo: number;
  verseTo: number;
  versesPerSlide: number;
  showVerseNumbers: boolean;
}

export type ScheduleItemType =
  | 'song'
  | 'bible'
  | 'media'
  | 'presentation'
  | 'countdown'
  | 'web'
  | 'camera'
  | 'text'
  | 'blank';

export interface ScheduleItem {
  id: string;
  type: ScheduleItemType;
  title: string;
  refId?: string; // song/media/presentation id
  bible?: BibleSelection;
  countdown?: CountdownConfig;
  url?: string;
  deviceId?: string;
  text?: string; // élément texte libre
  themeId?: string; // surcharge
  loop?: boolean;
  muted?: boolean;
  notes?: string;
}

export interface Schedule {
  id: string;
  name: string;
  date: string;
  items: ScheduleItem[];
  updatedAt: number;
}

export interface AlertConfig {
  id: string;
  text: string;
  position: 'top' | 'bottom';
  mode: 'scroll' | 'static';
  bgColor: string;
  color: string;
  size: number;
  speed: number; // px/s pour le défilement
  repeat: number; // nombre de passages (0 = infini)
}

export interface Settings {
  aspect: '16:9' | '4:3' | '16:10';
  outputDisplayId?: number;
  stageDisplayId?: number;
  logoMediaId?: string;
  maxLinesPerSlide: number;
  defaultTranslation: string;
  versesPerSlide: number;
  showVerseNumbers: boolean;
  autoAdvanceItems: boolean;
  defaultSongTheme: string;
  defaultBibleTheme: string;
  defaultPresentationTheme: string;
  stageShowNext: boolean;
  stageFontSize: number;
  remoteEnabled: boolean;
  remotePort: number;
  remotePin: string;
  libraryHeight: number;
}

export interface VideoControl {
  playing: boolean;
  nonce: number; // incrémenté pour forcer une commande
  seek?: number;
  volume: number;
}

export interface Timer {
  mode: 'stopwatch' | 'countdown';
  running: boolean;
  startedAt: number; // epoch ms quand lancé
  accumulated: number; // ms écoulées avant la dernière reprise
  durationMs: number; // pour le compte à rebours
}

// État diffusé vers les fenêtres de sortie et de scène
export interface LiveState {
  slide: Slide | null;
  next: Slide | null;
  theme: Theme;
  itemTitle: string;
  itemType?: ScheduleItemType;
  slideIndex: number;
  slideCount: number;
  liveSince: number;
  black: boolean;
  logo: boolean;
  clearText: boolean;
  clearBackground: boolean;
  backgroundOverride?: Background | null;
  alert: (AlertConfig & { shownAt: number }) | null;
  stageMessage: string;
  timer: Timer;
  video: VideoControl;
  logoMediaId?: string;
  aspect: Settings['aspect'];
  stageShowNext: boolean;
  stageFontSize: number;
}
