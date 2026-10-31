import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('bot-status').setDescription('Show bot and scheduler health to administrators.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const isAdmin = interaction.guild.ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
  if (!isAdmin) {
    await interaction.reply({ content: 'Only the server owner or an administrator can view bot status.', flags: MessageFlags.Ephemeral });
    return;
  }
  const status = store.getOperationalStatus(interaction.guildId);
  const nextPoll = Math.floor(status.nextPollAt / 1000);
  await interaction.reply({
    content: `**ScioVirtual bot status**\n🏁 Active races: **${status.activeRaces}**\n🚩 Open reports: **${status.openReports}**\n📊 Next weekly poll: <t:${nextPoll}:F>\n🧪 Om challenge: **${status.omActive ? 'active' : status.omTargetId ? 'target configured' : 'no target'}**`,
    flags: MessageFlags.Ephemeral,
  });
}
