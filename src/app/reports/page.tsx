'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from '../page.module.css';
import ProFeatureList, { PRO_FEATURES } from '@/components/ProFeatureList';
import TripRow from '@/components/TripRow';
import { useCommute } from '@/lib/commute';
import { PRO_PRICE_FALLBACK, inTrial, proUnlocked, trialDaysLeft } from '@/lib/commute/trial';
import { useNow } from '@/lib/useNow';
import { buildReportPdf } from '@/lib/reports/reportPdf';
import { shareFile } from '@/lib/reports/share';
import {
  PeriodPreset,
  ReportPeriod,
  customPeriod,
  formatPeriod,
  presetPeriod,
  summarize,
  toCsv,
  toDayInput,
  tripsInPeriod,
} from '@/lib/reports/summary';
import { formatDayLabel, formatDistanceKm, formatDuration } from '@/lib/trips/format';
import { Trip } from '@/lib/trips/types';

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'this-week', label: 'This Week' },
  { id: 'last-week', label: 'Last Week' },
  { id: 'this-month', label: 'This Month' },
  { id: 'last-month', label: 'Last Month' },
  { id: 'custom', label: 'Custom' },
];

const PREVIEW_TRIPS = 5;

/** Builds the file and opens the share menu. Outside the component: it runs on a tap, not while rendering. */
async function exportReport(kind: 'pdf' | 'csv', fileBase: string, periodLabel: string, trips: Trip[], preparedFor: string) {
  if (kind === 'pdf') {
    const pdf = buildReportPdf({ periodLabel, generatedAt: Date.now(), summary: summarize(trips), trips, preparedFor });
    await shareFile(`${fileBase}.pdf`, pdf, 'application/pdf');
  } else {
    await shareFile(`${fileBase}.csv`, toCsv(trips), 'text/csv');
  }
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
  );
}

function Stats({ values }: { values: { label: string; value: string }[] }) {
  return (
    <div className={styles.statGrid}>
      {values.map((v) => (
        <div className={styles.stat} key={v.label}>
          <div className={styles.statValue}>{v.value}</div>
          <div className={styles.statLabel}>{v.label}</div>
        </div>
      ))}
    </div>
  );
}

/** During the free month: how long is left, and buying now to keep everything. */
export function TrialBanner() {
  const state = useCommute();
  const now = useNow();
  if (!inTrial(state, now) || state.trialEndsAt === null) return null;
  const days = trialDaysLeft(state.trialEndsAt, now);
  return (
    <div className={styles.banner} role="status">
      <span>
        Free month: {days === 1 ? '1 day' : `${days} days`} left. Everything in Pro is open until {formatDayLabel(state.trialEndsAt)}. Keep it for{' '}
        {state.proPrice ?? PRO_PRICE_FALLBACK}, once.
      </span>
      <div className={styles.bannerActions}>
        <Link href="/pricing" className={styles.linkButton} style={{ textDecoration: 'none' }}>Buy now</Link>
      </div>
    </div>
  );
}

/** After the free month, without Pro: what reports contain, a blurred sample, and the way to unlock. */
function LockedReports() {
  const { proPrice, trialEndsAt } = useCommute();
  return (
    <>
      <div className={styles.card} style={{ borderColor: 'var(--pro)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--pro)' }}>
          <LockIcon />
          <span className={styles.proBadge}>PRO</span>
        </div>
        <div className={styles.cardTitle}>Commute reports</div>
        {trialEndsAt !== null && <p className={styles.cardText}>Your free month ended on {formatDayLabel(trialEndsAt)}. Unlock Pro once to keep using reports.</p>}
        <ProFeatureList features={PRO_FEATURES} color="var(--pro)" />
        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)', fontSize: '1.2rem' }}>{proPrice ?? PRO_PRICE_FALLBACK}</strong> one-time · no subscription
        </div>
        <Link href="/pricing" className="btn-primary" style={{ textDecoration: 'none' }}>
          Unlock with Pro
        </Link>
      </div>

      <div className={styles.card} aria-hidden style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ filter: 'blur(5px)', pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div className={styles.cardTitle}>28 Sep – 4 Oct 2026</div>
          <Stats
            values={[
              { label: 'Trips', value: '10' },
              { label: 'Total time', value: '7h 40m' },
              { label: 'Distance', value: '124.6 km' },
              { label: 'Avg per trip', value: '0h 46m' },
            ]}
          />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className={styles.proBadge} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>Sample report</span>
        </div>
      </div>
    </>
  );
}

