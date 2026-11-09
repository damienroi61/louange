import { memo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { AlertConfig, Background, LiveState, Settings, Slide, Theme, VideoControl } from '../types';
import { CANVAS_H, SECONDARY_SCALE, boxGeometry, canvasWidth, fitFontSize, hexToRgba, textStyle } from '../lib/fit';
import { useMediaMeta, useMediaUrl, useNow } from '../lib/hooks';
import { formatDuration } from '../lib/ids';

export type RenderRole = 'output' | 'monitor' | 'thumb';

export interface SlideRendererProps {
  slide: Slide | null;
  theme: Theme;
  aspect: Settings['aspect'];
  width: number;
  role: RenderRole;
  black?: boolean;
  logo?: boolean;
  clearText?: boolean;
  clearBackground?: boolean;
  backgroundOverride?: Background | null;
  logoMediaId?: string;
  alert?: LiveState['alert'];
  liveSince?: number;
  video?: VideoControl;
  videoSyncTime?: number;
  onVideoTime?: (current: number, duration: number, paused: boolean) => void;
  onAlertDone?: (shownAt: number) => void;
  className?: string;
}

const BLACK: Background = { type: 'color', color: '#000000' };
const FULL_MEDIA = new Set(['image', 'video', 'camera', 'web']);

function bgKey(bg: Background): string {
  switch (bg.type) {
    case 'color':
      return `c:${bg.color}`;
    case 'gradient':
      return `g:${bg.from}:${bg.to}:${bg.angle}`;
    default:
      return `${bg.type}:${bg.mediaId}:${bg.fit}`;
  }
}

/** Gère les calques d'entrée/sortie pour les transitions. */
function useLayers<T>(key: string, value: T, duration: number, enabled: boolean) {
  const [layers, setLayers] = useState<{ key: string; value: T; out: boolean }[]>([{ key, value, out: false }]);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    setLayers((prev) => {
      if (prev[prev.length - 1]?.key === key) return prev;
      if (!enabled || duration <= 0) return [{ key, value: latest.current, out: false }];
      return [...prev.slice(-2).map((l) => ({ ...l, out: true })), { key, value: latest.current, out: false }];
    });
  }, [key, enabled, duration]);
  useEffect(() => {
    if (!layers.some((l) => l.out)) return;
    const t = setTimeout(() => setLayers((prev) => prev.filter((l) => !l.out)), duration + 50);
    return () => clearTimeout(t);
  }, [layers, duration]);
  return layers.map((l, i) => ({ ...l, value: i === layers.length - 1 ? value : l.value }));
}

function BackgroundView({ bg, role }: { bg: Background; role: RenderRole }) {
  const isMedia = bg.type === 'image' || bg.type === 'video';
  const url = useMediaUrl(isMedia && !(bg.type === 'video' && role === 'thumb') ? bg.mediaId : undefined);
  const meta = useMediaMeta(bg.type === 'video' && role === 'thumb' ? bg.mediaId : undefined);
  const fill: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };
  if (bg.type === 'color') return <div style={{ ...fill, background: bg.color }} />;
  if (bg.type === 'gradient') return <div style={{ ...fill, background: `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})` }} />;
  if (bg.type === 'image')
    return <div style={{ ...fill, background: '#000' }}>{url && <img src={url} alt="" style={{ ...fill, objectFit: bg.fit }} />}</div>;
  // vidéo
  if (role === 'thumb')
    return <div style={{ ...fill, background: '#000' }}>{meta?.thumb && <img src={meta.thumb} alt="" style={{ ...fill, objectFit: bg.fit }} />}</div>;
  return (
    <div style={{ ...fill, background: '#000' }}>
      {url && <video src={url} autoPlay loop={bg.loop} muted={bg.muted || role !== 'output'} playsInline style={{ ...fill, objectFit: bg.fit }} />}
    </div>
  );
}

