import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { collectibleById, collectibles, drawOdds, rarityLabel } from '../collectibles.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const DRAW_COST = 50;
const pool = collectibles.filter(item => item.rarity !== 'special');

function drawItem() {
  const roll = Math.random() * 100;
  let threshold = 0;
  const rarity = drawOdds.find(([, odds]) => (threshold += odds) > roll)?.[0] || 'common';
  const options = pool.filter(item => item.rarity === rarity);
  return options[Math.floor(Math.random() * options.length)] || pool[0];
}

export const data = new SlashCommandBuilder().setName('draw').setDescription(`Spend ${DRAW_COST} Sciocoins on a random collectible.`);

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const item = drawItem();
  const result = store.drawCollectible(interaction.guildId, interaction.user.id, item.id, DRAW_COST, Date.now());
  if (!result.drawn) {
    const message = result.reason === 'cooldown'
      ? `The prize machine is resetting. Try again in **${Math.ceil(result.remainingMs / 1000)} seconds**.`
      : `You need **${result.costNeeded}** more Sciocoins. Use `/daily` or `/trivia` to earn more.`;
    await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    return;
  }
  const rarity = rarityLabel(collectibleById.get(item.id).rarity);
  const resultText = result.duplicate
    ? `You drew a duplicate **${item.name}** (${rarity}) and received a **${result.duplicateRefund}-coin duplicate refund**.`
    : `You drew **${item.name}** (${rarity})! ${item.description}`;
  await interaction.reply({ content: `${resultText}\n\nOdds: common 55% · uncommon 25% · rare 13% · epic 6% · legendary 1%` });
}
