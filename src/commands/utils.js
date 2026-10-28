import { MessageFlags } from 'discord.js';

export function requireGuild(interaction) {
  if (interaction.guildId) return true;
  interaction.reply({ content: 'This command is available inside a Discord server.', flags: MessageFlags.Ephemeral });
  return false;
}

export function mentionOrName(user) { return user?.globalName || user?.displayName || user?.username || 'Player'; }
export function formatCollectible(id) { return id.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' '); }
