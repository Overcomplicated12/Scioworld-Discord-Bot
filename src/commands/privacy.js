import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('privacy').setDescription('Control your visibility and camp participation.')
  .addStringOption(option => option.setName('scope').setDescription('What should be hidden?').setRequired(true).addChoices(
    { name: 'Leaderboard', value: 'leaderboard' }, { name: 'Public recognition', value: 'recognition' }, { name: 'Camp features', value: 'camp' },
  ))
  .addBooleanOption(option => option.setName('hide').setDescription('Hide this information or feature').setRequired(true));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const scope = interaction.options.getString('scope');
  const hide = interaction.options.getBoolean('hide');
  store.setPrivacy(interaction.guildId, interaction.user.id, scope, hide);
  const labels = { leaderboard: 'leaderboards', recognition: 'public recognition', camp: 'camp features' };
  await interaction.reply({ content: hide ? `You are now hidden from ${labels[scope]}.` : `You are visible for ${labels[scope]} again.`, flags: MessageFlags.Ephemeral });
}
