import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { chooseBotherOptions } from '../om.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const adminOnly = interaction => interaction.guild?.ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
export const data = new SlashCommandBuilder().setName('torture-om').setDescription('Manage consent and targeting for the friendly Om challenge.')
  .addSubcommand(command => command.setName('opt-in').setDescription('Consent to receive harmless Om challenge messages.'))
  .addSubcommand(command => command.setName('opt-out').setDescription('Stop receiving Om challenge messages.'))
  .addSubcommand(command => command.setName('status').setDescription('View the Om challenge status.'))
  .addSubcommand(command => command.setName('poll').setDescription('Admin-only vote for the next Om method.').addIntegerOption(option => option.setName('duration').setDescription('Poll length in minutes (default: 5)').setMinValue(1).setMaxValue(60).setRequired(false)))
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
  if (action === 'poll') {
    const durationMinutes = interaction.options.getInteger('duration') || 5;
    const options = chooseBotherOptions();
    const result = store.beginBotherPoll(interaction.guildId, interaction.user.id, interaction.channelId, options, Date.now(), durationMinutes * 60_000, false);
    if (!result.started) {
      const messages = {
        'target-not-opted-in': 'Om must opt in with `/torture-om opt-in`, and an administrator must set the target with `/torture-om target` first.',
        'poll-active': 'There is already an Om method poll open in this server.',
        'action-active': 'An Om action is still running. Wait for it to finish before starting another poll.',
      };
      await interaction.reply({ content: messages[result.reason] || 'Could not start the Om method poll.', flags: MessageFlags.Ephemeral });
      return;
    }
    const row = new ActionRowBuilder().addComponents(options.map(option => new ButtonBuilder().setCustomId(`bother:${interaction.guildId}:${option.id}`).setLabel(option.label).setStyle(ButtonStyle.Primary)));
    await interaction.reply({ content: `📣 **Official Om method poll**\nChoose the harmless fictional method for the opted-in target. Voting closes <t:${Math.floor(result.poll.endsAt / 1000)}:R>. The winning method remains capped and can be stopped with \`/torture-om stop\`.`, components: [row], allowedMentions: { parse: [] } });
    const message = await interaction.fetchReply();
    store.setBotherPollMessage(interaction.guildId, message.id);
    return;
  }
  if (action === 'stop') { store.clearOmTarget(interaction.guildId); await interaction.reply({ content: 'The Om challenge was stopped.', flags: MessageFlags.Ephemeral }); return; }
  const user = interaction.options.getUser('user');
  const result = store.setOmTarget(interaction.guildId, user.id);
  await interaction.reply({ content: result.set ? `Set <@${user.id}> as the Om challenge target. They have opted in.` : 'That user has not opted in. They must use `/torture-om opt-in` first.', flags: MessageFlags.Ephemeral, allowedMentions: { users: [] } });
}
