import { formatDayLabel, formatDurationWords } from '../trips/format';
import {
  AMBER,
  Ctx,
  GO,
  INK,
  PAD,
  PALETTES,
  Palette,
  SQUARE,
  STORY,
  background,
  circle,
  eyebrow,
  fit,
  font,
  footer,
  header,
  icon,
  loadFonts,
  newCanvas,
  paragraph,
  roundRect,
  sign,
  wrapLines,
} from './canvas';
import { WrapCardId, WrapCardInfo, wrapCards } from './cards';
import { Analogy, formatHours } from './equivalents';
import { IconName } from './icons';
import { weekdayName, weekdayOf } from './stats';
import { WrapSummary, wrapName } from './wraps';

export { HASHTAG, toPng } from './canvas';

/**
 * The Wrap's share images, drawn on the phone: nothing is uploaded. One Story image per card, looking like the card
 * on screen, plus the summary card (Story or square). None shows places, addresses or times of day; only the
 * fastest-trip card shows a date, as the screen does.
 */

export type ShareFormat = 'story' | 'square';

export interface ShareOptions {
  format: ShareFormat;
  /** Summary only: shows just the personality and the distance comparison. */
  hideNumbers: boolean;
}

const INNER = STORY.width - PAD * 2;
const km = (meters: number) => Math.round(meters / 1000).toLocaleString('en-IN');

/**
 * The three totals as stops on the app's route line: green start, amber stops, a ring at the end, each number under
 * its stop. Returns the y below the labels.
 */
function routeStats(ctx: Ctx, p: Palette, summary: WrapSummary, x: number, y: number, width: number): number {
  const stats = [
    { value: summary.trips.toLocaleString('en-IN'), label: summary.trips === 1 ? 'trip' : 'trips' },
    { value: km(summary.totalMeters), label: 'km' },
    { value: formatHours(summary.totalSeconds), label: 'on the road' },
  ];
  const column = width / 3;
  const r = 16;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 180, 0, 0.5)';
  ctx.lineWidth = 6;
  ctx.setLineDash([22, 16]);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = GO;
  circle(ctx, x + r, y, r + 2);
  ctx.fill();
  for (const sx of [x + column + r, x + column * 2 + r]) {
    ctx.fillStyle = AMBER;
    circle(ctx, sx, y, r - 2);
    ctx.fill();
  }
  ctx.strokeStyle = p.ink;
  ctx.fillStyle = p.stops[1];
  ctx.lineWidth = 7;
  circle(ctx, x + width - r, y, r + 2);
  ctx.fill();
  ctx.stroke();

  stats.forEach((s, i) => {
    const sx = x + column * i;
    ctx.fillStyle = p.ink;
    const size = fit(ctx, s.value, 700, 112, 'd', column - 28, 56);
    ctx.fillText(s.value, sx, y + 40 + size * 0.82);
    ctx.fillStyle = p.muted;
    ctx.font = font(600, 34, 'b');
    ctx.fillText(s.label, sx, y + 40 + size * 0.82 + 50);
  });
  return y + 40 + 112 * 0.82 + 50;
}

/** A rounded pill with an icon and text. Returns its height. */
function chip(ctx: Ctx, p: Palette, name: IconName, text: string, x: number, y: number, maxWidth: number, fontSpec: string): number {
  const h = 84;
  ctx.font = fontSpec;
  let label = text;
  while (ctx.measureText(label).width > maxWidth - 120 && label.length > 4) label = `${label.slice(0, -2)}…`;
  const w = Math.min(maxWidth, ctx.measureText(label).width + 124);
  ctx.fillStyle = p.dark ? 'rgba(244, 242, 236, 0.08)' : p.track;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  icon(ctx, name, x + 50, y + h / 2, 36, p.accent, 2.2);
  ctx.fillStyle = p.ink;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + 86, y + h / 2 + 2);
  ctx.textBaseline = 'alphabetic';
  return h;
}

