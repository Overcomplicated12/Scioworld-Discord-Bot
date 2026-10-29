import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('camp-resources').setDescription('See instructors for the camp courses in your roles.');

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const roleIds = new Set(interaction.member.roles.cache.keys());
  const visible = store.getCampResources(interaction.guildId).filter(course => roleIds.has(course.roleId));
  if (!visible.length) {
    await interaction.reply({ content: 'No camp course resources match your current roles. Ask a moderator to check your course role.', flags: MessageFlags.Ephemeral });
    return;
  }
  const lines = visible.map(course => {
    const instructors = course.instructors.length ? course.instructors.map(instructor => `<@${instructor.userId}>`).join(', ') : 'No instructors listed yet.';
    return `**${course.name}**\nRole: ${course.roleName}\nInstructors: ${instructors}`;
  });
  await interaction.reply({ content: `**Camp resources**\n\n${lines.join('\n\n')}`, allowedMentions: { users: [] } });
}
