import { CardTheme, GLOWS } from './cards';
import { ICONS, IconName } from './icons';

/**
 * Drawing helpers for the Wrap's share images: the card colours, fonts, icons, the road sign and the route line,
 * all matching the Wrap screens (app/wrap/wrap.module.css). Colours are fixed, like on the screens.
 */

export type Ctx = CanvasRenderingContext2D;

export const STORY = { width: 1080, height: 1920 };
export const SQUARE = { width: 1080, height: 1080 };
/** Left and right margin on every image. */
export const PAD = 88;

export const AMBER = '#ffb400';
export const INK = '#16181d';
export const GO = '#43da8b';

export interface Palette {
  /** Background gradient, top-left to bottom-right. */
  stops: [string, string, string];
  ink: string;
  muted: string;
  accent: string;
  track: string;
  onAccent: string;
  /** The three background glow colours (`GLOWS`' tones), each fading to nothing at its edge. */
  glows: [string, string, string];
  /** Dark cards use amber for "MYCE" and the footer; light ones use their ink. */
  dark: boolean;
}

/** The same three surfaces as the Wrap screens' .asphalt, .amber and .concrete. */
export const PALETTES: Record<CardTheme, Palette> = {
  asphalt: {
    stops: ['#1d2129', '#14171d', '#0b0d10'],
    ink: '#f4f2ec',
    muted: 'rgba(244, 242, 236, 0.68)',
    accent: AMBER,
    track: 'rgba(244, 242, 236, 0.22)',
    onAccent: INK,
    glows: ['rgba(255, 180, 0, 0.34)', 'rgba(255, 112, 40, 0.22)', 'rgba(63, 120, 207, 0.24)'],
    dark: true,
  },
  amber: {
    stops: ['#ffc21f', '#ffb400', '#f5a300'],
    ink: INK,
    muted: 'rgba(22, 24, 29, 0.72)',
    accent: INK,
    track: 'rgba(22, 24, 29, 0.2)',
    onAccent: AMBER,
    glows: ['rgba(255, 240, 190, 0.75)', 'rgba(240, 120, 0, 0.5)', 'rgba(255, 214, 90, 0.8)'],
    dark: false,
  },
  concrete: {
    stops: ['#f7f6f3', '#f2f1ee', '#ebe8e1'],
    ink: INK,
    muted: '#565b64',
    accent: '#8a5f00',
    track: 'rgba(22, 24, 29, 0.14)',
    onAccent: '#ffffff',
    glows: ['rgba(255, 196, 64, 0.38)', 'rgba(255, 255, 255, 0.95)', 'rgba(214, 200, 172, 0.55)'],
    dark: false,
  },
};

let families: { display: string; body: string } | null = null;

/** The font families next/font bundled with the app, read from the CSS variables in layout.tsx. */
function fontFamilies(): { display: string; body: string } {
  if (families) return families;
  const css = getComputedStyle(document.documentElement);
  families = {
    display: css.getPropertyValue('--font-barlow-condensed').trim() || "'Arial Narrow', sans-serif",
    body: css.getPropertyValue('--font-barlow').trim() || 'sans-serif',
  };
  return families;
}

/** A canvas font: weight, size in px, and Barlow Condensed ('d', display) or Barlow ('b', body). */
export function font(weight: number, size: number, family: 'd' | 'b'): string {
  const f = fontFamilies();
  return `${weight} ${size}px ${family === 'd' ? f.display : f.body}`;
}

/** A font not yet used on screen isn't loaded, and a canvas won't wait for it. */
export async function loadFonts(): Promise<void> {
  await Promise.all(
    [font(700, 100, 'd'), font(500, 40, 'b'), font(600, 40, 'b'), font(700, 40, 'b'), font(800, 40, 'b')].map((f) => document.fonts.load(f).catch(() => [])),
  );
}

export function newCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  return { canvas, ctx };
}

