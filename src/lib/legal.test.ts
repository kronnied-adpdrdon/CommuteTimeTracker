import { describe, expect, it } from 'vitest';
import { CONTACT_EMAIL, LEGAL_UPDATED, PRIVACY_POLICY, PUBLISHER_NAME, TERMS, toMarkdown } from './legal';

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

  it('names the publisher and a contact email in both documents, as Google Play requires', () => {
    for (const doc of [PRIVACY_POLICY, TERMS]) {
      const markdown = toMarkdown(doc);
      expect(markdown).toContain(PUBLISHER_NAME);
      expect(markdown).toContain(CONTACT_EMAIL);
    }
  });

  it('renders Markdown', () => {
    const plain = toMarkdown(TERMS);
    expect(plain.startsWith('# Terms and Conditions')).toBe(true);
    expect(plain).toContain('## Pro');
  });
});
