import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { questions } from '../questions.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const categories = [...new Set(questions.map(question => question.category))];
const choices = categories.slice(0, 25).map(category => ({ name: category, value: category }));
function pickQuestions(category) { const pool = questions.filter(question => !category || question.category === category); return [...pool].sort(() => Math.random() - 0.5).slice(0, 3).map(question => question.id); }
function showQuestion(race, question) {
  return {
    content: `🏁 **Race ${race.id} — round ${race.round + 1}/3**\n${question.prompt}\n${question.choices.map((choice, index) => `**${index + 1}.** ${choice}`).join('\n')}\n\nChoose an answer below.`,
    components: [new ActionRowBuilder().addComponents(question.choices.map((choice, index) => new ButtonBuilder().setCustomId(`race:${race.id}:${race.round}:${index}`).setLabel(`Choice ${index + 1}`).setStyle(ButtonStyle.Primary)))],
  };
}

function resultMessage(result, raceId, questionForNext) {
  if (!result.answered) return { content: result.reason === 'already-answered' ? 'You already answered this round.' : 'You cannot answer that race.', flags: MessageFlags.Ephemeral };
  if (!result.complete) return { content: 'Not correct — waiting for another racer to find the answer.', flags: MessageFlags.Ephemeral };
  if (result.finished) {
    const rewardText = Object.entries(result.rewards).map(([id, reward]) => `<@${id}> +${reward.coins} coins, +${reward.knowledgePoints} knowledge`).join('\n');
    const finalPoint = result.roundWinnerId ? `Final point: <@${result.roundWinnerId}> answered first.\n\n` : 'No one found the final answer.\n\n';
    return { content: `${finalPoint}Race **${raceId}** finished! Winners: ${result.winners.map(id => `<@${id}>`).join(', ')}.\n\n**Race rewards**\n${rewardText}`, allowedMentions: { users: [...result.winners, result.roundWinnerId].filter(Boolean) } };
  }
  const payload = showQuestion(result.race, questionForNext);
  payload.content = result.roundWinnerId
    ? `⚡ <@${result.roundWinnerId}> answered first and gets the point.\n\n${payload.content}`
    : `No one found the answer that round, so no point was awarded.\n\n${payload.content}`;
  payload.allowedMentions = { users: result.roundWinnerId ? [result.roundWinnerId] : [] };
  return payload;
}

