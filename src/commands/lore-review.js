import { checkPilotSchedules } from '../pilot-scheduler.js';
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const adminOnly = interaction => interaction.guild?.ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
export const data = new SlashCommandBuilder().setName('lore-review').setDescription('Review student lore submissions.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(command => command.setName('list').setDescription('List pending lore submissions.').addIntegerOption(option => option.setName('page').setDescription('Page number').setMinValue(1)))
  .addSubcommand(command => command.setName('approve').setDescription('Approve a lore submission.').addStringOption(option => option.setName('submission_id').setDescription('Submission ID, such as LS0001').setRequired(true)))
  .addSubcommand(command => command.setName('reject').setDescription('Reject a lore submission.').addStringOption(option => option.setName('submission_id').setDescription('Submission ID').setRequired(true)));

export async function execute(interaction, persistence = store, dispatch = checkPilotSchedules) {
  if (!requireGuild(interaction)) return;
  if (!adminOnly(interaction)) { await interaction.reply({ content: 'Only the server owner or an administrator can review lore submissions.', flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } }); return; }
  const action = interaction.options.getSubcommand();
  if (action === 'list') {
    const page = (interaction.options.getInteger('page') || 1) - 1;
    const submissions = persistence.listLoreSubmissions(interaction.guildId, 'pending').slice(page, page + 1);
    await interaction.reply({ content: submissions.length ? `**Pending lore**\n\n${submissions.map(item => `**${item.id}** — ${item.title}\n${item.text.slice(0, 1400)}\nPublication approval does not grant stamps. Use /pilot reward-lore separately.`).join('\n\n')}` : 'There are no pending lore submissions.', flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    return;
  }
  const id = interaction.options.getString('submission_id');
  const result = persistence.updateLoreSubmission(interaction.guildId, id, action === 'approve' ? 'approved' : 'rejected');
  if (result.updated && action === 'approve') void dispatch(interaction.client).catch(error => console.error('Lore approval notification queued for retry:', error.message));
  await interaction.reply({ content: result.updated ? `Lore submission **${id}** was **${result.submission.status}**.` : 'That submission was not found.', flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
}
