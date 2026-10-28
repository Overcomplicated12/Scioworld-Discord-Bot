import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

function utcDate(offsetDays = 0) { return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10); }
export const data = new SlashCommandBuilder().setName('daily').setDescription('Claim today\'s ScioVirtual daily reward.');

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const result = store.claimDaily(interaction.guildId, interaction.user.id, utcDate(), utcDate(-1));
  if (!result.claimed) { await interaction.reply({ content: 'You already claimed today\'s reward. Come back tomorrow!', flags: MessageFlags.Ephemeral }); return; }
  await interaction.reply({ content: `Daily reward claimed: **+${result.reward} Sciocoins** and **+5 knowledge points**. Your streak is **${result.profile.streak} day${result.profile.streak === 1 ? '' : 's'}**!`, flags: MessageFlags.Ephemeral });
}
