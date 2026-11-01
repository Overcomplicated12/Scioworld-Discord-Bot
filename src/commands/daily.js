import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { store } from '../store.js';
import { dailyFact } from '../daily-facts.js';
import { requireGuild } from './utils.js';

function utcDate(offsetDays = 0) { return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10); }
export const data = new SlashCommandBuilder().setName('daily').setDescription('Claim today\'s ScioVirtual daily reward.');

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const result = store.claimDaily(interaction.guildId, interaction.user.id, utcDate(), utcDate(-1));
  if (!result.claimed) { await interaction.reply({ content: 'You already claimed this optional reward today. Try /question whenever you have time.', flags: MessageFlags.Ephemeral }); return; }
  await interaction.reply({ content: `Daily reward claimed: **+${result.reward} Sciocoins** and **+${result.knowledgePoints} knowledge points**. No streak required.\n\n📚 **Today’s science fact:** ${dailyFact(utcDate())}`, flags: MessageFlags.Ephemeral });
}
