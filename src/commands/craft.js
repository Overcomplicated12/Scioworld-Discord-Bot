import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { collectibleById, collectibles, itemName } from '../collectibles.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const recipes = new Map([
  ['star-map', { resource: 'starter-kit', count: 2, coins: 25 }],
  ['camp-compass', { resource: 'starter-kit', count: 3, coins: 50 }],
  ['artifact-shard', { resource: 'starter-kit', count: 4, coins: 100 }],
]);
export const data = new SlashCommandBuilder().setName('craft').setDescription('Craft a collectible from resources and Sciocoins.')
  .addStringOption(option => option.setName('item').setDescription('Collectible to craft').setRequired(true).addChoices(...collectibles.filter(item => recipes.has(item.id)).map(item => ({ name: item.name, value: item.id }))));
export async function execute(interaction) { if (!requireGuild(interaction)) return; const item = interaction.options.getString('item'); const recipe = recipes.get(item); const result = store.craftCollectible(interaction.guildId, interaction.user.id, item, recipe.resource, recipe.count, recipe.coins); if (!result.crafted) { const messages = { owned: `You already own **${itemName(item)}**.`, 'missing-resource': `You need ${recipe.count} Starter Kits.`, 'insufficient-coins': `You need ${result.costNeeded} more Sciocoins.` }; await interaction.reply({ content: messages[result.reason], flags: MessageFlags.Ephemeral }); return; } await interaction.reply(`Crafted **${itemName(item)}** for ${recipe.count} Starter Kits and ${recipe.coins} Sciocoins.`); }
