import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { questions, selectTriviaDifficulty } from '../questions.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const categories = [...new Set(questions.map(question => question.category))];
const categoryNames = { biology: 'Biology', chemistry: 'Chemistry', physics: 'Physics', mathematics: 'Mathematics', 'earth-and-space': 'Earth & space', energy: 'Energy', 'general-science': 'General science', 'computer-science': 'Computer science', 'earth-science': 'Earth science', sciovirtual: 'Sciovirtual', space: 'Space' };
const categoryChoices = [{ name: 'Mixed science', value: 'mixed' }, ...categories.slice(0, 24).map(category => ({ name: categoryNames[category] || category, value: category }))];

export const data = new SlashCommandBuilder().setName('trivia').setDescription('Answer a science question for Sciocoins and knowledge points.')
  .addStringOption(option => option.setName('category').setDescription('Choose a question category').setRequired(false).addChoices(...categoryChoices))
  .addStringOption(option => option.setName('difficulty').setDescription('Choose a difficulty').setRequired(false).addChoices(
    { name: 'Easy', value: 'easy' }, { name: 'Medium', value: 'medium' }, { name: 'Hard', value: 'hard' },
  ));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const category = interaction.options.getString('category');
  const difficulty = interaction.options.getString('difficulty');
  const profile = store.getOrCreate(interaction.guildId, interaction.user.id);
  const categoryPool = !category || category === 'mixed' ? questions : questions.filter(question => question.category === category);
  const difficultyPool = selectTriviaDifficulty(categoryPool, difficulty, profile.triviaStreak);
  const fresh = difficultyPool.filter(question => !profile.triviaRecentQuestions.includes(question.id));
  const available = fresh.length ? fresh : difficultyPool;
  if (!available.length) { await interaction.reply({ content: 'No questions are available in that category yet.', flags: MessageFlags.Ephemeral }); return; }
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
  await interaction.reply({ content: `🧠 **${question.category} trivia · ${question.difficulty}**\n${question.prompt}\n\nYou have two minutes to answer.`, components: [buttons] });
  const message = await interaction.fetchReply();
  setTimeout(async () => {
    const current = store.getOrCreate(interaction.guildId, interaction.user.id);
    if (current.pendingTrivia?.questionId !== question.id) return;
    await message.edit({ content: `⌛ **${question.category} trivia · ${question.difficulty} — EXPIRED**\n${question.prompt}\n\nThis question timed out. Start another with \`/trivia\`.`, components: [] }).catch(() => {});
  }, 121_000).unref?.();
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
  const outcome = result.correct ? `Correct! **+${result.coins} Sciocoins** and **+${result.knowledgePoints} knowledge points**.${streak}` : `Not quite. Take a look at the explanation below.`;
  await interaction.reply({ content: `${outcome}\n${question.explanation}\nRewards apply to up to 15 different correct questions per UTC day. You can keep playing for fun.` });
}
