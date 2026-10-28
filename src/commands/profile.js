import { SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { formatCollectible, mentionOrName, requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('profile').setDescription('View a player profile.')
  .addUserOption(option => option.setName('player').setDescription('The player to view').setRequired(false));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const user = interaction.options.getUser('player') || interaction.user;
  const profile = store.getOrCreate(interaction.guildId, user.id);
  const level = Math.floor(profile.knowledgePoints / 100) + 1;
  await interaction.reply(`**${mentionOrName(user)}'s ScioVirtual profile**\nLevel ${level} · ${profile.knowledgePoints} knowledge points · ${profile.streak}-day daily streak\nSciocoins: **${profile.coins}**\nFeatured collectible: **${formatCollectible(profile.equippedCollectible)}**`);
}
