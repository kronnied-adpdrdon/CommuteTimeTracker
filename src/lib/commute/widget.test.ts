import { describe, expect, it } from 'vitest';
import { isWidgetLink } from './widget';

describe('isWidgetLink', () => {
  it('reads the widget link', () => {
    expect(isWidgetLink('myce://start')).toBe(true);
  });
  it('ignores anything else', () => {
    expect(isWidgetLink('myce://stop')).toBe(false);
    expect(isWidgetLink('myce://open')).toBe(false);
    expect(isWidgetLink('https://example.com/start')).toBe(false);
    expect(isWidgetLink('myce://delete-everything')).toBe(false);
    expect(isWidgetLink('myce://starts')).toBe(false);
  });
});
