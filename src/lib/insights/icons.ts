/**
 * Line icons for Insights and the Wraps, on the same 24-unit grid and 2-unit stroke as the rest of the app's
 * icons. Plain SVG path data, so the screens draw them as <path> and the share card draws the same shapes on its
 * canvas (Path2D). No emoji: they'd render differently on every phone and clash with the Metro Line look.
 */
export const ICONS = {
  /** Early Bird: the sun coming up over the road. */
  sunrise: 'M12 3v3M5.6 7.6 7 9M18.4 7.6 17 9M2 16h20M7 16a5 5 0 0 1 10 0M6 20h12',
  /** Steady: a target. */
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 1 0 0-9zM12 11.2a.8.8 0 1 0 0 1.6.8.8 0 1 0 0-1.6z',
  /** Friday Flyer, and fastest trips. */
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  /** Night Owl. */
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  /** Long Hauler: a road running into the distance. */
  road: 'M9 3 4 21M15 3l5 18M12 4v3M12 11v3M12 18v2',
  /** The Regular. */
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  /** Distance: two stops joined by a route. */
  route: 'M6 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 16v-4a4 4 0 0 1 4-4h5.5',
  /** Time: a film strip, for "movies' worth". */
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4',
  /** Office days. */
  building: 'M4 21V5l8-3v19M12 9h8v12M8 7v.01M8 11v.01M8 15v.01M16 13v.01M16 17v.01M2 21h20',
  /** Going vs coming back. */
  swap: 'M4 8h15l-4-4M20 16H5l4 4',
  /** Wraps: monthly, yearly, first month. */
  calendar: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 2v4M8 2v4M3 10h18',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
  flag: 'M5 21V4M5 4h12l-2.5 4L17 12H5',
  /** Everyday comparisons on Insights. */
  bridge: 'M2 17h20M4 17V8M20 17V8M4 8q8 8 16 0M8 17v-4.5M12 17v-3M16 17v-4.5',
  train: 'M6 3h12a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM4 11h16M8 15h.01M16 15h.01M7 21l2-3M17 21l-2-3',
  wave: 'M2 15q2.5-3 5 0t5 0 5 0 5 0M2 20q2.5-3 5 0t5 0 5 0 5 0M17 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  medal: 'M8 2l2.5 6M16 2l-2.5 6M12 21a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 12.5v5M10.5 14l1.5-1.5',
  river: 'M2 7q2.5-3 5 0t5 0 5 0 5 0M2 13q2.5-3 5 0t5 0 5 0 5 0M2 19q2.5-3 5 0t5 0 5 0 5 0',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18',
  music: 'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  headphones: 'M3 18v-6a9 9 0 0 1 18 0v6M3 18a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2zM21 18a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2z',
  ball: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM8.5 4.2c2 4.5 2 11.1 0 15.6M15.5 4.2c-2 4.5-2 11.1 0 15.6',
  football: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM12 7.5l3.5 2.5-1.3 4h-4.4l-1.3-4zM12 3v4.5M15.5 10l4.5-1.5M14.2 14l2.8 4.5M9.8 14 7 18.5M8.5 10 4 8.5',
  plane: 'M2 12.5 22 4l-6.5 17-4-7.5zM11.5 13.5 22 4',
  rocket: 'M12 2c3 2.5 4.5 6 4.5 10v5h-9v-5c0-4 1.5-7.5 4.5-10zM7.5 13 4 16v4l3.5-3M16.5 13l3.5 3v4l-3.5-3M10 21h4M12 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  satellite: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM3.5 9.5q8.5 5 17 0M14 4.5l2 1.5-1 1.5-2-1.5z',
} as const;

export type IconName = keyof typeof ICONS;
