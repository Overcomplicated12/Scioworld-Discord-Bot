import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const adminOnly = interaction => interaction.guild?.ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
export const data = new SlashCommandBuilder().setName('camp-course').setDescription('Add or remove a camp course category.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(command => command.setName('add').setDescription('Add a course tied to a Discord role.').addStringOption(option => option.setName('name').setDescription('Course name').setMaxLength(80).setRequired(true)).addRoleOption(option => option.setName('role').setDescription('Role students use for this course').setRequired(true)))
  .addSubcommand(command => command.setName('remove').setDescription('Remove a course category.').addStringOption(option => option.setName('name').setDescription('Course name').setMaxLength(80).setRequired(true)));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  if (!adminOnly(interaction)) { await interaction.reply({ content: 'Only the server owner or an administrator can manage camp courses.', flags: MessageFlags.Ephemeral }); return; }
  const action = interaction.options.getSubcommand();
  if (action === 'add') {
    const role = interaction.options.getRole('role');
    const result = store.addCampCourse(interaction.guildId, interaction.options.getString('name'), role.id, role.name);
    await interaction.reply({ content: result.added ? `Added **${result.course.name}** and linked it to the ${role} role.` : 'That course already exists.', flags: MessageFlags.Ephemeral, allowedMentions: { roles: [] } });
    return;
  }
  const result = store.removeCampCourse(interaction.guildId, interaction.options.getString('name'));
  await interaction.reply({ content: result.removed ? `Removed **${result.course.name}** and its instructor list.` : 'That course was not found.', flags: MessageFlags.Ephemeral });
}