function ProReports() {
  const { trips } = useCommute();
  const [now] = useState(() => new Date());
  const [preset, setPreset] = useState<PeriodPreset>('this-week');
  const [customFrom, setCustomFrom] = useState(() => toDayInput(presetPeriod('this-month', now).from));
  const [customTo, setCustomTo] = useState(() => toDayInput(now));
  const [exporting, setExporting] = useState<'pdf' | 'csv' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  // Only for the PDF being made now: never saved.
  const [preparedFor, setPreparedFor] = useState('');

  const period: ReportPeriod | null = preset === 'custom' ? customPeriod(customFrom, customTo) : presetPeriod(preset, now);
  const inPeriod = period ? tripsInPeriod(trips, period) : [];
  const summary = summarize(inPeriod);
  const label = period ? formatPeriod(period) : '';
  const fileBase = period ? `myce-commute-report-${toDayInput(period.from)}` : 'myce-commute-report';

  async function exportAs(kind: 'pdf' | 'csv') {
    if (!period) return;
    setExporting(kind);
    setExportError(null);
    try {
      await exportReport(kind, fileBase, label, inPeriod, preparedFor);
    } catch (error) {
      setExportError(`Couldn't export the report: ${String((error as Error)?.message ?? error)}`);
    } finally {
      setExporting(null);
    }
  }

  const { work, home, unknown } = summary.byDirection;
  const avg = (t: { count: number; totalSeconds: number }) => formatDuration(t.count ? t.totalSeconds / t.count : 0);

  return (
    <>
      <div className={styles.chips} role="tablist">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            role="tab"
            aria-selected={preset === p.id}
            className={`${styles.chip} ${preset === p.id ? styles.chipActive : ''}`}
            onClick={() => setPreset(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <label className={styles.cardText}>
            From
            <input className="input-field" type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} style={{ marginTop: '4px', padding: '12px' }} />
          </label>
          <label className={styles.cardText}>
            To
            <input className="input-field" type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} style={{ marginTop: '4px', padding: '12px' }} />
          </label>
        </div>
      )}

      {!period ? (
        <p className={styles.emptyState}>Pick a start and end date.</p>
      ) : (
        <>
          <div className={styles.card}>
            <div className={styles.cardTitle}>{label}</div>
            <Stats
              values={[
                { label: 'Trips', value: String(summary.tripCount) },
                { label: 'Total time', value: formatDuration(summary.totalSeconds) },
                { label: 'Distance', value: formatDistanceKm(summary.totalMeters) },
                { label: 'Avg per trip', value: formatDuration(summary.avgSecondsPerTrip) },
              ]}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <span>To work: {work.count} · avg {avg(work)}</span>
              <span>To home: {home.count} · avg {avg(home)}</span>
              {unknown.count > 0 && <span>Other: {unknown.count}</span>}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Trips in this report</div>
            {inPeriod.length === 0 && <p className={styles.cardText}>No trips in this period.</p>}
            {inPeriod.slice(0, PREVIEW_TRIPS).map((t, i) => (
              <div key={t.id}>
                {i > 0 && <div className={styles.divider} style={{ marginLeft: '52px' }} />}
                <TripRow trip={t} showDay inset />
              </div>
            ))}
            {inPeriod.length > PREVIEW_TRIPS && (
              <p className={styles.cardText}>+ {inPeriod.length - PREVIEW_TRIPS} more in the exported report</p>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Export</div>
            <label className={styles.cardText}>
              Prepared for (optional, PDF only)
              <input
                id="prepared-for"
                className="input-field"
                value={preparedFor}
                maxLength={60}
                placeholder="e.g. your name, for an employer"
                autoComplete="name"
                onChange={(e) => setPreparedFor(e.target.value)}
                style={{ marginTop: '4px' }}
              />
            </label>
            <button className="btn-primary" disabled={exporting !== null} onClick={() => exportAs('pdf')}>
              {exporting === 'pdf' ? 'Preparing PDF…' : 'Export PDF'}
            </button>
            <button className={styles.secondaryButton} style={{ marginTop: 0 }} disabled={exporting !== null} onClick={() => exportAs('csv')}>
              {exporting === 'csv' ? 'Preparing CSV…' : 'Export CSV (spreadsheet)'}
            </button>
            <p className={styles.cardText}>Opens your phone&apos;s share menu: save to Files, email it, or send it on WhatsApp.</p>
            {exportError && <p style={{ color: 'var(--danger-color)', fontSize: '0.85rem' }}>{exportError}</p>}
          </div>
        </>
      )}
    </>
  );
}

export default function ReportsPage() {
  const state = useCommute();
  const now = useNow();
  const { isPro, phase } = state;
  return (
    <>
      <header className="page-header">
        <h1 className="page-title">Reports</h1>
        {isPro && <span className={styles.proBadge}>PRO</span>}
      </header>
      <div style={{ padding: '0 16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <TrialBanner />
        {phase === 'loading' ? null : proUnlocked(state, now) ? <ProReports /> : <LockedReports />}
      </div>
    </>
  );
}