/** The summary: personality on its road sign, the totals on the route line, and a few highlights. */
export async function drawShareCard(summary: WrapSummary, options: ShareOptions): Promise<HTMLCanvasElement> {
  await loadFonts();
  const story = options.format === 'story';
  const { width, height } = story ? STORY : SQUARE;
  const { canvas, ctx } = newCanvas(width, height);
  const p = PALETTES.asphalt;
  const person = summary.personality;
  background(ctx, p, width, height, wrapCards(summary).length - 1);
  header(ctx, p, wrapName(summary.period), story ? 190 : 140);

  if (story) {
    sign(ctx, person.icon, PAD + 115, 520, 200);
    let y = 800;
    ctx.fillStyle = p.ink;
    fit(ctx, person.name, 700, 150, 'd', INNER);
    ctx.fillText(person.name, PAD, y);
    ctx.fillStyle = p.muted;
    ctx.font = font(500, 46, 'b');
    y = paragraph(ctx, options.hideNumbers ? person.tagline : person.line, PAD, y + 80, INNER, 62);

    y += 60;
    if (!options.hideNumbers) y = routeStats(ctx, p, summary, PAD, y, INNER) + 70;

    // As many pills as fit above the footer, most interesting first.
    const chips: [IconName, string][] = [];
    if (summary.distance) chips.push(['route', summary.distance.text]);
    if (!options.hideNumbers) {
      if (summary.officeDays > 0) chips.push(['building', `${summary.officeDays} office ${summary.officeDays === 1 ? 'day' : 'days'}`]);
      if (summary.fastest) chips.push(['bolt', `Fastest: ${formatDurationWords(summary.fastest.durationSeconds)}, on a ${weekdayName(weekdayOf(summary.fastest.startedAt))}`]);
    }
    for (const [name, text] of chips) {
      if (y + 84 > height - 290) break;
      y += chip(ctx, p, name, text, PAD, y, INNER, font(600, 40, 'b')) + 20;
    }
  } else {
    // Square: the sign beside the name, then the route line.
    sign(ctx, person.icon, PAD + 88, 370, 150);
    const textX = PAD + 230;
    ctx.fillStyle = p.ink;
    fit(ctx, person.name, 700, 104, 'd', width - PAD - textX);
    ctx.fillText(person.name, textX, 380);
    ctx.fillStyle = p.muted;
    ctx.font = font(500, 36, 'b');
    paragraph(ctx, options.hideNumbers ? person.tagline : person.line, textX, 440, width - PAD - textX, 46);
    if (!options.hideNumbers) routeStats(ctx, p, summary, PAD, 620, width - PAD * 2);
    else if (summary.distance) chip(ctx, p, 'route', summary.distance.text, PAD, 620, width - PAD * 2, font(600, 38, 'b'));
  }

  footer(ctx, p, width, height, story);
  return canvas;
}

// One Story image per card. Each draws below the header and above the footer, at y 420 to about 1680.

function question(ctx: Ctx, p: Palette, text: string, y: number): number {
  ctx.fillStyle = p.ink;
  ctx.font = font(700, 84, 'd');
  return paragraph(ctx, text, PAD, y, INNER, 90);
}

/** A huge number, with a smaller unit after it. Returns the y of its baseline. */
function huge(ctx: Ctx, p: Palette, value: string, unit: string, y: number, size = 300): number {
  ctx.font = font(700, size * 0.36, 'd');
  const unitWidth = unit ? ctx.measureText(unit).width + 24 : 0;
  ctx.fillStyle = p.ink;
  const s = fit(ctx, value, 700, size, 'd', INNER - unitWidth, 120);
  ctx.fillText(value, PAD, y);
  if (unit) {
    const w = ctx.measureText(value).width;
    ctx.font = font(700, s * 0.36, 'd');
    ctx.fillText(unit, PAD + w + 20, y);
  }
  return y;
}

function answer(ctx: Ctx, p: Palette, text: string, y: number, color = p.ink): number {
  ctx.fillStyle = color;
  ctx.font = font(700, 50, 'b');
  return paragraph(ctx, text, PAD, y, INNER, 66);
}

function note(ctx: Ctx, p: Palette, text: string, y: number): number {
  ctx.fillStyle = p.muted;
  ctx.font = font(500, 42, 'b');
  return paragraph(ctx, text, PAD, y, INNER, 58);
}

