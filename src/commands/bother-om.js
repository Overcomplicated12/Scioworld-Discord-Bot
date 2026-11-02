import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { chooseBotherOptions } from '../om.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const adminOnly = interaction => interaction.guild?.ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

export const data = new SlashCommandBuilder().setName('bother-om').setDescription('Start a friendly, opt-in poll for the Om challenge.')
  .addSubcommand(command => command.setName('start').setDescription('Start a five-minute vote (one per person per UTC day).'))
  .addSubcommand(command => command.setName('status').setDescription('Check the current Om vote or scheduled action.'))
  .addSubcommand(command => command.setName('stop').setDescription('Stop the vote or scheduled action (admin only).'));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const action = interaction.options.getSubcommand();
  if (action === 'status') {
    const schedule = store.getOmSchedule(interaction.guildId);
    const poll = schedule.botherPoll;
    const queued = schedule.botherAction;
    const content = poll ? `A vote is open until <t:${Math.floor(poll.endsAt / 1000)}:R> with **${poll.voters.length}** vote${poll.voters.length === 1 ? '' : 's'}.` : queued ? `The winning action has sent **${queued.sent}/${queued.count}** messages. The next one is due <t:${Math.floor(queued.nextAt / 1000)}:R>.` : 'There is no active Om vote or scheduled action.';
    await interaction.reply({ content: `${content}\nOm can stop future sends at any time with \`/torture-om opt-out\`.`, flags: MessageFlags.Ephemeral });
    return;
  }
  if (action === 'stop') {
    if (!adminOnly(interaction)) { await interaction.reply({ content: 'Only the server owner or an administrator can stop the Om vote or action.', flags: MessageFlags.Ephemeral }); return; }
    store.closeBotherPoll(interaction.guildId);
    await interaction.reply({ content: 'The Om vote and any scheduled action have been stopped.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (!adminOnly(interaction)) { await interaction.reply({ content: 'Only the server owner or an administrator can start an Om method poll.', flags: MessageFlags.Ephemeral }); return; }
  const options = chooseBotherOptions();
  const result = store.beginBotherPoll(interaction.guildId, interaction.user.id, interaction.channelId, options, Date.now());
  if (!result.started) {
    const messages = {
      'target-not-opted-in': 'Om must opt in with `/torture-om opt-in`, and an administrator must set them as the target with `/torture-om target`.',
      'poll-active': 'There is already an Om vote open in this server.',
      'action-active': 'An Om action is still running. Start another vote after it finishes.',
      'daily-limit': 'You already started an Om vote today. Try again after the UTC day resets.',
    };
    await interaction.reply({ content: messages[result.reason] || 'Could not start the Om vote.', flags: MessageFlags.Ephemeral });
    return;
  }
  const row = new ActionRowBuilder().addComponents(options.map(option => new ButtonBuilder().setCustomId(`bother:${interaction.guildId}:${option.id}`).setLabel(option.label).setStyle(ButtonStyle.Primary)));
  await interaction.reply({ content: '📣 **How should we bother Om?**\nChoose an option below. Voting closes in five minutes. Om opted in; the winning option sends at most 11 messages, one hour apart.', components: [row], allowedMentions: { parse: [] } });
  const message = await interaction.fetchReply();
  store.setBotherPollMessage(interaction.guildId, message.id);
}

export async function handleButton(interaction) {
  const [, guildId, optionId] = interaction.customId.split(':');
  if (guildId !== interaction.guildId) return;
  const result = store.recordBotherVote(guildId, interaction.user.id, optionId, Date.now());
  const message = result.recorded ? 'Your vote was counted.' : result.reason === 'already-voted' ? 'You already voted in this Om poll.' : 'That Om vote has closed or this option is no longer available.';
  await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
}
