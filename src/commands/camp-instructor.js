import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const adminOnly = interaction => interaction.guild?.ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
export const data = new SlashCommandBuilder().setName('camp-instructor').setDescription('Add or remove an instructor from a camp course.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(command => command.setName('add').setDescription('Add an instructor.').addStringOption(option => option.setName('course').setDescription('Course name').setMaxLength(80).setRequired(true)).addUserOption(option => option.setName('instructor').setDescription('Instructor Discord account').setRequired(true)))
  .addSubcommand(command => command.setName('remove').setDescription('Remove an instructor.').addStringOption(option => option.setName('course').setDescription('Course name').setMaxLength(80).setRequired(true)).addUserOption(option => option.setName('instructor').setDescription('Instructor Discord account').setRequired(true)));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  if (!adminOnly(interaction)) { await interaction.reply({ content: 'Only the server owner or an administrator can manage instructors.', flags: MessageFlags.Ephemeral }); return; }
  const course = interaction.options.getString('course');
  const instructor = interaction.options.getUser('instructor');
  const action = interaction.options.getSubcommand();
  const result = action === 'add'
    ? store.addCampInstructor(interaction.guildId, course, instructor.id, instructor.tag)
    : store.removeCampInstructor(interaction.guildId, course, instructor.id);
  const messages = {
    'course-not-found': 'That course was not found. Add it with `/camp-course add` first.',
    exists: 'That instructor is already listed for this course.',
    'not-found': 'That instructor is not listed for this course.',
  };
  const content = result.added ? `Added <@${instructor.id}> to **${result.course.name}**.` : result.removed ? `Removed <@${instructor.id}> from **${result.course.name}**.` : messages[result.reason];
  await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { users: [] } });
}