function introCard(ctx: Ctx, p: Palette, s: WrapSummary) {
  const year = s.period.kind === 'year';
  eyebrow(ctx, p, year ? 'Your year on the road' : s.period.kind === 'first' ? '30 days since your first trip' : 'Your month on the road', PAD, 520);
  const title = s.period.kind === 'first' ? 'Your first month' : s.period.title;
  ctx.fillStyle = p.ink;
  fit(ctx, title, 700, 190, 'd', INNER);
  ctx.fillText(title, PAD, 700);

  const stops = [
    { value: s.trips.toLocaleString('en-IN'), label: s.trips === 1 ? 'trip' : 'trips' },
    { value: `${km(s.totalMeters)} km`, label: 'travelled' },
    { value: formatHours(s.totalSeconds), label: 'on the road' },
  ];
  const ys = [960, 1190, 1420];
  const x = PAD + 26;
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 180, 0, 0.6)';
  ctx.lineWidth = 8;
  ctx.setLineDash([24, 18]);
  ctx.beginPath();
  ctx.moveTo(x, ys[0]);
  ctx.lineTo(x, ys[2]);
  ctx.stroke();
  ctx.restore();
  stops.forEach((stop, i) => {
    const y = ys[i];
    ctx.fillStyle = p.stops[1];
    circle(ctx, x, y, 40);
    ctx.fill();
    if (i === 2) {
      ctx.strokeStyle = p.ink;
      ctx.lineWidth = 10;
      circle(ctx, x, y, 24);
      ctx.stroke();
    } else {
      ctx.fillStyle = i === 0 ? GO : AMBER;
      circle(ctx, x, y, 28);
      ctx.fill();
    }
    ctx.fillStyle = p.ink;
    ctx.font = font(700, 140, 'd');
    ctx.fillText(stop.value, PAD + 110, y + 40);
    ctx.fillStyle = p.muted;
    ctx.font = font(600, 40, 'b');
    ctx.fillText(stop.label, PAD + 112, y + 100);
  });
  if (s.soFar) note(ctx, p, '1 January to today. It keeps counting until 31 December.', 1600);
}

function distanceCard(ctx: Ctx, p: Palette, s: WrapSummary) {
  const d = s.distance!;
  question(ctx, p, 'How far did you go?', 520);
  huge(ctx, p, km(s.totalMeters), 'km', 800);

  const y = 960;
  if (d.from && d.to) {
    const x0 = PAD + 22;
    const x1 = PAD + INNER - 26;
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.fillStyle = GO;
    circle(ctx, x0, y, 24);
    ctx.fill();
    ctx.fillStyle = p.stops[1];
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 11;
    circle(ctx, x1, y, 24);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = p.ink;
    ctx.font = font(700, 64, 'd');
    ctx.fillText(d.from, PAD, y + 110);
    ctx.textAlign = 'right';
    ctx.fillText(d.to, PAD + INNER, y + 110);
    ctx.textAlign = 'left';
    if (d.times >= 2) {
      const label = `×${d.times}`;
      ctx.font = font(700, 48, 'd');
      const w = ctx.measureText(label).width + 40;
      ctx.fillStyle = p.accent;
      roundRect(ctx, PAD + INNER - w, y + 140, w, 64, 32);
      ctx.fill();
      ctx.fillStyle = p.onAccent;
      ctx.fillText(label, PAD + INNER - w + 20, y + 190);
    }
  } else {
    ctx.save();
    ctx.strokeStyle = p.track;
    ctx.lineWidth = 10;
    ctx.setLineDash([26, 18]);
    circle(ctx, PAD + 110, y + 60, 100);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = p.accent;
    circle(ctx, PAD + 110, y - 40, 22);
    ctx.fill();
  }
  const below = answer(ctx, p, `${d.text}.`, 1240);
  comparisonTiles(ctx, p, s.comparisons.distance, below + 30);
}

/** Lowest y a card's content may reach, leaving clear space above the footer. */
const CONTENT_END = 1650;
const COMPARE_HEIGHT = 262;

/** Up to two comparisons side by side, as on the Wrap screen: icon, big number, what it counts. */
function comparisonTiles(ctx: Ctx, p: Palette, list: Analogy[], y: number) {
  if (list.length === 0 || y + COMPARE_HEIGHT > CONTENT_END) return;
  const gap = 24;
  const w = (INNER - gap) / 2;
  list.slice(0, 2).forEach((a, i) => {
    const x = PAD + i * (w + gap);
    ctx.fillStyle = p.dark ? 'rgba(244, 242, 236, 0.08)' : 'rgba(22, 24, 29, 0.07)';
    roundRect(ctx, x, y, w, COMPARE_HEIGHT, 30);
    ctx.fill();
    icon(ctx, a.icon, x + 56, y + 54, 50, p.accent, 2.2);
    ctx.fillStyle = p.ink;
    fit(ctx, a.value, 700, 96, 'd', w - 64);
    ctx.fillText(a.value, x + 32, y + 158);
    ctx.fillStyle = p.muted;
    ctx.font = font(500, 34, 'b');
    const lines = wrapLines(ctx, a.label, w - 64);
    lines.slice(0, 2).forEach((line, l) => ctx.fillText(l === 1 && lines.length > 2 ? `${line}…` : line, x + 32, y + 204 + l * 38));
  });
}

