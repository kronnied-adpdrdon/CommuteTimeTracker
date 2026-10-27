'use client';

import { useState } from 'react';
import Link from 'next/link';
import pageStyles from '../page.module.css';
import styles from './insights.module.css';
import InsightIcon from '@/components/InsightIcon';
import { SectionHeading, StatStrip } from '@/components/StatStrip';
import WrapReadyCard from '@/components/WrapReadyCard';
import { useCommute } from '@/lib/commute';
import { Analogy, analogies, compareDistance, dayNumber, firstTiles, formatDaysHours, formatHours, nextTile } from '@/lib/insights/equivalents';
import { IconName } from '@/lib/insights/icons';
import { useWrapsSeen } from '@/lib/insights/seen';
import {
  PATTERN_DAYS,
  between,
  goingVsComingBack,
  records,
  startOfMonth,
  totals,
  weekdayName,
  weekdayPattern,
} from '@/lib/insights/stats';
import { MIN_MONTH_TRIPS, WRAP_ICON, availableWraps, monthName, summarizeWrap, wrapName } from '@/lib/insights/wraps';
import { formatDayLabel, formatDistanceKm, formatDuration, formatDurationWords } from '@/lib/trips/format';
import { Trip } from '@/lib/trips/types';
import { useNow } from '@/lib/useNow';

function Line({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <div className={styles.line}>
      <span className={styles.lineIcon}>
        <InsightIcon name={icon} size={18} />
      </span>
      <span>{children}</span>
    </div>
  );
}

/** Steps through a list of comparisons, one tap at a time. */
function useTurns(length: number): [number, () => void] {
  const [turn, setTurn] = useState(0);
  return [turn, () => setTurn((t) => (t + 1) % Math.max(1, length))];
}

const at = (list: Analogy[], turn: number, i: number) => (list.length > i ? list[(turn + i) % list.length] : null);

/** One comparison as a line of text; tapping shows the next one. */
function AnalogyLine({ list, lead }: { list: Analogy[]; lead: string }) {
  const [turn, next] = useTurns(list.length);
  const a = at(list, turn, 0);
  if (!a) return null;
  return (
    <button className={`${styles.line} ${styles.lineButton}`} onClick={next} aria-label={`${lead} ${a.value} ${a.label}. Tap for another comparison.`}>
      <span className={styles.lineIcon}>
        <InsightIcon name={a.icon} size={18} />
      </span>
      <span key={a.id} className={styles.swapIn}>
        {lead} <strong>{a.value}</strong> {a.label}
      </span>
    </button>
  );
}

/**
 * The All-time tiles: two distance comparisons, then two time ones. Each tile changes on its own when tapped, and no
 * two tiles ever show the same comparison or the same sort of thing (see `nextTile`).
 */
function AnalogyGrid({ far, long }: { far: Analogy[]; long: Analogy[] }) {
  const [set, setSet] = useState(() => firstTiles([far, far, long, long]));
  return (
    <div className={styles.tiles}>
      {set.picks.map((pick, tile) => {
        const a = set.lists[tile][pick];
        return a && <AnalogyTile key={tile} a={a} onTap={() => setSet((s) => nextTile(s, tile))} />;
      })}
    </div>
  );
}

function AnalogyTile({ a, onTap }: { a: Analogy; onTap: () => void }) {
  return (
    <button className={styles.tile} onClick={onTap} aria-label={`${a.value} ${a.label}. Tap for another comparison.`}>
      <span key={a.id} className={styles.swapIn}>
        <span className={styles.tileIcon}>
          <InsightIcon name={a.icon} size={18} />
        </span>
        <span className={styles.tileValue}>{a.value}</span>
        <span className={styles.tileLabel}>{a.label}</span>
      </span>
    </button>
  );
}