/** Splits `text` into lines no wider than `maxWidth` with the context's current font. */
export function wrapLines(ctx: Ctx, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws text that may wrap; returns the y below the last line. */
export function paragraph(ctx: Ctx, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  for (const line of wrapLines(ctx, text, maxWidth)) {
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

/** Sets the largest font (up to `size`) at which `text` fits in `maxWidth`; returns that size. */
export function fit(ctx: Ctx, text: string, weight: number, size: number, family: 'd' | 'b', maxWidth: number, min = 40): number {
  ctx.font = font(weight, size, family);
  while (ctx.measureText(text).width > maxWidth && size > min) ctx.font = font(weight, (size -= 4), family);
  return size;
}

export function setSpacing(ctx: Ctx, px: number) {
  // Older WebViews without letterSpacing just draw without it.
  if ('letterSpacing' in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${px}px`;
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

export function circle(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

/** One of the line icons, centred on (cx, cy). */
export function icon(ctx: Ctx, name: IconName, cx: number, cy: number, size: number, color: string, stroke = 2) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = stroke;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D(ICONS[name]));
  ctx.restore();
}

/** The personality's diamond road sign: amber with an ink border line on dark cards, ink with amber on amber ones. */
export function sign(ctx: Ctx, name: IconName, cx: number, cy: number, side: number, onAmber = false) {
  const face = onAmber ? INK : AMBER;
  const line = onAmber ? AMBER : INK;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = face;
  roundRect(ctx, -side / 2, -side / 2, side, side, side * 0.13);
  ctx.fill();
  ctx.strokeStyle = line;
  ctx.lineWidth = side * 0.03;
  const inset = side * 0.07;
  roundRect(ctx, -side / 2 + inset, -side / 2 + inset, side - inset * 2, side - inset * 2, side * 0.09);
  ctx.stroke();
  ctx.restore();
  icon(ctx, name, cx, cy, side * 0.55, line, 2.2);
}

/** The card's colour and its soft glows (arrangement `glow` of `GLOWS`), as on the Wrap screens. */
export function background(ctx: Ctx, p: Palette, width: number, height: number, glow = 0) {
  const bg = ctx.createLinearGradient(0, 0, width * 0.4, height);
  bg.addColorStop(0, p.stops[0]);
  bg.addColorStop(0.55, p.stops[1]);
  bg.addColorStop(1, p.stops[2]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  for (const g of GLOWS[glow % GLOWS.length]) {
    const x = g.x * width;
    const y = g.y * height;
    const r = (g.size * width) / 2;
    const light = ctx.createRadialGradient(x, y, 0, x, y, r);
    light.addColorStop(0, p.glows[g.tone]);
    light.addColorStop(1, p.glows[g.tone].replace(/[\d.]+\)$/, '0)'));
    ctx.fillStyle = light;
    // The whole canvas: the gradient fades out by itself, and a smaller fill leaves a visible edge.
    ctx.fillRect(0, 0, width, height);
  }
}

/** "MYCE" and the Wrap's name at the top. */
export function header(ctx: Ctx, p: Palette, name: string, y: number) {
  ctx.fillStyle = p.dark ? AMBER : p.ink;
  ctx.font = font(700, 64, 'd');
  setSpacing(ctx, 10);
  ctx.fillText('MYCE', PAD, y);
  setSpacing(ctx, 4);
  ctx.fillStyle = p.muted;
  ctx.font = font(700, 32, 'b');
  ctx.fillText(name.toUpperCase(), PAD, y + 58);
  setSpacing(ctx, 0);
}

/** The hashtag on every shared image, and in the caption where the app shared to allows one. */
export const HASHTAG = '#myce';

/** Where to get MYCE, and the hashtag, at the bottom. Plain text: links in images can't be tapped. */
export function footer(ctx: Ctx, p: Palette, width: number, height: number, story: boolean) {
  const y = height - (story ? 190 : 120);
  ctx.fillStyle = p.dark ? AMBER : p.ink;
  ctx.font = font(700, story ? 52 : 44, 'd');
  ctx.fillText('Track your commute with MYCE', PAD, y);
  ctx.textAlign = 'right';
  ctx.font = font(700, story ? 60 : 50, 'd');
  ctx.fillText(HASHTAG, width - PAD, y);
  ctx.textAlign = 'left';
  ctx.fillStyle = p.muted;
  ctx.font = font(500, story ? 36 : 32, 'b');
  ctx.fillText('Free on Google Play', PAD, height - (story ? 136 : 72));
}

/** Small spaced capitals, like the screens' eyebrow lines. */
export function eyebrow(ctx: Ctx, p: Palette, text: string, x: number, y: number) {
  ctx.fillStyle = p.muted;
  ctx.font = font(800, 34, 'b');
  setSpacing(ctx, 5);
  ctx.fillText(text.toUpperCase(), x, y);
  setSpacing(ctx, 0);
}

/** The canvas as PNG bytes, for the share menu. */
export function toPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Could not make the image.'));
      blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
    }, 'image/png');
  });
}
