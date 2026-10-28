import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { collectibleById, collectibles, rarityLabel } from '../collectibles.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('shop').setDescription('View or buy collectible items.')
  .addStringOption(option => option.setName('item').setDescription('Buy an item by ID').setRequired(false).addChoices(
    ...collectibles.filter(item => item.cost > 0).slice(0, 25).map(item => ({ name: `${item.name} (${item.cost} coins)`, value: item.id })),
  ));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const itemId = interaction.options.getString('item');
  if (!itemId) {
    const lines = collectibles.filter(item => item.cost > 0).map(item => `• ${item.id} — **${item.name}** (${rarityLabel(item.rarity)}, ${item.cost} Sciocoins)\n  ${item.description}`);
    await interaction.reply({ content: `**Collectible shop**\n${lines.join('\n')}` });
    return;
  }
  const item = collectibleById.get(itemId);
  if (!item || item.cost <= 0) {
    await interaction.reply({ content: 'That item is not available in the shop.', flags: MessageFlags.Ephemeral });
    return;
  }
  const result = store.buyCollectible(interaction.guildId, interaction.user.id, itemId, item.cost);
  if (!result.purchased) {
    const message = result.reason === 'owned' ? `You already own **${item.name}**.` : `You need **${result.costNeeded}** more Sciocoins to buy **${item.name}**.`;
    await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply(`Purchased **${item.name}** for **${item.cost} Sciocoins**! It is now in your inventory.`);
}
