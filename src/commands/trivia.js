import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { questions } from '../questions.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const categories = [...new Set(questions.map(question => question.category))];
const categoryChoices = categories.slice(0, 25).map(category => ({ name: category, value: category }));

export const data = new SlashCommandBuilder().setName('trivia').setDescription('Answer a science question for Sciocoins and knowledge points.')
  .addStringOption(option => option.setName('category').setDescription('Choose a question category').setRequired(false).addChoices(...categoryChoices));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const category = interaction.options.getString('category');
  const available = questions.filter(question => !category || question.category === category);
  const question = available[Math.floor(Math.random() * available.length)];
  const result = store.startTrivia(interaction.guildId, interaction.user.id, question.id, Date.now());
  if (!result.started) {
    const message = result.reason === 'pending'
      ? 'You already have a trivia question waiting. Answer it before starting another.'
      : `You can start another trivia question in **${Math.ceil(result.remainingMs / 1000)} seconds**.`;
    await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    return;
  }
  const buttons = new ActionRowBuilder().addComponents(question.choices.map((choice, index) => new ButtonBuilder()
    .setCustomId(`trivia:${question.id}:${index}:${interaction.user.id}`)
    .setLabel(choice)
    .setStyle(ButtonStyle.Primary)));
  await interaction.reply({ content: `🧠 **${question.category} trivia**\n${question.prompt}\n\nYou have two minutes to answer.`, components: [buttons] });
}

export async function handleButton(interaction) {
  const [, questionId, answerText, userId] = interaction.customId.split(':');
  if (userId !== interaction.user.id) {
    await interaction.reply({ content: 'This question belongs to the player who started it.', flags: MessageFlags.Ephemeral });
    return;
  }
  const question = questions.find(item => item.id === questionId);
  const answerIndex = Number(answerText);
  if (!question || !Number.isInteger(answerIndex)) {
    await interaction.reply({ content: 'That trivia question is no longer available.', flags: MessageFlags.Ephemeral });
    return;
  }
  const result = store.answerTrivia(interaction.guildId, interaction.user.id, question.id, answerIndex, Date.now(), question.answer);
  if (!result.accepted) {
    await interaction.reply({ content: 'That trivia question has expired or was already answered.', flags: MessageFlags.Ephemeral });
    return;
  }
  const streak = result.correct && result.triviaStreak > 1 ? ` Your trivia streak is now **${result.triviaStreak}**!` : result.correct && result.triviaStreak === 1 ? ' Your trivia streak has started!' : '';
  const outcome = result.correct ? `Correct! **+${result.coins} Sciocoins** and **+${result.knowledgePoints} knowledge points**.${streak}` : `Not quite. You still earned **+${result.knowledgePoints} knowledge points** for playing. Your trivia streak reset.`;
  await interaction.reply({ content: `${outcome}\n${question.explanation}` });
}
