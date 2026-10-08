import { formatDayLabel, formatDistanceKm, formatDurationWords, formatTimeRange } from '../trips/format';
import { Trip } from '../trips/types';
import { PAGE_HEIGHT, PAGE_WIDTH, PdfDocument } from './pdf';
import { DIRECTION_LABELS, ReportSummary } from './summary';

type Rgb = [number, number, number];

// MYCE's asphalt and signal amber (globals.css), on white paper so it prints well.
const ASPHALT: Rgb = [0.08, 0.09, 0.11];
const AMBER: Rgb = [1, 0.71, 0];
/** The icon's lighter amber, for the stopwatch's top button. */
const AMBER_LIGHT: Rgb = [1, 0.79, 0.2];
const WHITE: Rgb = [1, 1, 1];
const PALE: Rgb = [0.78, 0.8, 0.83];
const MUTED: Rgb = [0.42, 0.45, 0.5];
const TILE: Rgb = [0.96, 0.95, 0.93];
const RULE: Rgb = [0.9, 0.9, 0.92];

const MARGIN = 40;
const ROW = 20;
const HEADER = 96;
const COLUMNS = [
  { title: 'Date', x: MARGIN + 8 },
  { title: 'Time', x: MARGIN + 130 },
  { title: 'Duration', x: MARGIN + 250 },
  { title: 'Distance', x: MARGIN + 330 },
  { title: 'Direction', x: MARGIN + 420 },
];

export interface ReportInput {
  periodLabel: string;
  generatedAt: number;
  summary: ReportSummary;
  trips: Trip[];
  /** Typed at export time, e.g. for an employer. Printed on the report, never stored. */
  preparedFor?: string;
}

/**
 * The app icon (a map pin with a clock face and stopwatch buttons), drawn with the PDF's own shapes. `size` is its
 * height. Same geometry as `store/icon.svg`, in that file's 108-unit grid (the drawing spans 31-77 across, 17-86 down).
 */
function drawIcon(pdf: PdfDocument, x: number, y: number, size: number) {
  const s = size / 69;
  const P = (u: number, v: number): [number, number] => [x + (u - 31) * s, y + (v - 17) * s];
  // The side button is the top button turned 45 degrees around the clock's centre.
  const turned = (u: number, v: number): [number, number] => {
    const c = Math.SQRT1_2;
    return P(54 + (u - 54) * c - (v - 50) * c, 50 + (u - 54) * c + (v - 50) * c);
  };
  pdf.rect(...P(49, 17), 10 * s, 5 * s, AMBER_LIGHT);
  pdf.rect(...P(52, 21), 4 * s, 7 * s, AMBER_LIGHT);
  pdf.polygon([turned(50, 21), turned(58, 21), turned(58, 26), turned(50, 26)], AMBER);
  pdf.polygon([turned(52.5, 24), turned(55.5, 24), turned(55.5, 29), turned(52.5, 29)], AMBER);
  // Pin: a circle, and a point from where the sides touch it (tangents from the tip) down to the tip.
  pdf.circle(...P(54, 50), 23 * s, AMBER);
  pdf.polygon([P(36.3, 64.7), P(71.7, 64.7), P(54, 86)], AMBER);
  pdf.circle(...P(54, 50), 12.5 * s, ASPHALT);
  pdf.line(...P(54, 50), ...P(54, 41), WHITE, 3 * s, true);
  pdf.line(...P(54, 50), ...P(60, 53.5), WHITE, 3 * s, true);
}