function ThisMonth({ trips, now }: { trips: Trip[]; now: number }) {
  const month = startOfMonth(new Date(now));
  const t = totals(between(trips, month.getTime(), now + 1));
  const distance = compareDistance(t.totalMeters);
  const time = analogies('time', t.totalSeconds, dayNumber(now));
  return (
    <div className={pageStyles.summaryCard}>
      <SectionHeading icon="calendar">{monthName(month.getMonth())} so far</SectionHeading>
      <StatStrip
        stats={[
          { value: String(t.trips), label: 'Trips', detail: t.officeDays === 1 ? '1 office day' : `${t.officeDays} office days` },
          { value: formatDuration(t.totalSeconds), label: 'Time' },
          { value: formatDistanceKm(t.totalMeters), label: 'Distance' },
        ]}
      />
      {distance && <Line icon="route">{distance.text}, this month</Line>}
      <AnalogyLine list={time} lead="Time enough for" />
    </div>
  );
}

function AllTime({ trips, now }: { trips: Trip[]; now: number }) {
  const t = totals(trips);
  const first = Math.min(...trips.map((trip) => trip.startedAt));
  const distance = compareDistance(t.totalMeters);
  const day = dayNumber(now);
  // The route line may already be "once around the Earth": don't say it twice.
  const far = analogies('distance', t.totalMeters, day, distance?.text.includes('Earth') ? ['earth'] : []);
  const long = analogies('time', t.totalSeconds, day);
  return (
    <div className={pageStyles.card}>
      <SectionHeading icon="chart">All time</SectionHeading>
      <div>
        <div className={styles.bigNumber}>{formatDaysHours(t.totalSeconds)}</div>
        <div className={`${pageStyles.cardText}`}>
          on the road since {formatDayLabel(first, true)} · {t.trips === 1 ? '1 trip' : `${t.trips} trips`} · {formatDistanceKm(t.totalMeters)}
        </div>
      </div>
      {distance && <Line icon="route">{distance.text}</Line>}
      {far.length + long.length > 0 && (
        <>
          <AnalogyGrid key={[...far, ...long].map((x) => x.id).join()} far={far} long={long} />
          <p className={pageStyles.cardText}>Tap a tile for another comparison.</p>
        </>
      )}
    </div>
  );
}

