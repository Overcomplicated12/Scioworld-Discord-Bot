import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';
import { schedulerHealth } from '../health.js';

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
  const client = interaction.client;
  const gateway = client?.ws?.status === 0 ? 'connected' : `status ${client?.ws?.status ?? 'unknown'}`;
  const uptime = client?.uptime ? `${Math.floor(client.uptime / 60_000)}m` : 'unknown';
  const commandCount = client?.application?.commands?.cache?.size || 'not cached';
  const schedulers = Object.entries(schedulerHealth()).map(([name, at]) => `${name}: <t:${Math.floor(at / 1000)}:R>`).join('\n') || 'none recorded';
  await interaction.reply({
    content: `**ScioVirtual bot status**\n🔌 Discord gateway: **${gateway}**\n⏱️ Uptime: **${uptime}**\n🧩 Registered commands: **${commandCount}**\n🏁 Active races: **${status.activeRaces}**\n🚩 Open reports: **${status.openReports}**\n📊 Next weekly poll: <t:${nextPoll}:F>\n🧪 Om challenge: **${status.omActive ? 'active' : status.omTargetId ? 'target configured' : 'no target'}**\n\n**Scheduler runs**\n${schedulers}`,
    flags: MessageFlags.Ephemeral,
  });
}