function timeCard(ctx: Ctx, p: Palette, s: WrapSummary) {
  question(ctx, p, 'How long were you on the road?', 560);
  const baseline = huge(ctx, p, formatHours(s.totalSeconds), '', 920);
  const below = answer(ctx, p, "That's time enough for:", baseline + 130);
  comparisonTiles(ctx, p, s.comparisons.time, below + 30);
}

/** One bar per month, the highlighted one solid and the rest faded; dashed outlines for months with nothing. */
function monthBars(ctx: Ctx, p: Palette, values: (number | null)[], labels: string[], highlight: number, top: number, height: number) {
  const max = Math.max(1, ...values.map((v) => v ?? 0));
  const n = values.length;
  const gap = 14;
  const w = (INNER - gap * (n - 1)) / n;
  values.forEach((v, i) => {
    const x = PAD + i * (w + gap);
    const h = v === null || v === 0 ? 10 : Math.max(16, (v / max) * height);
    if (v === null || v === 0) {
      ctx.save();
      ctx.strokeStyle = p.track;
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 8]);
      ctx.strokeRect(x + 2, top + height - h, w - 4, h);
      ctx.restore();
    } else {
      ctx.globalAlpha = i === highlight ? 1 : 0.5;
      ctx.fillStyle = p.accent;
      roundRect(ctx, x, top + height - h, w, h, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = p.muted;
    ctx.font = font(700, 32, 'b');
    ctx.textAlign = 'center';
    ctx.fillText(labels[i], x + w / 2, top + height + 50);
    ctx.textAlign = 'left';
  });
}