function TextContent({ slide, theme, W, clearText }: { slide: Slide; theme: Theme; W: number; clearText?: boolean }) {
  const g = boxGeometry(theme, W);
  const hasFooter = !!(theme.footer.show && slide.footer);
  const footerLine = theme.footer.size * 1.35;
  const bottomMargin = CANVAS_H - g.top - g.height;
  const footerInside = hasFooter && bottomMargin < footerLine + 10;
  const availH = g.innerH - (footerInside ? footerLine + 8 : 0);
  const size = fitFontSize(slide.text, theme, g.innerW, availH, slide.secondaryText);
  const justify = theme.vAlign === 'top' ? 'flex-start' : theme.vAlign === 'bottom' ? 'flex-end' : 'center';
  const hasText = !!slide.text.trim() || !!slide.secondaryText;
  const footerStyle: CSSProperties = {
    ...textStyle({ ...theme, font: { ...theme.font, bold: false, italic: false, uppercase: false, lineHeight: 1.3 } }, theme.footer.size),
    color: theme.footer.color,
    textAlign: theme.footer.align,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
  if (clearText) return null;
  return (
    <>
      {hasText && (
        <div
          style={{
            position: 'absolute',
            left: g.left,
            top: g.top,
            width: g.width,
            height: g.height,
            padding: theme.box.padding,
            boxSizing: 'border-box',
            background: theme.box.bgOpacity > 0 ? hexToRgba(theme.box.bgColor, theme.box.bgOpacity) : undefined,
            borderRadius: theme.box.radius,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: justify, minHeight: 0 }}>
            <div style={textStyle(theme, size)}>{slide.text}</div>
            {slide.secondaryText && (
              <div style={{ ...textStyle(theme, size * SECONDARY_SCALE), marginTop: size * 0.4, opacity: 0.85, fontStyle: 'italic' }}>
                {slide.secondaryText}
              </div>
            )}
          </div>
          {footerInside && <div style={{ ...footerStyle, marginTop: 8 }}>{slide.footer}</div>}
        </div>
      )}
      {hasFooter && !footerInside && (
        <div
          style={{
            ...footerStyle,
            position: 'absolute',
            left: g.left,
            width: g.width,
            bottom: Math.max(12, (bottomMargin - footerLine) / 2),
          }}
        >
          {slide.footer}
        </div>
      )}
    </>
  );
}

function VideoContent({
  slide,
  role,
  control,
  syncTime,
  onTime,
}: {
  slide: Slide;
  role: RenderRole;
  control?: VideoControl;
  syncTime?: number;
  onTime?: SlideRendererProps['onVideoTime'];
}) {
  const url = useMediaUrl(role === 'thumb' ? undefined : slide.mediaId);
  const meta = useMediaMeta(role === 'thumb' ? slide.mediaId : undefined);
  const ref = useRef<HTMLVideoElement>(null);
  const fill: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: slide.fit ?? 'contain' };
  useEffect(() => {
    const v = ref.current;
    if (!v || !control) return;
    if (control.seek !== undefined && Number.isFinite(control.seek)) v.currentTime = control.seek;
    v.volume = Math.max(0, Math.min(1, control.volume));
    if (control.playing) v.play().catch(() => undefined);
    else v.pause();
  }, [control?.nonce, url]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const v = ref.current;
    if (!v || role !== 'monitor' || syncTime === undefined) return;
    if (Math.abs(v.currentTime - syncTime) > 0.8) v.currentTime = syncTime;
  }, [syncTime, role]);
  if (role === 'thumb') return meta?.thumb ? <img src={meta.thumb} alt="" style={fill} /> : <div className="sr-ph">▶ {slide.label}</div>;
  if (!url) return null;
  return (
    <video
      ref={ref}
      src={url}
      autoPlay={control ? control.playing : true}
      loop={!!slide.loop}
      muted={role !== 'output' || !!slide.muted}
      playsInline
      style={fill}
      onTimeUpdate={(e) => onTime?.(e.currentTarget.currentTime, e.currentTarget.duration || 0, e.currentTarget.paused)}
      onPause={(e) => onTime?.(e.currentTarget.currentTime, e.currentTarget.duration || 0, true)}
      onPlay={(e) => onTime?.(e.currentTarget.currentTime, e.currentTarget.duration || 0, false)}
    />
  );
}

function AudioContent({ slide, role, control, onTime }: { slide: Slide; role: RenderRole; control?: VideoControl; onTime?: SlideRendererProps['onVideoTime'] }) {
  // Le son est joué par la fenêtre opérateur (moniteur du direct)
  const url = useMediaUrl(role === 'monitor' ? slide.mediaId : undefined);
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const a = ref.current;
    if (!a || !control) return;
    if (control.seek !== undefined && Number.isFinite(control.seek)) a.currentTime = control.seek;
    a.volume = Math.max(0, Math.min(1, control.volume));
    if (control.playing) a.play().catch(() => undefined);
    else a.pause();
  }, [control?.nonce, url]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      {role !== 'output' && <div className="sr-ph sr-ph-small">♪ {slide.label}</div>}
      {role === 'monitor' && url && (
        <audio
          ref={ref}
          src={url}
          autoPlay={control ? control.playing : true}
          loop={!!slide.loop}
          onTimeUpdate={(e) => onTime?.(e.currentTarget.currentTime, e.currentTarget.duration || 0, e.currentTarget.paused)}
          onPause={(e) => onTime?.(e.currentTarget.currentTime, e.currentTarget.duration || 0, true)}
        />
      )}
    </>
  );
}

