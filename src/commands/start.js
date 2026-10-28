import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('start').setDescription('Create your ScioVirtual player profile.');

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const isNew = !store.hasProfile(interaction.guildId, interaction.user.id);
  store.getOrCreate(interaction.guildId, interaction.user.id);
  const message = isNew
    ? 'Welcome to ScioVirtual! You received 100 Sciocoins, a starter kit, and the Frog of Wisdom. Try `/daily`, `/profile`, or `/trivia` next.'
    : 'Your profile is ready. Try `/daily` for today\'s reward, or `/profile` and `/inventory` to see your progress.';
  await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
}
