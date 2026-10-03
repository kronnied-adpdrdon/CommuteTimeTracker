import { describe, expect, it } from 'vitest';
import { SCENARIOS, onLastWeekday, runScenario } from './scenarios';

describe('onLastWeekday', () => {
  it('uses today on a weekday', () => {
    const wednesday = new Date(2026, 9, 7, 15, 0).getTime();
    expect(onLastWeekday(wednesday, '08:40')).toBe(new Date(2026, 9, 7, 8, 40).getTime());
  });
  it('goes back to Friday at the weekend', () => {
    const sunday = new Date(2026, 9, 4, 9, 0).getTime();
    expect(onLastWeekday(sunday, '08:00')).toBe(new Date(2026, 9, 2, 8, 0).getTime());
  });
});

describe('SCENARIOS', () => {
  it('every scenario starts by leaving a place', () => {
    for (const s of SCENARIOS) expect(s.steps[0]).toMatchObject({ event: 'exit' });
  });
});

describe('runScenario', () => {
  it('runs every step in order on the last weekday and returns the last decision', async () => {
    const calls: string[] = [];
    const wednesday = new Date(2026, 9, 7, 15, 0).getTime();
    const decision = await runScenario(
      SCENARIOS[0],
      async (event, place, at) => {
        calls.push(`${event} ${place} ${new Date(at).getHours()}:${new Date(at).getMinutes()}`);
        return { action: event === 'enter' ? 'KEEP' : 'START', reason: 'test' };
      },
      wednesday,
    );
    expect(calls).toEqual(['exit home 8:0', 'enter office 8:40']);
    expect(decision.action).toBe('KEEP');
  });

  it('stops at the first step that ends things, so the real reason is shown', async () => {
    const calls: string[] = [];
    const decision = await runScenario(SCENARIOS[0], async (event) => {
      calls.push(event);
      return { action: 'NONE', reason: 'not-ready' };
    });
    expect(calls).toEqual(['exit']);
    expect(decision.reason).toBe('not-ready');
  });
});
