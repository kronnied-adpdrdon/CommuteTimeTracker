import { describe, expect, it } from 'vitest';
import { backAction } from './navigation';

describe('Android Back', () => {
  it('on Home, sends the app to the background', () => {
    expect(backAction('/', true)).toEqual({ kind: 'minimize' });
    expect(backAction('/', false)).toEqual({ kind: 'minimize' });
  });

  it('on another tab, goes to Home', () => {
    for (const tab of ['/history', '/insights', '/reports', '/settings', '/settings/']) {
      expect(backAction(tab, true)).toEqual({ kind: 'replace', path: '/' });
    }
  });

  it('on a screen opened from another, goes back to it', () => {
    expect(backAction('/settings/places', true)).toEqual({ kind: 'history' });
    expect(backAction('/pricing', true)).toEqual({ kind: 'history' });
  });

  it('with nothing behind it, goes up to Settings or Home', () => {
    expect(backAction('/settings/sharing', false)).toEqual({ kind: 'replace', path: '/settings' });
    expect(backAction('/terms/', false)).toEqual({ kind: 'replace', path: '/settings' });
    expect(backAction('/pricing', false)).toEqual({ kind: 'replace', path: '/' });
    expect(backAction('/wrap', false)).toEqual({ kind: 'replace', path: '/insights' });
  });
});
