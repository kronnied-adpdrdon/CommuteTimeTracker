import { describe, expect, it } from 'vitest';
import { widgetAction } from './widget';

describe('widgetAction', () => {
  it('reads the widget links', () => {
    expect(widgetAction('commutetracker://start')).toBe('start');
    expect(widgetAction('commutetracker://stop')).toBe('stop');
    expect(widgetAction('commutetracker://open')).toBe('open');
  });
  it('ignores anything else', () => {
    expect(widgetAction('https://example.com/start')).toBeNull();
    expect(widgetAction('commutetracker://delete-everything')).toBeNull();
    expect(widgetAction('commutetracker://starts')).toBeNull();
  });
});