export function buildReportPdf({ periodLabel, generatedAt, summary, trips, preparedFor }: ReportInput): Uint8Array {
  const pdf = new PdfDocument();
  const width = PAGE_WIDTH - MARGIN * 2;

  // Header band: icon, name, title, period, and an amber rule underneath.
  pdf.rect(0, 0, PAGE_WIDTH, HEADER, ASPHALT);
  pdf.rect(0, HEADER, PAGE_WIDTH, 3, AMBER);
  drawIcon(pdf, MARGIN, 24, 48);
  const textX = MARGIN + 32 + 16;
  pdf.text(textX, 36, 'MYCE', { bold: true, size: 10, color: AMBER });
  pdf.text(textX, 61, 'Commute Report', { bold: true, size: 22, color: WHITE });
  pdf.text(textX, 80, periodLabel, { size: 11, color: PALE });

  let y = HEADER + 3 + 26;
  const name = preparedFor?.trim();
  if (name) {
    pdf.text(MARGIN, y, `Prepared for: ${name}`, { bold: true, size: 11 });
    y += 16;
  }

  // Summary tiles, each with an amber edge on top.
  const tiles = [
    { label: 'Trips', value: String(summary.tripCount) },
    { label: 'Total time', value: formatDurationWords(summary.totalSeconds) },
    { label: 'Distance', value: formatDistanceKm(summary.totalMeters) },
    { label: 'Avg per trip', value: formatDurationWords(summary.avgSecondsPerTrip) },
  ];
  const tileWidth = (width - 3 * 10) / 4;
  tiles.forEach((tile, i) => {
    const x = MARGIN + i * (tileWidth + 10);
    pdf.rect(x, y, tileWidth, 58, TILE);
    pdf.rect(x, y, tileWidth, 2.5, AMBER);
    pdf.text(x + 10, y + 26, tile.value, { bold: true, size: 15 });
    pdf.text(x + 10, y + 46, tile.label, { size: 9, color: MUTED });
  });

  // To work / to home / other, so the parts add up to the trip count.
  y += 84;
  const { work, home, unknown } = summary.byDirection;
  const avg = (t: { count: number; totalSeconds: number }) => formatDurationWords(t.count ? t.totalSeconds / t.count : 0);
  const count = (n: number) => (n === 1 ? '1 trip' : `${n} trips`);
  const parts = [`To work: ${count(work.count)}, avg ${avg(work)}`, `To home: ${count(home.count)}, avg ${avg(home)}`];
  if (unknown.count > 0) parts.push(`Other: ${count(unknown.count)}, avg ${avg(unknown)}`);
  parts.forEach((part, i) => pdf.text(MARGIN + (i * width) / parts.length, y, part, { size: 10 }));
  y += 16;
  const edited = trips.filter((t) => t.original).length;
  pdf.text(MARGIN, y, `Days with commutes: ${summary.daysWithTrips}${edited ? `    Edited trips: ${edited} (marked *)` : ''}`, { size: 10, color: MUTED });

  // Trips table
  y += 30;
  const tableHeader = () => {
    pdf.rect(MARGIN, y, width, ROW, TILE);
    COLUMNS.forEach((c) => pdf.text(c.x, y + 14, c.title, { bold: true, size: 9, color: MUTED }));
    y += ROW;
  };
  tableHeader();

  if (trips.length === 0) {
    pdf.text(MARGIN + 8, y + 18, 'No trips in this period.', { size: 10, color: MUTED });
  }

  for (const trip of trips) {
    if (y + ROW > PAGE_HEIGHT - 60) {
      pdf.addPage();
      y = MARGIN;
      tableHeader();
    }
    const cells = [
      `${formatDayLabel(trip.startedAt, true)}${trip.original ? ' *' : ''}`,
      formatTimeRange(trip.startedAt, trip.endedAt),
      formatDurationWords(trip.durationSeconds),
      formatDistanceKm(trip.distanceMeters),
      DIRECTION_LABELS[trip.direction] || '-',
    ];
    cells.forEach((cell, i) => pdf.text(COLUMNS[i].x, y + 14, cell, { size: 9.5 }));
    pdf.line(MARGIN, y + ROW, MARGIN + width, y + ROW, RULE);
    y += ROW;
  }

  if (edited) {
    if (y + 24 > PAGE_HEIGHT - 60) {
      pdf.addPage();
      y = MARGIN;
    }
    pdf.text(MARGIN, y + 18, '* Changed by hand after it was recorded.', { size: 8.5, color: MUTED });
  }

  // Footer on every page, once the page count is known
  const generated = formatDayLabel(generatedAt, true);
  for (let page = 0; page < pdf.pageCount; page++) {
    pdf.text(
      MARGIN,
      PAGE_HEIGHT - 28,
      `Generated by MYCE on ${generated}  -  Page ${page + 1} of ${pdf.pageCount}`,
      { size: 8, color: MUTED },
      page,
    );
  }

  return pdf.toBytes();
}
