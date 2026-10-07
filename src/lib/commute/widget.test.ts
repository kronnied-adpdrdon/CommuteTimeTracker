import { describe, expect, it } from 'vitest';
import { widgetAction } from './widget';

describe('widgetAction', () => {
  it('reads the widget links', () => {
    expect(widgetAction('myce://start')).toBe('start');
    expect(widgetAction('myce://stop')).toBe('stop');
    expect(widgetAction('myce://open')).toBe('open');
  });
  it('ignores anything else', () => {
    expect(widgetAction('https://example.com/start')).toBeNull();
    expect(widgetAction('myce://delete-everything')).toBeNull();
    expect(widgetAction('myce://starts')).toBeNull();
  });
});
