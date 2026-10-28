import { loadLore } from './lore.js';

const { stories, entries } = loadLore();
console.log(`Validated ${stories.length} lore story${stories.length === 1 ? '' : 'ies'} and ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}.`);
