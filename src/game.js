// Game balancing is isolated here so non-backend teammates can change it.
export const EXPLORE_COOLDOWN_SECONDS = 120; // Launch demo: two minutes; raise later.

export const MILESTONES = [
  { target: 60, name: 'Town Hall', perk: 'The Frog Republic has a government now. Terrifying.' },
  { target: 150, name: 'Research Lab', perk: 'Scientists may now investigate why the merch is missing.' },
  { target: 300, name: 'Train Station', perk: 'Citizens can travel precisely nowhere, but in style.' },
  { target: 500, name: 'Space Program', perk: 'The frogs have entered their orbital era.' }
];

export function getWorldStatus(points) {
  if (!Number.isInteger(points) || points < 0) throw new RangeError('points must be nonnegative');
  const complete = MILESTONES.filter(m => points >= m.target);
  const next = MILESTONES.find(m => points < m.target);
  if (next) return { level: complete.length, built: complete, next, pointsRemaining: next.target - points };
  const extra = Math.floor((points - 500) / 300);
  const target = 500 + (extra + 1) * 300;
  return { level: MILESTONES.length + extra, built: complete,
    next: { target, name: `Outer Frog Colony ${extra + 1}`, perk: 'Expansion never ends.' },
    pointsRemaining: target - points };
}

export function rollExploration(rng = Math.random) {
  const p = rng();
  if (p < 0.05) return { coins: 30, wood: 0, stone: 1, artifacts: 1, headline: 'You found a suspiciously ancient frog relic.' };
  if (p < 0.28) return { coins: 12, wood: 1, stone: 3, artifacts: 0, headline: 'You found a forgotten quarry.' };
  if (p < 0.60) return { coins: 8, wood: 4, stone: 0, artifacts: 0, headline: 'You scavenged an abandoned forest.' };
  return { coins: 5, wood: 2, stone: 1, artifacts: 0, headline: 'You looted a very ordinary roadside crate.' };
}

export const FROG_QUOTES = [
  'The optimal strategy is whatever makes the directors nervous.',
  'Never trust a frog holding a clipboard.',
  'You cannot lose what you never understood.',
  'A deadline is merely a very aggressive suggestion. (Do not tell the directors I said this.)',
  'Trade wisely. Wood is temporary; frog is forever.'
];