function officeCard(ctx: Ctx, p: Palette, s: WrapSummary) {
  question(ctx, p, 'How often did you go in?', 560);
  huge(ctx, p, String(s.officeDays), 'office days', 820, 240);
  if (s.months) {
    const busiest = s.months.findIndex((m) => m.name === s.busiestMonth?.name);
    monthBars(ctx, p, s.months.map((m) => m.officeDays), s.months.map((m) => m.name[0]), busiest, 940, 460);
    if (s.busiestMonth) answer(ctx, p, `Busiest month: ${s.busiestMonth.name}, with ${s.busiestMonth.officeDays} office days.`, 1560);
    return;
  }
  const calendar = s.calendar ?? [];
  const cell = 104;
  const gap = 14;
  const top = 920;
  ctx.font = font(700, 32, 'b');
  ctx.textAlign = 'center';
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((d, i) => {
    ctx.fillStyle = p.muted;
    ctx.fillText(d, PAD + i * (cell + gap) + cell / 2, top);
  });
  const offset = calendar.length ? weekdayOf(calendar[0].dayStart) - 1 : 0;
  calendar.forEach((day, i) => {
    const slot = i + offset;
    const x = PAD + (slot % 7) * (cell + gap);
    const y = top + 30 + Math.floor(slot / 7) * (cell + gap);
    roundRect(ctx, x, y, cell, cell, 18);
    if (day.office) {
      ctx.fillStyle = AMBER;
      ctx.fill();
    } else {
      ctx.strokeStyle = p.track;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.fillStyle = day.office ? INK : p.muted;
    ctx.font = font(600, 34, 'b');
    ctx.fillText(String(new Date(day.dayStart).getDate()), x + cell / 2, y + cell / 2 + 12);
  });
  ctx.textAlign = 'left';
}

function monthsCard(ctx: Ctx, p: Palette, s: WrapSummary) {
  const months = s.months ?? [];
  question(ctx, p, 'Your quickest month', 560);
  ctx.fillStyle = p.ink;
  fit(ctx, s.quickestMonth!.name, 700, 200, 'd', INNER);
  ctx.fillText(s.quickestMonth!.name, PAD, 780);
  const quickest = months.findIndex((m) => m.name === s.quickestMonth!.name);
  monthBars(ctx, p, months.map((m) => m.avgSeconds), months.map((m) => m.name[0]), quickest, 900, 480);
  answer(ctx, p, `${formatDurationWords(s.quickestMonth!.avgSeconds)} a trip on average, your best all year.`, 1520);
}

function fastestCard(ctx: Ctx, p: Palette, s: WrapSummary) {
  const f = s.fastest!;
  question(ctx, p, 'Your personal best', 560);
  const cx = STORY.width / 2;
  const cy = 960;
  const r = 270;
  ctx.lineWidth = 46;
  ctx.lineCap = 'round';
  ctx.strokeStyle = p.track;
  circle(ctx, cx, cy, r);
  ctx.stroke();
  const share = s.avgSeconds ? Math.min(1, f.durationSeconds / s.avgSeconds) : 1;
  ctx.strokeStyle = p.accent;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = p.ink;
  ctx.textAlign = 'center';
  ctx.font = font(700, 230, 'd');
  ctx.fillText(String(Math.floor(f.durationSeconds / 60)), cx, cy + 60);
  ctx.fillStyle = p.muted;
  ctx.font = font(800, 38, 'b');
  ctx.fillText('MINUTES', cx, cy + 130);
  ctx.textAlign = 'left';

  const way = f.direction === 'work' ? ' to work' : f.direction === 'home' ? ' home' : '';
  icon(ctx, 'bolt', PAD + 26, 1356, 52, p.accent, 2.2);
  ctx.fillStyle = p.ink;
  ctx.font = font(700, 50, 'b');
  const y = paragraph(ctx, `Your fastest trip${way}, ${formatDayLabel(f.startedAt)}.`, PAD + 76, 1374, INNER - 76, 66);
  const saved = s.avgSeconds ? s.avgSeconds - f.durationSeconds : 0;
  if (saved >= 60) note(ctx, p, `${formatDurationWords(saved)} quicker than your usual ${formatDurationWords(s.avgSeconds!)}.`, y + 10);
}

function personalityCard(ctx: Ctx, p: Palette, s: WrapSummary) {
  const year = s.period.kind === 'year';
  const person = s.personality;
  eyebrow(ctx, p, year ? 'Your commuter personality of the year' : 'Your commuter personality', PAD, 520);
  sign(ctx, person.icon, PAD + 190, 830, 280, p === PALETTES.amber);
  ctx.fillStyle = p.ink;
  fit(ctx, person.name, 700, 190, 'd', INNER);
  ctx.fillText(person.name, PAD, 1250);
  const y = answer(ctx, p, person.line, 1350);
  if (!year && s.officeDays > 0 && person.id !== 'regular') {
    chip(ctx, p, 'building', s.officeDays === 1 ? '1 office day' : `${s.officeDays} office days`, PAD, y + 20, INNER, font(700, 40, 'b'));
  }
}

const DRAW: Record<Exclude<WrapCardId, 'share'>, (ctx: Ctx, p: Palette, s: WrapSummary) => void> = {
  intro: introCard,
  distance: distanceCard,
  time: timeCard,
  office: officeCard,
  months: monthsCard,
  fastest: fastestCard,
  personality: personalityCard,
};

/** One card as a Story image, in the card's own colours. The last card ("share") is the summary. */
export async function drawCard(summary: WrapSummary, card: WrapCardInfo): Promise<HTMLCanvasElement> {
  if (card.id === 'share') return drawShareCard(summary, { format: 'story', hideNumbers: false });
  await loadFonts();
  const { canvas, ctx } = newCanvas(STORY.width, STORY.height);
  const p = PALETTES[card.theme];
  background(ctx, p, STORY.width, STORY.height, card.glow);
  header(ctx, p, wrapName(summary.period), 190);
  DRAW[card.id](ctx, p, summary);
  footer(ctx, p, STORY.width, STORY.height, true);
  return canvas;
}

/** The whole Wrap as Story images, in order, ending with the summary (numbers hidden if asked). */
export async function drawStory(summary: WrapSummary, hideNumbers: boolean): Promise<HTMLCanvasElement[]> {
  const images: HTMLCanvasElement[] = [];
  for (const card of wrapCards(summary)) {
    images.push(card.id === 'share' ? await drawShareCard(summary, { format: 'story', hideNumbers }) : await drawCard(summary, card));
  }
  return images;
}
