import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('start').setDescription('Create your ScioVirtual player profile.');

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const isNew = !store.hasProfile(interaction.guildId, interaction.user.id);
  store.getOrCreate(interaction.guildId, interaction.user.id);
  const message = isNew
    ? 'Welcome to ScioVirtual! You received 100 Sciocoins, a starter kit, and the Frog of Wisdom. Try `/weekly` for the science activity and `/passport view` for seasonal progress. There is no daily attendance requirement.'
    : 'Your profile is ready. Try `/weekly` and `/passport view`, or `/inventory` to see your collection.';
  await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
}
