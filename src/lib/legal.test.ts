import { describe, expect, it } from 'vitest';
import { LEGAL_UPDATED, PRIVACY_POLICY, TERMS, toMarkdown } from './legal';

describe('legal documents', () => {
  for (const doc of [PRIVACY_POLICY, TERMS]) {
    it(`${doc.title} is complete and has no leftover placeholders`, () => {
      expect(doc.updated).toBe(LEGAL_UPDATED);
      expect(doc.sections.length).toBeGreaterThan(5);
      for (const section of doc.sections) {
        expect((section.paragraphs?.length ?? 0) + (section.bullets?.length ?? 0)).toBeGreaterThan(0);
      }
      expect(JSON.stringify(doc)).not.toMatch(/\[[A-Z ]+\]/);
    });
  }

  it('privacy policy covers what the app really does', () => {
    const text = JSON.stringify(PRIVACY_POLICY).toLowerCase();
    for (const topic of ['precise location', 'address search', 'openstreetmap', 'bug report', 'google play', 'backup', 'notification', 'children']) {
      expect(text).toContain(topic);
    }
  });

  it('renders Markdown, adding the contact address when given', () => {
    const plain = toMarkdown(TERMS);
    expect(plain.startsWith('# Terms and Conditions')).toBe(true);
    expect(plain).toContain('## Pro');
    expect(toMarkdown(PRIVACY_POLICY, 'help@example.com')).toContain('Email help@example.com');
    expect(plain).not.toContain('help@example.com');
  });
});
