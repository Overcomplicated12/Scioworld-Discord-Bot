import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const adminOnly = interaction => interaction.guild?.ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
export const data = new SlashCommandBuilder().setName('reports').setDescription('Review player reports.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(command => command.setName('list').setDescription('List open or closed reports.').addStringOption(option => option.setName('status').setDescription('Report status').setRequired(false).addChoices({ name: 'Open', value: 'open' }, { name: 'Closed', value: 'closed' })))
  .addSubcommand(command => command.setName('close').setDescription('Close a report.').addStringOption(option => option.setName('report_id').setDescription('Report ID, such as P0001').setRequired(true)))
  .addSubcommand(command => command.setName('reopen').setDescription('Reopen a report.').addStringOption(option => option.setName('report_id').setDescription('Report ID').setRequired(true)));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  if (!adminOnly(interaction)) { await interaction.reply({ content: 'Only the server owner or an administrator can review reports.', flags: MessageFlags.Ephemeral }); return; }
  const action = interaction.options.getSubcommand();
  if (action === 'list') {
    const reports = store.listReports(interaction.guildId, interaction.options.getString('status') || 'open').slice(0, 10);
    if (!reports.length) { await interaction.reply({ content: 'No reports match that status.', flags: MessageFlags.Ephemeral }); return; }
    const lines = reports.map(report => `**${report.id || 'legacy'}** · ${report.status}\nReported: <@${report.reportedUserId}> · By: <@${report.reporterId}>\n${report.reason}`);
    await interaction.reply({ content: `**Report review**\n\n${lines.join('\n\n')}`, flags: MessageFlags.Ephemeral, allowedMentions: { users: [] } });
    return;
  }
  const id = interaction.options.getString('report_id');
  const result = store.updateReport(interaction.guildId, id, action === 'close' ? 'closed' : 'open');
  await interaction.reply({ content: result.updated ? `Report **${id}** is now **${result.report.status}**.` : 'That report ID was not found.', flags: MessageFlags.Ephemeral });
}
