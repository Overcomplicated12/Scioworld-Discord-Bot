import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { store } from '../store.js';
import { formatCollectible, requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('inventory').setDescription('View your currencies, resources, and collectibles.');

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const profile = store.getOrCreate(interaction.guildId, interaction.user.id);
  const resources = Object.entries(profile.resources).map(([name, count]) => `${formatCollectible(name)} ×${count}`).join(', ') || 'None';
  const collectibles = profile.collectibles.map(formatCollectible).join(', ') || 'None';
  await interaction.reply({ content: `**Your inventory**\nSciocoins: **${profile.coins}**\nKnowledge points: **${profile.knowledgePoints}**\nResources: ${resources}\nCollectibles: ${collectibles}`, flags: MessageFlags.Ephemeral });
}