function CameraContent({ slide, role }: { slide: Slide; role: RenderRole }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (role === 'thumb') return;
    let stream: MediaStream | null = null;
    let alive = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: slide.deviceId ? { deviceId: { exact: slide.deviceId }, width: 1920, height: 1080 } : { width: 1920, height: 1080 }, audio: false })
      .then((s) => {
        if (!alive) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        if (ref.current) ref.current.srcObject = s;
      })
      .catch((e) => setErr(String(e?.message || e)));
    return () => {
      alive = false;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [slide.deviceId, role]);
  if (role === 'thumb') return <div className="sr-ph">◉ Caméra</div>;
  if (err) return <div className="sr-ph">Caméra indisponible : {err}</div>;
  return <video ref={ref} autoPlay muted playsInline style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />;
}

function CountdownContent({ slide, theme, role, liveSince }: { slide: Slide; theme: Theme; role: RenderRole; liveSince?: number }) {
  const now = useNow(250, role !== 'thumb');
  const c = slide.countdown!;
  let target: number;
  if (c.mode === 'until') {
    const [h, m] = c.time.split(':').map((x) => parseInt(x, 10));
    const d = new Date(now);
    d.setHours(h || 0, m || 0, 0, 0);
    target = d.getTime();
  } else {
    target = (liveSince || now) + c.minutes * 60000;
  }
  const remaining = role === 'thumb' && c.mode === 'duration' ? c.minutes * 60000 : target - now;
  const done = remaining <= 0;
  const st = textStyle({ ...theme, font: { ...theme.font, autoFit: false } }, 230);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      {done ? (
        <div style={{ ...textStyle(theme, 120), textAlign: 'center' }}>{c.endText}</div>
      ) : (
        <>
          {c.title && <div style={{ ...textStyle(theme, 72), textAlign: 'center', marginBottom: 20 }}>{c.title}</div>}
          <div style={{ ...st, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(Math.ceil(remaining / 1000) * 1000)}</div>
        </>
      )}
    </div>
  );
}

function SlideContent(props: { slide: Slide; theme: Theme; W: number } & Pick<SlideRendererProps, 'role' | 'clearText' | 'video' | 'videoSyncTime' | 'onVideoTime' | 'liveSince'>) {
  const { slide, theme, W, role } = props;
  switch (slide.kind) {
    case 'text':
      return <TextContent slide={slide} theme={theme} W={W} clearText={props.clearText} />;
    case 'image':
      return <ImageContent slide={slide} theme={theme} W={W} clearText={props.clearText} />;
    case 'video':
      return <VideoContent slide={slide} role={role} control={props.video} syncTime={props.videoSyncTime} onTime={props.onVideoTime} />;
    case 'audio':
      return <AudioContent slide={slide} role={role} control={props.video} onTime={props.onVideoTime} />;
    case 'camera':
      return <CameraContent slide={slide} role={role} />;
    case 'web':
      return role === 'thumb' ? (
        <div className="sr-ph">🌐 {slide.url}</div>
      ) : (
        <iframe title="web" src={slide.url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, background: '#fff', pointerEvents: role === 'output' ? 'auto' : 'none' }} />
      );
    case 'countdown':
      return props.clearText ? null : <CountdownContent slide={slide} theme={theme} role={role} liveSince={props.liveSince} />;
    default:
      return null;
  }
}

function ImageContent({ slide, theme, W, clearText }: { slide: Slide; theme: Theme; W: number; clearText?: boolean }) {
  const url = useMediaUrl(slide.mediaId);
  return (
    <>
      {url && <img src={url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: slide.fit ?? 'contain' }} />}
      {slide.text.trim() && <TextContent slide={slide} theme={theme} W={W} clearText={clearText} />}
    </>
  );
}

