/**
 * A deliberately small PDF writer: built-in Helvetica fonts, text, filled rectangles, circles and polygons,
 * lines, multiple A4 pages. Enough for a commute report without shipping a PDF library.
 */

type Rgb = [number, number, number];

export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;

export interface TextStyle {
  bold?: boolean;
  size?: number;
  color?: Rgb;
}

/** The built-in fonts only cover basic Latin, so swap common typographic characters for plain ones. */
export function toPdfText(value: string): string {
  return value
    .replace(/[–—]/g, '-')
    .replace(/·/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/₹/g, 'Rs ')
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

const num = (n: number) => (Math.round(n * 100) / 100).toString();
const color = ([r, g, b]: Rgb) => `${num(r)} ${num(g)} ${num(b)}`;

export class PdfDocument {
  private pages: string[][] = [];

  constructor() {
    this.addPage();
  }

  get pageCount() {
    return this.pages.length;
  }

  addPage() {
    this.pages.push([]);
  }

  private get ops() {
    return this.pages[this.pages.length - 1];
  }

  /** `y` is measured from the top of the page, like a screen. */
  text(x: number, y: number, value: string, { bold = false, size = 10, color: rgb = [0.1, 0.11, 0.13] }: TextStyle = {}, page?: number) {
    const target = page === undefined ? this.ops : this.pages[page];
    target.push(`BT /${bold ? 'F2' : 'F1'} ${num(size)} Tf ${color(rgb)} rg ${num(x)} ${num(PAGE_HEIGHT - y)} Td (${toPdfText(value)}) Tj ET`);
  }

  rect(x: number, y: number, width: number, height: number, rgb: Rgb) {
    this.ops.push(`${color(rgb)} rg ${num(x)} ${num(PAGE_HEIGHT - y - height)} ${num(width)} ${num(height)} re f`);
  }

  line(x1: number, y1: number, x2: number, y2: number, rgb: Rgb, width = 0.5, round = false) {
    this.ops.push(`${color(rgb)} RG ${num(width)} w ${round ? 1 : 0} J ${num(x1)} ${num(PAGE_HEIGHT - y1)} m ${num(x2)} ${num(PAGE_HEIGHT - y2)} l S`);
  }

  /** A filled circle, drawn as four Bézier quarters. */
  circle(cx: number, cy: number, r: number, rgb: Rgb) {
    const k = 0.5523 * r;
    const y = PAGE_HEIGHT - cy;
    const p = (...xs: number[]) => xs.map(num).join(' ');
    this.ops.push(
      `${color(rgb)} rg ${p(cx + r, y)} m ` +
        `${p(cx + r, y + k, cx + k, y + r, cx, y + r)} c ${p(cx - k, y + r, cx - r, y + k, cx - r, y)} c ` +
        `${p(cx - r, y - k, cx - k, y - r, cx, y - r)} c ${p(cx + k, y - r, cx + r, y - k, cx + r, y)} c f`,
    );
  }

  /** A filled polygon through the given points. */
  polygon(points: [number, number][], rgb: Rgb) {
    const [first, ...rest] = points.map(([x, y]) => `${num(x)} ${num(PAGE_HEIGHT - y)}`);
    this.ops.push(`${color(rgb)} rg ${first} m ${rest.map((pt) => `${pt} l`).join(' ')} h f`);
  }

  toBytes(): Uint8Array {
    const objects: string[] = [];
    const add = (body: string) => objects.push(body);

    add('<< /Type /Catalog /Pages 2 0 R >>');
    const firstPageObject = 5;
    const kids = this.pages.map((_, i) => `${firstPageObject + i * 2} 0 R`).join(' ');
    add(`<< /Type /Pages /Kids [${kids}] /Count ${this.pages.length} >>`);
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    this.pages.forEach((ops, i) => {
      const contentObject = firstPageObject + i * 2 + 1;
      add(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(PAGE_WIDTH)} ${num(PAGE_HEIGHT)}] ` +
          `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObject} 0 R >>`,
      );
      const stream = ops.join('\n');
      add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    });

    // Everything is ASCII, so string length equals byte length for the cross-reference offsets.
    let out = '%PDF-1.4\n';
    const offsets: number[] = [];
    objects.forEach((body, i) => {
      offsets.push(out.length);
      out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });
    const xref = out.length;
    out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    out += offsets.map((o) => `${o.toString().padStart(10, '0')} 00000 n \n`).join('');
    out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    return new TextEncoder().encode(out);
  }
}
