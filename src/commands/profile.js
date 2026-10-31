import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { formatCollectible, mentionOrName, requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('profile').setDescription('View a player profile.')
  .addUserOption(option => option.setName('player').setDescription('The player to view').setRequired(false));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const user = interaction.options.getUser('player') || interaction.user;
  const profile = store.getOrCreate(interaction.guildId, user.id);
  if (user.id !== interaction.user.id && profile.recognitionOptOut) { await interaction.reply({ content: 'That player has opted out of public recognition.', flags: MessageFlags.Ephemeral }); return; }
  const level = Math.floor(profile.knowledgePoints / 100) + 1;
  const title = profile.knowledgePoints >= 500 ? 'Lore Scholar' : profile.knowledgePoints >= 250 ? 'Curious Researcher' : profile.knowledgePoints >= 100 ? 'Question Asker' : 'New Explorer';
  await interaction.reply(`**${mentionOrName(user)}'s ScioVirtual profile**\n**${title}** · Level ${level} · ${profile.knowledgePoints} knowledge points · ${profile.streak}-day daily streak\nSciocoins: **${profile.coins}**\nTrivia streak: **${profile.triviaStreak || 0}** (best ${profile.bestTriviaStreak || 0})\nFeatured collectible: **${formatCollectible(profile.equippedCollectible)}**`);
}