function AlertBand({ alert, W, onDone }: { alert: AlertConfig & { shownAt: number }; W: number; onDone?: (shownAt: number) => void }) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [textW, setTextW] = useState(0);
  useLayoutEffect(() => {
    if (spanRef.current) setTextW(spanRef.current.scrollWidth);
  }, [alert.text, alert.size, alert.shownAt]);
  const scrolling = alert.mode === 'scroll';
  const duration = textW ? (W + textW) / Math.max(20, alert.speed) : 0;
  const style: CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    [alert.position]: 0,
    background: alert.bgColor,
    color: alert.color,
    fontSize: alert.size,
    fontFamily: 'Segoe UI, Inter, Helvetica, Arial, sans-serif',
    fontWeight: 600,
    padding: `${alert.size * 0.35}px 0`,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    zIndex: 20,
    textAlign: scrolling ? 'left' : 'center',
  };
  return (
    <div style={style}>
      <span
        key={alert.shownAt}
        ref={spanRef}
        style={
          scrolling && textW
            ? ({
                display: 'inline-block',
                animation: `louange-marquee ${duration}s linear ${alert.repeat > 0 ? alert.repeat : 'infinite'}`,
                ['--from' as string]: `${W}px`,
                ['--to' as string]: `${-textW}px`,
                transform: `translateX(${W}px)`,
              } as CSSProperties)
            : { display: 'inline-block', padding: '0 40px', visibility: scrolling && !textW ? 'hidden' : 'visible' }
        }
        onAnimationEnd={() => onDone?.(alert.shownAt)}
      >
        {alert.text}
      </span>
    </div>
  );
}

function LogoLayer({ mediaId }: { mediaId?: string }) {
  const url = useMediaUrl(mediaId);
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
      {url ? (
        <img src={url} alt="" style={{ maxWidth: '70%', maxHeight: '70%', objectFit: 'contain' }} />
      ) : (
        <div style={{ color: '#d9b45a', fontSize: 120, fontFamily: 'Georgia, serif', letterSpacing: 8 }}>✦</div>
      )}
    </div>
  );
}

function contentKey(slide: Slide | null, clearText?: boolean): string {
  if (!slide) return 'none';
  return `${slide.id}|${slide.kind}|${slide.mediaId || ''}|${slide.text}|${slide.secondaryText || ''}|${clearText ? 'c' : ''}`;
}

export const SlideRenderer = memo(function SlideRenderer(props: SlideRendererProps) {
  const { slide, theme, aspect, width, role } = props;
  const W = canvasWidth(aspect);
  const scale = width / W;
  const animate = role !== 'thumb' && theme.transition.type !== 'none';
  const duration = theme.transition.duration;

  let bg: Background = props.backgroundOverride ?? slide?.background ?? theme.background;
  if (slide && FULL_MEDIA.has(slide.kind) && !slide.background) bg = BLACK;
  if (props.clearBackground) bg = BLACK;
  const bgLayers = useLayers(bgKey(bg), bg, duration, animate);
  const contentLayers = useLayers(contentKey(slide, props.clearText), slide, duration, animate);
  const showOverlay = theme.overlayOpacity > 0 && !(slide && FULL_MEDIA.has(slide.kind));

  const wrapped: ReactNode = (
    <div className="sr-canvas" style={{ width: W, height: CANVAS_H, transform: `scale(${scale})` }}>
      {bgLayers.map((l) => (
        <div key={l.key} className={`sr-layer ${animate ? (l.out ? 'tr-out-fade' : 'tr-in-fade') : ''}`} style={{ animationDuration: `${duration}ms` }}>
          <BackgroundView bg={l.value} role={role} />
        </div>
      ))}
      {showOverlay && <div className="sr-layer" style={{ background: `rgba(0,0,0,${theme.overlayOpacity})` }} />}
      {contentLayers.map(
        (l) =>
          l.value && (
            <div
              key={l.key}
              className={`sr-layer ${animate ? `tr-${l.out ? 'out' : 'in'}-${theme.transition.type}` : ''}`}
              style={{ animationDuration: `${duration}ms` }}
            >
              <SlideContent
                slide={l.value}
                theme={theme}
                W={W}
                role={role}
                clearText={props.clearText}
                video={props.video}
                videoSyncTime={props.videoSyncTime}
                onVideoTime={l.out ? undefined : props.onVideoTime}
                liveSince={props.liveSince}
              />
            </div>
          ),
      )}
      {props.alert && props.alert.text && <AlertBand alert={props.alert} W={W} onDone={props.onAlertDone} />}
      {props.logo && <LogoLayer mediaId={props.logoMediaId} />}
      <div className="sr-layer sr-black" style={{ opacity: props.black ? 1 : 0, zIndex: 40 }} />
    </div>
  );

  return (
    <div className={`sr-root ${props.className || ''}`} style={{ width, height: (width * CANVAS_H) / W }}>
      {wrapped}
    </div>
  );
});
