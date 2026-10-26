import { WrapSummary } from './wraps';

/**
 * The Wrap's cards, in order, and the colour each one takes. Shared by the Wrap screen and the share images, so
 * an image of a card always looks like the card.
 */

export type WrapCardId = 'intro' | 'distance' | 'time' | 'office' | 'months' | 'fastest' | 'personality' | 'share';

/** The app's three Metro Line surfaces. */
export type CardTheme = 'asphalt' | 'amber' | 'concrete';

export interface WrapCardInfo {
  id: WrapCardId;
  theme: CardTheme;
  /** Which arrangement of background glows (`GLOWS`) the card has, so neighbouring cards never look alike. */
  glow: number;
}

/** One soft glow: centre as a share of the card's width (x) and height (y), size as a share of its width. */
export interface Glow {
  x: number;
  y: number;
  size: number;
  /** Which of the theme's three glow colours. */
  tone: 0 | 1 | 2;
}

/**
 * Background glows, like city lights through a windscreen at night. On screen they drift slowly; in share images
 * they stay where they are here.
 */
export const GLOWS: Glow[][] = [
  [{ x: 0.05, y: 0.08, size: 1.3, tone: 0 }, { x: 1.0, y: 0.55, size: 1.1, tone: 1 }, { x: 0.15, y: 1.0, size: 1.0, tone: 2 }],
  [{ x: 0.95, y: 0.1, size: 1.2, tone: 1 }, { x: 0.0, y: 0.6, size: 1.2, tone: 0 }, { x: 0.85, y: 1.0, size: 0.9, tone: 2 }],
  [{ x: 0.5, y: 0.0, size: 1.4, tone: 0 }, { x: 0.0, y: 0.9, size: 1.0, tone: 2 }, { x: 1.0, y: 0.75, size: 1.0, tone: 1 }],
  [{ x: 0.0, y: 0.3, size: 1.1, tone: 2 }, { x: 0.9, y: 0.35, size: 1.2, tone: 0 }, { x: 0.45, y: 1.05, size: 1.3, tone: 1 }],
];

/** The cards this Wrap has: some only appear with something to show (a route, office days, a quickest month). */
export function wrapCards(s: WrapSummary): WrapCardInfo[] {
  const cards: { id: WrapCardId; theme?: CardTheme }[] = [{ id: 'intro', theme: 'asphalt' }];
  if (s.distance) cards.push({ id: 'distance' });
  cards.push({ id: 'time' });
  if (s.officeDays > 0) cards.push({ id: 'office' });
  if (s.quickestMonth) cards.push({ id: 'months' });
  if (s.fastest) cards.push({ id: 'fastest' });
  cards.push({ id: 'personality', theme: 'amber' }, { id: 'share', theme: 'asphalt' });

  // The cards in between take turns, never repeating the card before or matching the fixed card after them.
  const cycle: CardTheme[] = ['amber', 'concrete', 'asphalt'];
  let next = 0;
  let previous: CardTheme = 'asphalt';
  return cards.map((card, i) => {
    let theme = card.theme;
    if (!theme) {
      const fixedAfter = cards[i + 1]?.theme;
      for (let tries = 0; tries < cycle.length; tries++) {
        theme = cycle[next++ % cycle.length];
        if (theme !== previous && theme !== fixedAfter) break;
      }
    }
    previous = theme!;
    return { id: card.id, theme: theme!, glow: i % GLOWS.length };
  });
}
