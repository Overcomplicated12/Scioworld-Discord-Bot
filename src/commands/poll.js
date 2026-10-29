import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { pollBank } from '../polls.js';
import { requireGuild } from './utils.js';

const isModerator = interaction => interaction.guild?.ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

export const data = new SlashCommandBuilder().setName('poll').setDescription('Create the weekly community poll.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(command => command.setName('early').setDescription('Post this week’s randomly selected poll now.'))
  .addSubcommand(command => command.setName('override').setDescription('Use your weekly admin override for a custom poll.').addStringOption(option => option.setName('question').setDescription('Poll question').setMaxLength(300).setRequired(true)).addStringOption(option => option.setName('option1').setDescription('First answer').setMaxLength(100).setRequired(true)).addStringOption(option => option.setName('option2').setDescription('Second answer').setMaxLength(100).setRequired(true)).addStringOption(option => option.setName('option3').setDescription('Third answer').setMaxLength(100).setRequired(false)).addStringOption(option => option.setName('option4').setDescription('Fourth answer').setMaxLength(100).setRequired(false)))
  .addSubcommand(command => command.setName('status').setDescription('View the weekly poll schedule.'));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const action = interaction.options.getSubcommand();
  if (action === 'status') {
    const schedule = store.getPollSchedule(interaction.guildId);
    const next = Math.floor(schedule.nextDueAt / 1000);
    await interaction.reply({ content: `The next weekly poll is scheduled for <t:${next}:F>. Polls are kept out of rotation for one year.`, flags: MessageFlags.Ephemeral });
    return;
  }
  if (!isModerator(interaction)) {
    await interaction.reply({ content: 'Only the server owner or an administrator can override the weekly poll.', flags: MessageFlags.Ephemeral });
    return;
  }
  const now = Date.now();
  if (!store.pollOverrideAvailable(interaction.guildId, now)) {
    await interaction.reply({ content: 'This server has already used its weekly poll override. You can use another override next week.', flags: MessageFlags.Ephemeral });
    return;
  }
  let poll;
  let pollId;
  if (action === 'early') {
    const available = pollBank.filter(candidate => !store.pollUsedWithinYear(interaction.guildId, candidate.id, now));
    if (!available.length) {
      await interaction.reply({ content: 'The poll question bank is exhausted for this server. Add more prompts before starting an early poll.', flags: MessageFlags.Ephemeral });
      return;
    }
    poll = available[Math.floor(Math.random() * available.length)];
    pollId = poll.id;
  } else {
    poll = { question: interaction.options.getString('question'), answers: ['option1', 'option2', 'option3', 'option4'].map(name => interaction.options.getString(name)).filter(Boolean) };
    pollId = `override-${now}`;
  }
  await interaction.channel.send({ poll: { question: { text: poll.question }, answers: poll.answers.map(text => ({ text })), duration: 168, allowMultiselect: false } });
  store.markPollSent(interaction.guildId, pollId, now, interaction.channelId, true);
  await interaction.reply({ content: action === 'early' ? 'This week’s random poll was posted early. The next poll will be scheduled one week from now.' : 'Your weekly custom poll was posted. The next poll will be scheduled one week from now.', flags: MessageFlags.Ephemeral });
}
