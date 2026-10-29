import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('report').setDescription('Report a player or content for moderator review.')
  .addUserOption(option => option.setName('user').setDescription('Player or account to report').setRequired(true))
  .addStringOption(option => option.setName('reason').setDescription('Brief reason for the report').setMaxLength(500).setRequired(true));
async function notifyModerators(interaction, user, reason) {
  const recipients = new Map();
  try {
    const owner = await interaction.guild.fetchOwner();
    recipients.set(owner.id, owner.user);
  } catch (error) {
    console.error('Could not fetch guild owner for report notification:', error.message);
  }
  for (const member of interaction.guild.members.cache.values()) {
    if (member.permissions.has('Administrator')) recipients.set(member.id, member.user);
  }
  const reportMessage = `🚩 **New ScioVirtual report**\nServer: **${interaction.guild.name}**\nReported user: <@${user.id}> (${user.tag})\nReported by: <@${interaction.user.id}> (${interaction.user.tag})\nChannel: <#${interaction.channelId}>\nReason: ${reason}`;
  await Promise.all([...recipients.values()].map(async recipient => {
    try {
      await recipient.send({ content: reportMessage, allowedMentions: { parse: [] } });
    } catch (error) {
      console.warn(`Could not DM report recipient ${recipient.id}:`, error.message);
    }
  }));
}

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const user = interaction.options.getUser('user');
  if (user.id === interaction.user.id) {
    await interaction.reply({ content: 'You cannot report yourself.', flags: MessageFlags.Ephemeral });
    return;
  }
  const reason = interaction.options.getString('reason');
  const report = store.createReport(interaction.guildId, interaction.user.id, user.id, reason, Date.now());
  if (!report.created) {
    const message = report.reason === 'hourly-limit'
      ? 'You have reached the limit of 5 reports per hour. Please wait and contact a moderator directly if someone is in immediate danger.'
      : `Please wait ${Math.ceil(report.remainingMs / 1000)} seconds before submitting another report.`;
    await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply({ content: 'Report submitted. Server administrators have been notified by DM.', flags: MessageFlags.Ephemeral });
  void notifyModerators(interaction, user, reason).catch(error => console.error('Report notification failed:', error));
}
