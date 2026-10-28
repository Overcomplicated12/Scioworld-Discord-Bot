import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { frogQuotes } from '../quotes.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const COOLDOWN_MS = 30 * 60 * 1000;

function formatRemaining(milliseconds) {
  const minutes = Math.ceil(milliseconds / 60_000);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export const data = new SlashCommandBuilder()
  .setName('frog')
  .setDescription('Ask the Frog of Wisdom for a philosopher quote.');

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const result = store.claimFrogQuote(interaction.guildId, interaction.user.id, Date.now(), frogQuotes.length);
  if (result.reason === 'missing-collectible') {
    await interaction.reply({ content: 'You need the **Frog of Wisdom** collectible to use this command.', flags: MessageFlags.Ephemeral });
    return;
  }
  if (result.reason === 'cooldown') {
    await interaction.reply({ content: `The Frog of Wisdom is thinking deeply. Try again in **${formatRemaining(result.remainingMs)}**.`, flags: MessageFlags.Ephemeral });
    return;
  }
  const [author, quote] = frogQuotes[result.quoteIndex];
  await interaction.reply(`🐸 **The Frog of Wisdom**\n> “${quote}”\n— **${author}**\n\n*The Frog will have another thought for you in 30 minutes.*`);
}

export { COOLDOWN_MS };
