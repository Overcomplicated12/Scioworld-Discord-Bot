export const collectibles = [
  { id: 'frog-of-wisdom', name: 'Frog of Wisdom', rarity: 'special', description: 'A thoughtful frog with excellent timing.', cost: 0 },
  { id: 'camp-sticker', name: 'Camp Sticker', rarity: 'common', description: 'A little piece of camp spirit.', cost: 40 },
  { id: 'pocket-beaker', name: 'Pocket Beaker', rarity: 'common', description: 'Small glassware for large hypotheses.', cost: 50 },
  { id: 'star-map', name: 'Star Map', rarity: 'uncommon', description: 'A map for getting lost in more interesting places.', cost: 90 },
  { id: 'mystery-badge', name: 'Mystery Badge', rarity: 'uncommon', description: 'Nobody knows what it means, including the badge.', cost: 100 },
  { id: 'camp-compass', name: 'Camp Compass', rarity: 'rare', description: 'Points toward adventure, snacks, or both.', cost: 160 },
  { id: 'golden-goggles', name: 'Golden Goggles', rarity: 'rare', description: 'Makes every hypothesis look slightly more convincing.', cost: 200 },
  { id: 'artifact-shard', name: 'Artifact Shard', rarity: 'epic', description: 'A fragment of a story nobody has finished yet.', cost: 300 },
  { id: 'sciovirtual-crown', name: 'Sciovirtual Crown', rarity: 'legendary', description: 'A ceremonial crown for people who ask excellent questions.', cost: 500 },
];

export const collectibleById = new Map(collectibles.map(item => [item.id, item]));
export const drawOdds = [
  ['common', 55], ['uncommon', 25], ['rare', 13], ['epic', 6], ['legendary', 1],
];

export function itemName(id) { return collectibleById.get(id)?.name || id.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' '); }
export function rarityLabel(rarity) { return rarity[0].toUpperCase() + rarity.slice(1); }
