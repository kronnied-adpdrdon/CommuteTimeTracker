import { describe, expect, it } from 'vitest';
import { AutoState, pausedReason } from './index';
import { DEFAULT_AUTO_SETTINGS } from './settings';

const state = (patch: Partial<AutoState>, enabled = true): AutoState => ({
  settings: { ...DEFAULT_AUTO_SETTINGS, enabled },
  loaded: true,
  background: true,
  supported: true,
  accuracy: true,
  ...patch,
});

describe('automatic start and stop paused', () => {
  it('is not paused when everything is on', () => {
    expect(pausedReason(state({}))).toBeNull();
  });

  it('is paused when Location Accuracy is off', () => {
    expect(pausedReason(state({ accuracy: false }))).toBe('accuracy');
  });

  it('asks for the permission first when both are missing', () => {
    expect(pausedReason(state({ background: false, accuracy: false }))).toBe('permission');
  });

  it('says nothing while switched off or not checked yet', () => {
    expect(pausedReason(state({ accuracy: false }, false))).toBeNull();
    expect(pausedReason(state({ accuracy: null, background: null }))).toBeNull();
  });
});
