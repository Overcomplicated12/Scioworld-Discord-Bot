import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { questions } from '../questions.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const categories = [...new Set(questions.map(question => question.category))];
const choices = categories.slice(0, 25).map(category => ({ name: category, value: category }));
function pickQuestions(category) { const pool = questions.filter(question => !category || question.category === category); return [...pool].sort(() => Math.random() - 0.5).slice(0, 3).map(question => question.id); }
function showQuestion(race, question) { return `🏁 **Race ${race.id} — round ${race.round + 1}/3**\n${question.prompt}\nChoices: ${question.choices.map((choice, index) => `**${index}** ${choice}`).join(' · ')}\nAnswer with /race answer race_id:${race.id} choice:0 (replace 0 with your choice).`; }

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
  if (action === 'create') { const race = store.createRace(interaction.guildId, interaction.user.id, interaction.options.getString('category'), pickQuestions(interaction.options.getString('category')), now); if (!race.created) { await interaction.reply({ content: 'There is already an active race in this server.', flags: MessageFlags.Ephemeral }); return; } await interaction.reply(`🏁 Race **${race.race.id}** created by <@${interaction.user.id}>. Join with **/race join race_id:${race.race.id}**, then the host starts it.`, { allowedMentions: { users: [interaction.user.id] } }); return; }
  const raceId = interaction.options.getString('race_id');
  if (action === 'join') { const result = store.joinRace(interaction.guildId, interaction.user.id, raceId); const messages = { 'not-found': 'Race not found.', 'not-lobby': 'That race already started or ended.', 'already-joined': 'You already joined that race.' }; await interaction.reply({ content: result.joined ? `<@${interaction.user.id}> joined **${raceId}**. Players: ${result.race.players.length}` : messages[result.reason], allowedMentions: { users: [interaction.user.id] } }); return; }
  if (action === 'start') { const result = store.startRace(interaction.guildId, interaction.user.id, raceId, now); if (!result.started) { const messages = { 'not-found': 'Race not found.', 'not-host': 'Only the host can start the race.', 'not-enough-players': 'At least two players must join first.' }; await interaction.reply({ content: messages[result.reason], flags: MessageFlags.Ephemeral }); return; } const question = questions.find(item => item.id === result.questionId); await interaction.reply(showQuestion(result.race, question)); return; }
  if (action === 'cancel') { const isModerator = interaction.memberPermissions?.has('ManageGuild') === true; const result = store.cancelRace(interaction.guildId, interaction.user.id, raceId, isModerator); const messages = { 'not-found': 'Race not found.', 'not-host': 'Only the host or a server moderator can cancel the race.', 'not-active': 'That race is no longer active.' }; await interaction.reply({ content: result.cancelled ? `Race **${raceId}** cancelled.` : messages[result.reason], flags: result.cancelled ? undefined : MessageFlags.Ephemeral }); return; }
  const raceState = store.answerRace; const race = store.getRace?.(interaction.guildId, raceId);
  if (!race) { await interaction.reply({ content: 'Race not found or no longer active.', flags: MessageFlags.Ephemeral }); return; }
  const question = questions.find(item => item.id === race.questionIds[race.round]); const result = raceState(interaction.guildId, interaction.user.id, raceId, interaction.options.getInteger('choice'), question, now);
  if (!result.answered) { await interaction.reply({ content: result.reason === 'already-answered' ? 'You already answered this round.' : 'You cannot answer that race.', flags: MessageFlags.Ephemeral }); return; }
  if (!result.complete) { await interaction.reply({ content: result.correct ? 'Your answer is correct. Waiting for the other racers.' : 'Answer recorded. Waiting for the other racers.' }); return; }
  if (result.finished) { const rewardText = Object.entries(result.rewards).map(([id, reward]) => `<@${id}> +${reward.coins} coins, +${reward.knowledgePoints} knowledge`).join('\n'); await interaction.reply(`Race **${raceId}** finished! Winners: ${result.winners.map(id => `<@${id}>`).join(', ')}.\n\n**Race rewards**\n${rewardText}`, { allowedMentions: { users: result.winners } }); return; }
  const next = questions.find(item => item.id === result.nextQuestionId); await interaction.reply(`${result.correct ? 'Correct!' : 'Answer recorded.'}\n${showQuestion(result.race, next)}`);
}
