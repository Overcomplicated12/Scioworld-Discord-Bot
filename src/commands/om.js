import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const adminOnly = interaction => interaction.guild?.ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
export const data = new SlashCommandBuilder().setName('om').setDescription('Manage the opt-in fictional Om challenge.')
  .addSubcommand(command => command.setName('opt-in').setDescription('Consent to receive harmless Om challenge messages.'))
  .addSubcommand(command => command.setName('opt-out').setDescription('Stop receiving Om challenge messages.'))
  .addSubcommand(command => command.setName('status').setDescription('View the Om challenge status.'))
  .addSubcommand(command => command.setName('target').setDescription('Choose an opted-in target.').addUserOption(option => option.setName('user').setDescription('Opted-in participant').setRequired(true)))
  .addSubcommand(command => command.setName('stop').setDescription('Stop the current Om challenge.'));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const action = interaction.options.getSubcommand();
  if (action === 'opt-in' || action === 'opt-out') {
    store.setOmOptIn(interaction.guildId, interaction.user.id, action === 'opt-in');
    await interaction.reply({ content: action === 'opt-in' ? 'You opted into the harmless fictional Om challenge. You can opt out at any time.' : 'You opted out of the Om challenge.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (action === 'status') {
    const schedule = store.getOmSchedule(interaction.guildId);
    await interaction.reply({ content: `Opted-in participants: **${schedule.optedIn.length}**\nCurrent target: ${schedule.targetId ? `<@${schedule.targetId}>` : 'None'}\nChallenge active: **${schedule.activeUntil > Date.now() ? 'yes' : 'no'}**`, flags: MessageFlags.Ephemeral, allowedMentions: { users: [] } });
    return;
  }
  if (!adminOnly(interaction)) { await interaction.reply({ content: 'Only the server owner or an administrator can choose or stop an Om challenge.', flags: MessageFlags.Ephemeral }); return; }
  if (action === 'stop') { store.clearOmTarget(interaction.guildId); await interaction.reply({ content: 'The Om challenge was stopped.', flags: MessageFlags.Ephemeral }); return; }
  const user = interaction.options.getUser('user');
  const result = store.setOmTarget(interaction.guildId, user.id);
  await interaction.reply({ content: result.set ? `Set <@${user.id}> as the Om challenge target. They have opted in.` : 'That user has not opted in. They must use `/om opt-in` first.', flags: MessageFlags.Ephemeral, allowedMentions: { users: [] } });
}