export const data = new SlashCommandBuilder().setName('race').setDescription('Compete in a quick science race.')
  .addSubcommand(command => command.setName('create').setDescription('Create a race lobby.').addStringOption(option => option.setName('category').setDescription('Question category').setRequired(false).addChoices(...choices)))
  .addSubcommand(command => command.setName('join').setDescription('Join a race lobby.').addStringOption(option => option.setName('race_id').setDescription('Race ID').setRequired(true)))
  .addSubcommand(command => command.setName('start').setDescription('Start your race after players join.').addStringOption(option => option.setName('race_id').setDescription('Race ID').setRequired(true)))
  .addSubcommand(command => command.setName('answer').setDescription('Answer the current race question.').addStringOption(option => option.setName('race_id').setDescription('Race ID').setRequired(true)).addIntegerOption(option => option.setName('choice').setDescription('Choice number shown in the question').setMinValue(0).setMaxValue(3).setRequired(true)))
  .addSubcommand(command => command.setName('cancel').setDescription('Cancel your race.').addStringOption(option => option.setName('race_id').setDescription('Race ID').setRequired(true)));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const action = interaction.options.getSubcommand(); const now = Date.now();
  const expired = store.expireRaces(interaction.guildId, now);
  if (expired.length && action === 'create') await interaction.channel.send(`⏱️ ${expired.map(race => `Race **${race.id}**`).join(' and ')} expired after inactivity. Start a new lobby whenever you are ready.`);
  if (action === 'create') { const race = store.createRace(interaction.guildId, interaction.user.id, interaction.options.getString('category'), pickQuestions(interaction.options.getString('category')), now, interaction.channelId); if (!race.created) { await interaction.reply({ content: 'There is already an active race in this server.', flags: MessageFlags.Ephemeral }); return; } await interaction.reply(`🏁 Race **${race.race.id}** created by <@${interaction.user.id}>. Join with **/race join race_id:${race.race.id}** within 15 minutes, then the host starts it. Once started, the race has 10 minutes of inactivity before it closes.`, { allowedMentions: { users: [interaction.user.id] } }); return; }
  const raceId = interaction.options.getString('race_id');
  if (action === 'join') {
    const result = store.joinRace(interaction.guildId, interaction.user.id, raceId);
    const closedMessage = result.race?.status === 'active'
      ? `Race **${raceId}** already started, so new players cannot join this round.`
      : result.race?.status === 'expired'
        ? `Race **${raceId}** timed out from inactivity. Create a new race whenever you are ready.`
        : `Race **${raceId}** already ended.`;
    const messages = { 'not-found': 'Race not found.', 'not-lobby': closedMessage, 'already-joined': 'You already joined that race.' };
    await interaction.reply({ content: result.joined ? `<@${interaction.user.id}> joined **${raceId}**. Players: ${result.race.players.length}` : messages[result.reason], allowedMentions: { users: [interaction.user.id] } });
    return;
  }
  if (action === 'start') { const result = store.startRace(interaction.guildId, interaction.user.id, raceId, now); if (!result.started) { const messages = { 'not-found': 'Race not found.', 'not-host': 'Only the host can start the race.', 'not-lobby': 'That race has already started or finished.', 'not-enough-players': 'At least two players must join first.' }; await interaction.reply({ content: messages[result.reason], flags: MessageFlags.Ephemeral }); return; } const question = questions.find(item => item.id === result.questionId); await interaction.reply(showQuestion(result.race, question)); return; }
  if (action === 'cancel') { const isModerator = interaction.memberPermissions?.has('ManageGuild') === true; const result = store.cancelRace(interaction.guildId, interaction.user.id, raceId, isModerator); const messages = { 'not-found': 'Race not found.', 'not-host': 'Only the host or a server moderator can cancel the race.', 'not-active': 'That race is no longer active.' }; await interaction.reply({ content: result.cancelled ? `Race **${raceId}** cancelled.` : messages[result.reason], flags: result.cancelled ? undefined : MessageFlags.Ephemeral }); return; }
  const raceState = store.answerRace; const race = store.getRace?.(interaction.guildId, raceId);
  if (!race) { await interaction.reply({ content: 'Race not found or no longer active.', flags: MessageFlags.Ephemeral }); return; }
  const question = questions.find(item => item.id === race.questionIds[race.round]); const result = raceState(interaction.guildId, interaction.user.id, raceId, interaction.options.getInteger('choice'), question, now);
  const next = result.nextQuestionId ? questions.find(item => item.id === result.nextQuestionId) : null;
  await interaction.reply(resultMessage(result, raceId, next));
}

export async function handleButton(interaction, persistence = store) {
  if (!requireGuild(interaction)) return;
  const [, raceId, roundText, choiceText] = interaction.customId.split(':');
  const race = persistence.getRace?.(interaction.guildId, raceId);
  const round = Number(roundText); const choice = Number(choiceText);
  if (!race || race.status !== 'active' || race.round !== round) { await interaction.reply({ content: 'That race question has already moved on or ended.', flags: MessageFlags.Ephemeral }); return; }
  const question = questions.find(item => item.id === race.questionIds[race.round]);
  const result = persistence.answerRace(interaction.guildId, interaction.user.id, raceId, choice, question, Date.now());
  const next = result.nextQuestionId ? questions.find(item => item.id === result.nextQuestionId) : null;
  const payload = resultMessage(result, raceId, next);
  if (result.complete) await interaction.update(payload);
  else await interaction.reply(payload);
}

export async function handleNumericMessage(message, persistence = store) {
  if (!message.guildId || message.author?.bot) return false;
  const matched = message.content.trim().match(/^([1-4])$/);
  if (!matched) return false;
  const race = persistence.getActiveRace?.(message.guildId);
  if (!race || !race.players.includes(message.author.id)) return false;
  const question = questions.find(item => item.id === race.questionIds[race.round]);
  const result = persistence.answerRace(message.guildId, message.author.id, race.id, Number(matched[1]) - 1, question, Date.now());
  if (!result.answered) return false;
  if (!result.complete) {
    await message.react?.('✅').catch(() => {});
    return true;
  }
  const next = result.nextQuestionId ? questions.find(item => item.id === result.nextQuestionId) : null;
  await message.channel.send(resultMessage(result, race.id, next));
  return true;
}