function YourWeek({ trips, now }: { trips: Trip[]; now: number }) {
  const pattern = weekdayPattern(trips, now);
  const ways = goingVsComingBack(trips, now);
  if (!pattern && !ways) return null;
  const max = pattern ? Math.max(...pattern.days.map((d) => d.avgSeconds)) : 0;
  const gap = ways ? Math.round((ways.homeSeconds - ways.workSeconds) / 60) : 0;
  return (
    <div className={pageStyles.card}>
      <SectionHeading icon="chart">Your week</SectionHeading>
      {pattern && (
        <>
          <p className={pageStyles.cardText}>
            Average trip by day. <strong style={{ color: 'var(--text-primary)' }}>{weekdayName(pattern.best.weekday)}</strong> is your quickest,{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{weekdayName(pattern.worst.weekday)}</strong> your slowest (
            {formatDurationWords(pattern.worst.avgSeconds - pattern.best.avgSeconds)} more).
          </p>
          <div className={styles.weekChart} aria-hidden>
            {pattern.days.map((d) => {
              const marked = d === pattern.best ? 'quickest' : d === pattern.worst ? 'slowest' : null;
              return (
                <div className={styles.weekRow} key={d.weekday}>
                  <span className={styles.weekDay}>{weekdayName(d.weekday).slice(0, 3)}</span>
                  <span className={styles.weekTrack}>
                    <span className={styles.weekBar} style={{ width: `${(d.avgSeconds / max) * 100}%` }} />
                  </span>
                  <span className={styles.weekValue}>
                    {marked && (
                      <>
                        {formatDurationWords(d.avgSeconds)}
                        <span className={styles.weekNote}>{marked}</span>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <table className={styles.srOnly}>
            <caption>Average trip by weekday, last {PATTERN_DAYS / 7} weeks</caption>
            <tbody>
              {pattern.days.map((d) => (
                <tr key={d.weekday}>
                  <th scope="row">{weekdayName(d.weekday)}</th>
                  <td>{formatDurationWords(d.avgSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {ways && (
        <Line icon="swap">
          {gap === 0
            ? 'Going and coming back take about the same time.'
            : gap > 0
              ? `Coming home takes ${gap} min longer than going to work.`
              : `Going to work takes ${-gap} min longer than coming home.`}
        </Line>
      )}
    </div>
  );
}

function Records({ trips }: { trips: Trip[] }) {
  const r = records(trips);
  const rows = [
    r.quickestToWork && { label: 'Quickest to work', value: formatDurationWords(r.quickestToWork.durationSeconds), when: r.quickestToWork.startedAt },
    r.quickestHome && { label: 'Quickest home', value: formatDurationWords(r.quickestHome.durationSeconds), when: r.quickestHome.startedAt },
    r.longest && { label: 'Longest trip', value: formatDistanceKm(r.longest.distanceMeters), when: r.longest.startedAt },
  ].filter((row) => !!row);
  if (rows.length === 0) return null;
  return (
    <div className={pageStyles.card}>
      <SectionHeading icon="trophy">Personal records</SectionHeading>
      <div>
        {rows.map((row) => (
          <div className={styles.recordRow} key={row.label}>
            <span>
              {row.label}
              <br />
              <span className={styles.muted} style={{ fontSize: '0.8rem' }}>{formatDayLabel(row.when, true)}</span>
            </span>
            <span className={styles.recordValue}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Wraps({ trips, now }: { trips: Trip[]; now: number }) {
  const seen = useWrapsSeen();
  const wraps = availableWraps(trips, now);
  const next = new Date(new Date(now).getFullYear(), new Date(now).getMonth() + 1, 1);
  return (
    <div className={pageStyles.card}>
      <SectionHeading icon="gift">Your Wraps</SectionHeading>
      {wraps.length === 0 ? (
        <p className={pageStyles.cardText}>
          A short story of your month, to look back on and share. The next one comes out on {formatDayLabel(next.getTime(), true)} if you have{' '}
          {MIN_MONTH_TRIPS} or more trips this month.
        </p>
      ) : (
        <div>
          {wraps.map((w) => {
            const s = summarizeWrap(w, trips, now);
            return (
              <Link key={w.id} href={`/wrap?id=${w.id}`} className={styles.wrapRow}>
                <span className={styles.wrapIcon}>
                  <InsightIcon name={WRAP_ICON[w.kind]} />
                </span>
                <span className={styles.wrapMain}>
                  <span className={styles.wrapTitle}>{wrapName(w)}</span>
                  <br />
                  <span className={styles.wrapSub}>
                    {s.personality.name} · {s.trips} trips · {formatHours(s.totalSeconds)}
                  </span>
                </span>
                {seen !== null && !seen.includes(w.id) && <span className={styles.newBadge}>NEW</span>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const { phase, trips } = useCommute();
  const now = useNow();
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Insights</h1>
      </header>
      <div className={styles.page}>
        <WrapReadyCard />
        {phase === 'loading' ? null : trips.length === 0 ? (
          <div className={pageStyles.card}>
            <div className={pageStyles.cardTitle}>Your insights start with your first trip</div>
            <p className={pageStyles.cardText}>
              This is where you&apos;ll see your quickest and slowest days, your records, office days, and a Wrap of
              every month to share.
            </p>
          </div>
        ) : (
          <>
            <ThisMonth trips={trips} now={now} />
            <YourWeek trips={trips} now={now} />
            <Records trips={trips} />
            <AllTime trips={trips} now={now} />
            <Wraps trips={trips} now={now} />
          </>
        )}
      </div>
    </>
  );
}
