'use client';

import { CSSProperties, ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '@/app/wrap/wrap.module.css';
import InsightIcon from '@/components/InsightIcon';
import Switch from '@/components/Switch';
import { useCommute } from '@/lib/commute';
import { Analogy, formatHours } from '@/lib/insights/equivalents';
import { wrapsSeen } from '@/lib/insights/seen';
import { GLOWS, WrapCardId, WrapCardInfo, wrapCards } from '@/lib/insights/cards';
import { HASHTAG, ShareFormat, drawCard, drawShareCard, drawStory, toPng } from '@/lib/insights/shareImage';
import { weekdayOf } from '@/lib/insights/stats';
import { MIN_MONTH_TRIPS, MIN_YEAR_MONTHS, MIN_YEAR_TRIPS, WrapSummary, hasEnoughTrips, periodFor, summarizeWrap, wrapName } from '@/lib/insights/wraps';
import { shareFile, shareFiles } from '@/lib/reports/share';
import { track } from '@/lib/sharing';
import { nativeTracker } from '@/lib/tracking/nativeTracker';
import { formatDayLabel, formatDurationWords } from '@/lib/trips/format';
import { useNow } from '@/lib/useNow';

/** How long a card stays up before moving on by itself. Holding a finger down pauses it. */
const CARD_MS = 5000;
/** A press longer than this is a pause, not a tap. */
const HOLD_MS = 300;
/** How long the card being left stays on screen, dissolving (matches .leaving in wrap.module.css). */
const LEAVE_MS = 450;

/** True inside the card being left: it shows as it ended, so its numbers don't count up again. */
const Settled = createContext(false);

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Counts up from 0 to `to`, slowing smoothly into the final number, unless the phone asks for less motion. */
function CountUp({ to, format = (n) => n.toLocaleString('en-IN'), delay = 300 }: { to: number; format?: (n: number) => string; delay?: number }) {
  const settled = useContext(Settled);
  const [value, setValue] = useState(() => (settled || reducedMotion() ? to : 0));
  useEffect(() => {
    if (settled || reducedMotion()) return;
    let frame = 0;
    const start = performance.now() + delay;
    const tick = (time: number) => {
      const t = Math.min(1, Math.max(0, (time - start) / 1400));
      // Exponential ease-out, like iOS: quick at first, then gliding into place.
      setValue(Math.round(to * (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, delay, settled]);
  return <>{format(value)}</>;
}

/** Rises into place after `step` beats. */
function Reveal({ step, children, style }: { step: 1 | 2 | 3 | 4; children: ReactNode; style?: CSSProperties }) {
  return <div className={`${styles.reveal} ${styles[`d${step}`]}`} style={style}>{children}</div>;
}

const km = (meters: number) => Math.round(meters / 1000);

/** Everyday comparisons under a card's main number, as on Insights' All-time tiles (not tappable here). */
function Comparisons({ list }: { list: Analogy[] }) {
  if (list.length === 0) return null;
  return (
    <div className={styles.compare}>
      {list.map((a) => (
        <div key={a.id} className={styles.compareTile}>
          <span className={styles.compareIcon}>
            <InsightIcon name={a.icon} size={24} />
          </span>
          <span className={styles.compareValue}>{a.value}</span>
          <span className={styles.compareLabel}>{a.label}</span>
        </div>
      ))}
    </div>
  );
}
const WEEK_HEAD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function IntroCard({ s }: { s: WrapSummary }) {
  const year = s.period.kind === 'year';
  const stops = [
    { value: <CountUp to={s.trips} delay={700} />, label: s.trips === 1 ? 'trip' : 'trips', dot: styles.stationStart },
    { value: <><CountUp to={km(s.totalMeters)} delay={1000} /> km</>, label: 'travelled', dot: '' },
    { value: <CountUp to={Math.floor(s.totalSeconds / 60)} format={(m) => formatHours(m * 60)} delay={1300} />, label: 'on the road', dot: styles.stationEnd },
  ];
  return (
    <>
      <Reveal step={1}>
        <div className={styles.eyebrow}>{year ? 'Your year on the road' : s.period.kind === 'first' ? '30 days since your first trip' : 'Your month on the road'}</div>
      </Reveal>
      <Reveal step={1}>
        <div className={styles.title}>{s.period.kind === 'first' ? 'Your first month' : s.period.title}</div>
      </Reveal>
      <div className={styles.stations}>
        {stops.map((stop, i) => (
          <Reveal key={stop.label} step={(i + 2) as 2 | 3 | 4}>
            <div className={styles.station}>
              <span className={`${styles.stationDot} ${stop.dot}`} />
              <div className={styles.stationValue}>{stop.value}</div>
              <div className={styles.stationLabel}>{stop.label}</div>
            </div>
          </Reveal>
        ))}
      </div>
      {s.soFar && (
        <Reveal step={4}>
          <div className={styles.note}>1 January to today. It keeps counting until 31 December.</div>
        </Reveal>
      )}
    </>
  );
}

function DistanceCard({ s }: { s: WrapSummary }) {
  const d = s.distance!;
  return (
    <>
      <Reveal step={1}>
        <div className={styles.question}>How far did you go?</div>
      </Reveal>
      <Reveal step={1}>
        <div className={styles.huge}>
          <CountUp to={km(s.totalMeters)} />
          <small>km</small>
        </div>
      </Reveal>
      <Reveal step={2}>
        {d.from && d.to ? (
          <div className={styles.route}>
            <div className={styles.routeTrack}>
              <span className={styles.routeDone} />
              <span className={styles.routeStart} />
              <span className={styles.routeEnd} />
              <span className={styles.routeCar} />
            </div>
            <div className={styles.routeEnds}>
              <span>{d.from}</span>
              <span>
                {d.to}
                {d.times >= 2 && <span className={styles.times}>×{d.times}</span>}
              </span>
            </div>
          </div>
        ) : (
          <div className={styles.loop}>
            <span className={styles.loopTrack} />
            <span className={styles.loopCar} />
          </div>
        )}
      </Reveal>
      <Reveal step={3}>
        <div className={styles.answer}>{d.text}.</div>
      </Reveal>
      <Reveal step={4}>
        <Comparisons list={s.comparisons.distance} />
      </Reveal>
    </>
  );
}

function TimeCard({ s }: { s: WrapSummary }) {
  return (
    <>
      <Reveal step={1}>
        <div className={styles.question}>How long were you on the road?</div>
      </Reveal>
      <Reveal step={1}>
        <div className={styles.huge}>
          <CountUp to={Math.floor(s.totalSeconds / 60)} format={(m) => formatHours(m * 60)} />
        </div>
      </Reveal>
      <Reveal step={2}>
        <div className={styles.answer}>That&apos;s time enough for:</div>
      </Reveal>
      <Reveal step={3}>
        <Comparisons list={s.comparisons.time} />
      </Reveal>
    </>
  );
}

function OfficeCard({ s }: { s: WrapSummary }) {
  const year = s.period.kind === 'year';
  const months = s.months ?? [];
  const most = Math.max(1, ...months.map((m) => m.officeDays));
  const calendar = s.calendar ?? [];
  const offset = calendar.length ? weekdayOf(calendar[0].dayStart) - 1 : 0;
  return (
    <>
      <Reveal step={1}>
        <div className={styles.question}>How often did you go in?</div>
      </Reveal>
      <Reveal step={1}>
        <div className={styles.huge}>
          <CountUp to={s.officeDays} />
          <small>office days</small>
        </div>
      </Reveal>
      <Reveal step={2}>
        {year ? (
          <div className={styles.bars} role="img" aria-label="Office days by month">
            {months.map((m, i) => (
              <div className={styles.barCol} key={m.name}>
                <span
                  className={`${styles.bar} ${m.name === s.busiestMonth?.name ? styles.barTop : ''} ${m.officeDays === 0 ? styles.barEmpty : ''}`}
                  style={{ height: `${Math.max(3, (m.officeDays / most) * 100)}%`, animationDelay: `${0.6 + i * 0.05}s` }}
                />
                <span className={styles.barLabel}>{m.name[0]}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.calendar} aria-hidden>
            {WEEK_HEAD.map((d, i) => (
              <span key={i} className={styles.calendarHead}>{d}</span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {calendar.map((day, i) => (
              <span key={day.dayStart} className={`${styles.calendarDay} ${day.office ? styles.calendarOffice : ''}`} style={{ animationDelay: `${0.5 + i * 0.025}s` }}>
                {new Date(day.dayStart).getDate()}
              </span>
            ))}
          </div>
        )}
      </Reveal>
      {year && s.busiestMonth && (
        <Reveal step={3}>
          <div className={styles.answer}>
            Busiest month: {s.busiestMonth.name}, with {s.busiestMonth.officeDays} office days.
          </div>
        </Reveal>
      )}
    </>
  );
}

function MonthsCard({ s }: { s: WrapSummary }) {
  const months = s.months ?? [];
  const slowest = Math.max(...months.map((m) => m.avgSeconds ?? 0));
  return (
    <>
      <Reveal step={1}>
        <div className={styles.question}>Your quickest month</div>
      </Reveal>
      <Reveal step={1}>
        <div className={styles.title}>{s.quickestMonth!.name}</div>
      </Reveal>
      <Reveal step={2}>
        <div className={styles.bars} role="img" aria-label="Average trip by month">
          {months.map((m, i) => (
            <div className={styles.barCol} key={m.name}>
              <span
                className={`${styles.bar} ${m.name === s.quickestMonth!.name ? styles.barTop : ''} ${m.avgSeconds === null ? styles.barEmpty : ''}`}
                style={{ height: `${m.avgSeconds === null ? 3 : Math.max(8, (m.avgSeconds / slowest) * 100)}%`, animationDelay: `${0.6 + i * 0.05}s` }}
              />
              <span className={styles.barLabel}>{m.name[0]}</span>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal step={3}>
        <div className={styles.answer}>{formatDurationWords(s.quickestMonth!.avgSeconds)} a trip on average, your best all year.</div>
      </Reveal>
    </>
  );
}

function FastestCard({ s }: { s: WrapSummary }) {
  const f = s.fastest!;
  const way = f.direction === 'work' ? ' to work' : f.direction === 'home' ? ' home' : '';
  // The ring shows the fastest trip as a share of the usual one: the emptier, the bigger the win.
  const share = s.avgSeconds ? Math.min(1, f.durationSeconds / s.avgSeconds) : 1;
  const saved = s.avgSeconds ? s.avgSeconds - f.durationSeconds : 0;
  return (
    <>
      <Reveal step={1}>
        <div className={styles.question}>Your personal best</div>
      </Reveal>
      <Reveal step={1} style={{ alignSelf: 'center' }}>
        <div className={styles.watch}>
          <svg viewBox="0 0 120 120" aria-hidden>
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--track)" strokeWidth="10" />
            <circle
              className={styles.watchArc}
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="10"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray="100"
              strokeDashoffset={100 - share * 100}
            />
          </svg>
          <div className={styles.watchCenter}>
            <div className={styles.watchValue}>
              <CountUp to={Math.floor(f.durationSeconds / 60)} delay={500} />
            </div>
            <div className={styles.watchUnit}>minutes</div>
          </div>
        </div>
      </Reveal>
      <Reveal step={3}>
        <div className={`${styles.answer} ${styles.withIcon}`}>
          <InsightIcon name="bolt" size={22} />
          <span>
            Your fastest trip{way}, {formatDayLabel(f.startedAt)}.
          </span>
        </div>
        {saved >= 60 && (
          <div className={styles.note} style={{ marginTop: '6px' }}>
            {formatDurationWords(saved)} quicker than your usual {formatDurationWords(s.avgSeconds!)}.
          </div>
        )}
      </Reveal>
    </>
  );
}

function PersonalityCard({ s }: { s: WrapSummary }) {
  const year = s.period.kind === 'year';
  const p = s.personality;
  return (
    <>
      <Reveal step={1}>
        <div className={styles.eyebrow}>{year ? 'Your commuter personality of the year' : 'Your commuter personality'}</div>
      </Reveal>
      <div className={styles.sign}>
        <span className={styles.signIcon}>
          <InsightIcon name={p.icon} size={64} strokeWidth={2.2} />
        </span>
      </div>
      <Reveal step={2}>
        <div className={styles.title}>{p.name}</div>
      </Reveal>
      <Reveal step={3}>
        <div className={styles.answer}>{p.line}</div>
      </Reveal>
      {!year && s.officeDays > 0 && p.id !== 'regular' && (
        <Reveal step={4}>
          <div className={styles.chip}>
            <InsightIcon name="building" size={16} />
            {s.officeDays === 1 ? '1 office day' : `${s.officeDays} office days`}
          </div>
        </Reveal>
      )}
    </>
  );
}

/**
 * The last card: the summary as it will be posted, and the two ways to share: the whole Wrap as a story (every card
 * as an image, ending with this summary) or just the summary.
 */
function ShareCard({ summary }: { summary: WrapSummary }) {
  const [hideNumbers, setHideNumbers] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [sharing, setSharing] = useState<'all' | ShareFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const count = wrapCards(summary).length;
  const { id, kind } = summary.period;

  useEffect(() => {
    let current = true;
    drawShareCard(summary, { format: 'story', hideNumbers })
      .then((canvas) => current && setPreview(canvas.toDataURL('image/png')))
      .catch(() => current && setPreview(null));
    return () => {
      current = false;
    };
  }, [summary, hideNumbers]);

  async function share(what: 'all' | ShareFormat) {
    setSharing(what);
    setError(null);
    try {
      if (what === 'all') {
        const images = await drawStory(summary, hideNumbers);
        const files = await Promise.all(images.map(async (c, i) => ({ filename: `myce-${id}-${String(i + 1).padStart(2, '0')}.png`, contents: await toPng(c) })));
        await shareFiles(files, 'image/png', 'Share your Wrap', `${wrapName(summary.period)} ${HASHTAG}`);
      } else {
        const png = await toPng(await drawShareCard(summary, { format: what, hideNumbers }));
        await shareFile(`myce-${id}-${what}.png`, png, 'image/png', 'Share your Wrap', `${wrapName(summary.period)} ${HASHTAG}`);
      }
      track({ name: 'wrap_shared', params: { kind, format: what, numbers: !hideNumbers } });
    } catch (e) {
      setError(`Couldn't share: ${String((e as Error)?.message ?? e)}`);
    } finally {
      setSharing(null);
    }
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- a generated image, shown as is */}
      {preview ? <img className={styles.preview} src={preview} alt={`Summary card: ${summary.personality.name}`} /> : <div className={styles.preview} />}
      <div className={styles.shareActions}>
        <div className={styles.toggleRow}>
          <span>Hide numbers on the summary</span>
          <Switch checked={hideNumbers} onChange={setHideNumbers} label="Hide numbers on the summary card" />
        </div>
        <button className="btn-primary" disabled={sharing !== null} onClick={() => share('all')}>
          {sharing === 'all' ? 'Preparing your story…' : `Share the whole story (${count})`}
        </button>
        <button className={styles.shareSecondary} disabled={sharing !== null} onClick={() => share('story')}>
          {sharing === 'story' ? 'Preparing…' : 'Share the summary'}
        </button>
        <button className={styles.shareLink} disabled={sharing !== null} onClick={() => share('square')}>
          {sharing === 'square' ? 'Preparing…' : 'Or as a square post, for LinkedIn'}
        </button>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </>
  );
}

const CARD_VIEWS: Record<WrapCardId, (s: WrapSummary) => ReactNode> = {
  intro: (s) => <IntroCard s={s} />,
  distance: (s) => <DistanceCard s={s} />,
  time: (s) => <TimeCard s={s} />,
  office: (s) => <OfficeCard s={s} />,
  months: (s) => <MonthsCard s={s} />,
  fastest: (s) => <FastestCard s={s} />,
  personality: (s) => <PersonalityCard s={s} />,
  share: (s) => <ShareCard summary={s} />,
};

/** A card's colour and its slowly drifting glows. `behind`: the previous card's, under the new one as it fades in. */
function Backdrop({ card, behind = false }: { card: Pick<WrapCardInfo, 'theme' | 'glow'>; behind?: boolean }) {
  return (
    <div className={`${styles.backdrop} ${styles[card.theme]} ${behind ? styles.backdropBehind : ''}`} aria-hidden>
      {GLOWS[card.glow].map((g, i) => (
        <span key={i} className={`${styles.glow} ${styles[`tone${g.tone}`]}`} style={{ left: `${g.x * 100}%`, top: `${g.y * 100}%`, width: `${g.size * 100}%` }} />
      ))}
    </div>
  );
}

function Story({ summary, onClose }: { summary: WrapSummary; onClose: () => void }) {
  const cards: WrapCardInfo[] = useMemo(() => wrapCards(summary), [summary]);
  // The card shown, the one being left (dissolving on top for a moment), and which way we moved.
  const [view, setView] = useState<{ index: number; leaving: number | null; back: boolean }>({ index: 0, leaving: null, back: false });
  const index = view.index;
  const [paused, setPaused] = useState(false);
  const [sharingCard, setSharingCard] = useState(false);
  const pressedAt = useRef(0);
  const last = index === cards.length - 1;
  const card = cards[index];
  const { id, kind } = summary.period;

  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    track({ name: 'wrap_opened', params: { kind } });
    // The widget stops saying "Your Wrap is ready" once it's opened.
    void wrapsSeen.markSeen(id).then(() => nativeTracker.refreshWidget());
  }, [id, kind]);

  const finished = useRef(false);
  useEffect(() => {
    if (!last || finished.current) return;
    finished.current = true;
    track({ name: 'wrap_finished', params: { kind } });
  }, [last, kind]);

  /** Moves to the card `to(current)` returns, leaving the current one to dissolve. */
  const move = useCallback(
    (to: (current: number) => number) =>
      setView((v) => {
        const next = Math.min(cards.length - 1, Math.max(0, to(v.index)));
        return next === v.index ? v : { index: next, leaving: v.index, back: next < v.index };
      }),
    [cards.length],
  );
  const show = (i: number) => move(() => i);
  const go = useCallback((step: number) => move((i) => i + step), [move]);

  // The card being left goes once it has dissolved.
  useEffect(() => {
    if (view.leaving === null) return;
    const timer = setTimeout(() => setView((v) => ({ ...v, leaving: null })), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);

  // Holding pauses the card; letting go after a hold doesn't count as a tap.
  const press = {
    onPointerDown: () => {
      pressedAt.current = Date.now();
      setPaused(true);
    },
    onPointerUp: () => setPaused(false),
    onPointerCancel: () => setPaused(false),
    onPointerLeave: () => setPaused(false),
  };
  const tap = (step: number) => () => {
    if (Date.now() - pressedAt.current < HOLD_MS) go(step);
  };
  const autoAdvance = !last && !reducedMotion();

  /** This card on its own, as a Story image. The card waits while the image is made and the share menu is open. */
  async function shareThisCard() {
    setSharingCard(true);
    try {
      const png = await toPng(await drawCard(summary, card));
      await shareFile(`myce-${id}-${card.id}.png`, png, 'image/png', 'Share this card', `${wrapName(summary.period)} ${HASHTAG}`);
      track({ name: 'wrap_shared', params: { kind, format: 'card', numbers: true, card: card.id } });
    } catch {
      // Nothing to undo: the card just carries on.
    } finally {
      setSharingCard(false);
    }
  }

  return (
    <div
      className={`${styles.screen} ${styles[card.theme]} ${paused || sharingCard ? styles.paused : ''}`}
      role="dialog"
      aria-label={wrapName(summary.period)}
      style={{ '--card-ms': `${CARD_MS}ms` } as CSSProperties}
    >
      {view.leaving !== null && <Backdrop card={cards[view.leaving]} behind key={`behind-${cards[view.leaving].id}`} />}
      <Backdrop card={card} key={`bg-${card.id}`} />
      <div className={styles.top}>
        <div className={styles.progress} aria-label={`Card ${index + 1} of ${cards.length}`}>
          {cards.map((c, i) => (
            <button key={c.id} className={styles.progressHit} aria-label={`Go to card ${i + 1}`} aria-current={i === index ? 'step' : undefined} onClick={() => show(i)}>
              <span className={styles.progressSegment}>
                <span
                  key={i === index ? `run-${index}` : c.id}
                  className={`${styles.progressFill} ${i < index || (i === index && !autoAdvance) ? styles.progressDone : ''} ${i === index && autoAdvance ? styles.progressRunning : ''}`}
                  onAnimationEnd={i === index ? () => go(1) : undefined}
                />
              </span>
            </button>
          ))}
        </div>
        {!last && (
          <button className={styles.close} aria-label="Share this card" disabled={sharingCard} onClick={shareThisCard} style={sharingCard ? { opacity: 0.5 } : undefined}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
          </button>
        )}
        <button className={styles.close} aria-label="Close" onClick={onClose}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div className={styles.brand}>
        MYCE<span>{wrapName(summary.period)}</span>
      </div>
      <div className={styles.stageArea}>
        {view.leaving !== null && cards[view.leaving].id !== 'share' && (
          <div className={`${styles.stage} ${styles.leaving} ${view.back ? styles.leavingBack : ''} ${styles[cards[view.leaving].theme]}`} key={`out-${cards[view.leaving].id}`} aria-hidden>
            <Settled.Provider value>{CARD_VIEWS[cards[view.leaving].id](summary)}</Settled.Provider>
          </div>
        )}
        <div className={`${styles.stage} ${view.back ? styles.stageBack : ''}`} key={card.id} aria-live="polite">
          {index > 0 && <button className={styles.tapBack} aria-label="Previous card" onClick={tap(-1)} {...press} />}
          {!last && <button className={styles.tapNext} aria-label="Next card" onClick={tap(1)} {...press} />}
          {CARD_VIEWS[card.id](summary)}
        </div>
      </div>
    </div>
  );
}

/** The Wrap named by `?id=`, as full-screen story cards. Read inside a Suspense boundary (see app/wrap/page.tsx). */
export default function WrapViewer() {
  const id = useSearchParams().get('id') ?? '';
  const router = useRouter();
  const { phase, trips } = useCommute();
  const now = useNow();
  const summary = useMemo(() => {
    if (phase === 'loading') return null;
    const period = periodFor(id, trips);
    return period && hasEnoughTrips(period, trips) ? summarizeWrap(period, trips, now) : null;
  }, [phase, id, trips, now]);

  const close = () => {
    if (window.history.length > 1) router.back();
    else router.replace('/insights');
  };

  if (phase === 'loading') return <div className={`${styles.screen} ${styles.asphalt}`} />;
  if (!summary) {
    return (
      <div className={`${styles.screen} ${styles.asphalt}`}>
        <Backdrop card={{ theme: 'asphalt', glow: 0 }} />
        <div className={styles.top}>
          <div style={{ flex: 1 }} />
          <button className={styles.close} aria-label="Close" onClick={close}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className={styles.empty}>
          <div className={styles.title}>Not enough trips for this Wrap</div>
          <p className={styles.note}>
            A monthly Wrap needs {MIN_MONTH_TRIPS} or more trips, and a yearly one {MIN_YEAR_TRIPS} or more spread over at least {MIN_YEAR_MONTHS} months.
          </p>
        </div>
      </div>
    );
  }
  return <Story summary={summary} onClose={close} />;
}
