import { describe, expect, it } from 'vitest';
import { Trip } from '../trips/types';
import { PdfDocument, toPdfText } from './pdf';
import { buildReportPdf } from './reportPdf';
import { summarize } from './summary';

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe('toPdfText', () => {
  it('replaces characters the built-in fonts cannot draw, and escapes brackets', () => {
    expect(toPdfText('28 Sep – 4 Oct · ₹49 (Pro)')).toBe('28 Sep - 4 Oct - Rs 49 \\(Pro\\)');
  });
});

describe('PdfDocument', () => {
  it('produces a structurally valid PDF whose cross-reference offsets point at each object', () => {
    const doc = new PdfDocument();
    doc.text(40, 40, 'Hello');
    doc.addPage();
    doc.text(40, 40, 'Page two');
    const out = decode(doc.toBytes());
    expect(out.startsWith('%PDF-1.4')).toBe(true);
    expect(out.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(out).toContain('/Count 2');

    const xrefAt = Number(/startxref\n(\d+)/.exec(out)![1]);
    expect(out.slice(xrefAt, xrefAt + 4)).toBe('xref');
    const offsets = [...out.slice(xrefAt).matchAll(/(\d{10}) 00000 n/g)].map((m) => Number(m[1]));
    offsets.forEach((offset, i) => expect(out.slice(offset).startsWith(`${i + 1} 0 obj`)).toBe(true));
  });
});

describe('buildReportPdf', () => {
  const trips: Trip[] = Array.from({ length: 70 }, (_, i) => {
    const startedAt = new Date(2026, 8, 1 + Math.floor(i / 2), i % 2 ? 18 : 8).getTime();
    return { id: String(i), startedAt, endedAt: startedAt + 45 * 60_000, durationSeconds: 2700, distanceMeters: 12400, direction: i % 2 ? 'home' : 'work' };
  });

  it('flows long trip lists onto more pages and numbers them', () => {
    const out = decode(buildReportPdf({ periodLabel: '1 – 30 Sep 2026', generatedAt: Date.now(), summary: summarize(trips), trips }));
    const pages = Number(/\/Count (\d+)/.exec(out)![1]);
    expect(pages).toBeGreaterThan(1);
    expect(out).toContain(`Page ${pages} of ${pages}`);
    expect(out).toContain('(1 - 30 Sep 2026)');
  });

  it('names who it was prepared for, splits out other trips, and marks edited trips', () => {
    const original = { startedAt: 0, endedAt: 0, durationSeconds: 0, distanceMeters: 0, direction: 'work' as const };
    const mixed: Trip[] = [{ ...trips[0], original }, trips[1], { ...trips[2], id: 'x', direction: 'unknown' }];
    const out = decode(buildReportPdf({ periodLabel: 'Sep 2026', generatedAt: Date.now(), summary: summarize(mixed), trips: mixed, preparedFor: '  Asha Rao ' }));
    expect(out).toContain('(Prepared for: Asha Rao)');
    expect(out).toContain('(Other: 1 trip, avg 45 min)');
    // Brackets inside PDF text are escaped: (1 Sep 2026 \(Tue\) *)
    expect(out).toMatch(/\(\d+ Sep 2026 \\\(\w+\\\) \*\)/);
    expect(out).toContain('(* Changed by hand after it was recorded.)');
    expect(out).toContain('(45 min)');
  });

  it('leaves out the optional lines when they do not apply', () => {
    const out = decode(buildReportPdf({ periodLabel: 'Sep 2026', generatedAt: Date.now(), summary: summarize(trips), trips }));
    expect(out).not.toContain('Prepared for');
    expect(out).not.toContain('Other:');
    expect(out).not.toContain('Changed by hand');
  });

  it('an empty period still makes a one-page report', () => {
    const out = decode(buildReportPdf({ periodLabel: '1 Oct 2026', generatedAt: Date.now(), summary: summarize([]), trips: [] }));
    expect(out).toContain('/Count 1');
    expect(out).toContain('No trips in this period.');
  });
});
