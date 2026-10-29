import { SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('leaderboard').setDescription('Show the server leaderboard.')
  .addStringOption(option => option.setName('metric').setDescription('What to rank').setRequired(false).addChoices(
    { name: 'Knowledge points', value: 'knowledgePoints' }, { name: 'Sciocoins', value: 'coins' }, { name: 'Daily streak', value: 'streak' },
  ));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const metric = interaction.options.getString('metric') || 'knowledgePoints'; const labels = { knowledgePoints: 'knowledge points', coins: 'Sciocoins', streak: 'daily streak' };
  const profiles = store.listProfiles(interaction.guildId, metric).slice(0, 10);
  if (!profiles.length) { await interaction.reply('No public profiles are on the leaderboard yet. Use `/privacy` to control your visibility.'); return; }
  const lines = profiles.map((profile, index) => `${index + 1}. <@${profile.userId}> — **${profile[metric] || 0}** ${labels[metric]}`);
  await interaction.reply({ content: `**${labels[metric]} leaderboard**\n${lines.join('\n')}`, allowedMentions: { users: profiles.map(profile => profile.userId) } });
}
