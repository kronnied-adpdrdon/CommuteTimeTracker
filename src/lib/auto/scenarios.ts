import type { AutoDecision, AutoEvent, AutoPlace } from '.';

export interface ScenarioStep {
  event: AutoEvent;
  place?: AutoPlace;
  /** Clock time on the scenario day, e.g. "08:40". */
  clock: string;
}

export interface Scenario {
  id: string;
  label: string;
  /** What the rules should decide, shown next to what they did. */
  expect: string;
  steps: ScenarioStep[];
}

/** Developer tools: pretend crossings that exercise each rule. */
export const SCENARIOS: Scenario[] = [
  {
    id: 'commute',
    label: 'Commute to work',
    expect: 'kept, 08:00 to 08:40',
    steps: [
      { event: 'exit', place: 'home', clock: '08:00' },
      { event: 'enter', place: 'office', clock: '08:40' },
    ],
  },
  {
    id: 'evening',
    label: 'Commute home',
    expect: 'kept, 17:30 to 18:20',
    steps: [
      { event: 'exit', place: 'office', clock: '17:30' },
      { event: 'enter', place: 'home', clock: '18:20' },
    ],
  },
  {
    id: 'errand',
    label: 'Errand, back home',
    expect: 'dropped: returned',
    steps: [
      { event: 'exit', place: 'home', clock: '08:00' },
      { event: 'enter', place: 'home', clock: '08:25' },
    ],
  },
  {
    id: 'short',
    label: 'Under 5 minutes',
    expect: 'dropped: too-short',
    steps: [
      { event: 'exit', place: 'home', clock: '08:00' },
      { event: 'enter', place: 'office', clock: '08:03' },
    ],
  },
  {
    id: 'never',
    label: 'Never arrives',
    expect: 'dropped: expired',
    steps: [
      { event: 'exit', place: 'home', clock: '08:00' },
      { event: 'check', clock: '11:30' },
    ],
  },
  {
    id: 'afternoon',
    label: 'Leaves at 2 pm',
    expect: 'ignored: outside-window',
    steps: [{ event: 'exit', place: 'home', clock: '14:00' }],
  },
];

/** The most recent Monday to Friday (today, if it is one) at a clock time like "08:40". */
export function onLastWeekday(now: number, clock: string): number {
  const [hours, minutes] = clock.split(':').map(Number);
  const d = new Date(now);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  d.setHours(hours, minutes, 0, 0);
  return d.getTime();
}

/**
 * Runs the steps in order on the last weekday. Stops at the first decision that isn't "waiting", since
 * later steps have nothing left to act on, and returns it.
 */
export async function runScenario(
  scenario: Scenario,
  simulate: (event: AutoEvent, place: AutoPlace | undefined, at: number) => Promise<AutoDecision>,
  now: number = Date.now(),
): Promise<AutoDecision> {
  let decision: AutoDecision | null = null;
  for (const step of scenario.steps) {
    decision = await simulate(step.event, step.place, onLastWeekday(now, step.clock));
    if (decision.action !== 'START') break;
  }
  return decision!;
}
