import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const adminOnly = interaction => interaction.guild?.ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
function canManage(interaction, course) { return adminOnly(interaction) || store.isCampInstructor(interaction.guildId, course, interaction.user.id); }

export const data = new SlashCommandBuilder().setName('camp-trivia').setDescription('Create and play course-specific camp trivia.')
  .addSubcommand(command => command.setName('add').setDescription('Add a question to a course set.').addStringOption(option => option.setName('course').setDescription('Course name').setMaxLength(80).setRequired(true)).addStringOption(option => option.setName('prompt').setDescription('Question prompt').setMaxLength(300).setRequired(true)).addStringOption(option => option.setName('choice1').setDescription('First choice').setMaxLength(100).setRequired(true)).addStringOption(option => option.setName('choice2').setDescription('Second choice').setMaxLength(100).setRequired(true)).addStringOption(option => option.setName('choice3').setDescription('Third choice').setMaxLength(100).setRequired(true)).addStringOption(option => option.setName('choice4').setDescription('Fourth choice').setMaxLength(100).setRequired(true)).addIntegerOption(option => option.setName('answer').setDescription('Correct choice number: 1, 2, 3, or 4').setMinValue(1).setMaxValue(4).setRequired(true)))
  .addSubcommand(command => command.setName('list').setDescription('List questions in a course set.').addStringOption(option => option.setName('course').setDescription('Course name').setMaxLength(80).setRequired(true)))
  .addSubcommand(command => command.setName('remove').setDescription('Remove a question from a course set.').addStringOption(option => option.setName('course').setDescription('Course name').setMaxLength(80).setRequired(true)).addStringOption(option => option.setName('question_id').setDescription('Question ID, such as CT0001').setRequired(true)))
  .addSubcommand(command => command.setName('ask').setDescription('Post a random question from a course set.').addStringOption(option => option.setName('course').setDescription('Course name').setMaxLength(80).setRequired(true)));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const action = interaction.options.getSubcommand();
  const course = interaction.options.getString('course');
  if (action === 'ask') {
    const profile = store.getOrCreate(interaction.guildId, interaction.user.id);
    if (profile.campOptOut) { await interaction.reply({ content: 'You have opted out of camp features. Re-enable them with `/privacy scope:camp hide:false`.', flags: MessageFlags.Ephemeral }); return; }
    const questions = store.listCampTriviaQuestions(interaction.guildId, course);
    if (!questions.length) { await interaction.reply({ content: 'That course does not have any trivia questions yet.', flags: MessageFlags.Ephemeral }); return; }
    const question = questions[Math.floor(Math.random() * questions.length)];
    const row = new ActionRowBuilder().addComponents(question.choices.map((choice, index) => new ButtonBuilder().setCustomId(`camp-trivia:${interaction.guildId}:${question.id}:${index}`).setLabel(choice).setStyle(ButtonStyle.Primary)));
    await interaction.reply({ content: `🎓 **${course} camp trivia**\n${question.prompt}\n\nAnyone can answer once.`, components: [row] });
    return;
  }
  if (!canManage(interaction, course)) { await interaction.reply({ content: 'Only an administrator or an instructor for this course can manage its trivia set.', flags: MessageFlags.Ephemeral }); return; }
  if (action === 'list') {
    const questions = store.listCampTriviaQuestions(interaction.guildId, course);
    await interaction.reply({ content: questions.length ? `**${course} trivia set**\n${questions.map(question => `**${question.id}** — ${question.prompt}`).join('\n')}` : 'This course has no trivia questions yet.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (action === 'remove') {
    const result = store.removeCampTriviaQuestion(interaction.guildId, course, interaction.options.getString('question_id'));
    await interaction.reply({ content: result.removed ? `Removed **${result.question.id}** from **${course}**.` : 'That question was not found in this course set.', flags: MessageFlags.Ephemeral });
    return;
  }
  const choices = [1, 2, 3, 4].map(number => interaction.options.getString(`choice${number}`));
  const result = store.addCampTriviaQuestion(interaction.guildId, course, interaction.user.id, interaction.options.getString('prompt'), choices, interaction.options.getInteger('answer') - 1);
  const message = result.added ? `Added **${result.question.id}** to the **${course}** trivia set. Students can play it with /camp-trivia ask.` : result.reason === 'course-not-found' ? 'That course does not exist. Add it with `/camp-course add` first.' : 'That question could not be added.';
  await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
}

export async function handleButton(interaction) {
  const [, guildId, questionId, answerText] = interaction.customId.split(':');
  if (interaction.guildId !== guildId) return;
  const result = store.answerCampTrivia(guildId, interaction.user.id, questionId, Number(answerText));
  if (!result.accepted) { await interaction.reply({ content: result.reason === 'already-answered' ? 'You already answered this question.' : 'That camp trivia question is no longer available.', flags: MessageFlags.Ephemeral }); return; }
  const outcome = result.correct ? `Correct! **+${result.reward.coins} Sciocoins** and **+${result.reward.knowledgePoints} knowledge points**.` : `Not quite. You still earned **+${result.reward.knowledgePoints} knowledge points** for participating.`;
  await interaction.reply({ content: `${outcome}\n${result.question.choices[result.question.answer]} was the correct answer.`, flags: MessageFlags.Ephemeral });
}
