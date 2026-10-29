import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { collectibles } from '../collectibles.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('sets').setDescription('View collectible set progress.');

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const profile = store.getOrCreate(interaction.guildId, interaction.user.id);
  const grouped = new Map();
  for (const item of collectibles) {
    if (!grouped.has(item.set)) grouped.set(item.set, []);
    grouped.get(item.set).push(item);
  }
  const lines = [...grouped.entries()].map(([set, items]) => `**${set}** — ${items.filter(item => profile.collectibles.includes(item.id)).length}/${items.length} collected`);
  await interaction.reply({ content: `**Collectible sets**\n${lines.join('\n')}`, flags: MessageFlags.Ephemeral });
}
