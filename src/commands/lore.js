import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { loadLore } from '../lore.js';
import { requireGuild } from './utils.js';
import { store } from '../store.js';

export const data = new SlashCommandBuilder()
  .setName('lore')
  .setDescription('Explore stories contributed by the ScioVirtual community.')
  .addStringOption(option => option.setName('action').setDescription('What to do').setRequired(false).addChoices(
    { name: 'Random entry', value: 'random' },
    { name: 'List stories', value: 'list' },
    { name: 'Search entries', value: 'search' },
    { name: 'Submit story', value: 'submit' },
  ))
  .addStringOption(option => option.setName('query').setDescription('Search text, title, tag, or author').setRequired(false))
  .addStringOption(option => option.setName('title').setDescription('Title for a submitted story entry').setMaxLength(120).setRequired(false));

function safe(text) { return text.replaceAll('@', '@\u200b'); }

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const { stories, entries } = loadLore();
  const action = interaction.options.getString('action') || 'random';
  const query = interaction.options.getString('query')?.trim().toLowerCase();
  if (action === 'submit') {
    const title = interaction.options.getString('title')?.trim();
    const text = interaction.options.getString('query')?.trim();
    if (!title || !text) { await interaction.reply({ content: 'For a submission, provide both `title` and `query` as the story text.', flags: MessageFlags.Ephemeral }); return; }
    const submission = store.createLoreSubmission(interaction.guildId, interaction.user.id, title, text, []);
    await interaction.reply({ content: `Submitted **${submission.id}** for lore review. A moderator will decide whether it becomes part of the public archive.`, flags: MessageFlags.Ephemeral });
    return;
  }
  const approved = store.listLoreSubmissions(interaction.guildId, 'approved').map(submission => ({ story: { title: 'Community submissions', author: `<@${submission.authorId}>`, tags: submission.tags }, id: submission.id, title: submission.title, text: submission.text, tags: submission.tags }));
  const allEntries = [...entries, ...approved];
  if (action === 'list') {
    const content = stories.length
      ? `**ScioVirtual lore**\n${stories.map(story => `• **${safe(story.title)}** — ${safe(story.description)} (${story.entries.length} entr${story.entries.length === 1 ? 'y' : 'ies'})`).join('\n')}${approved.length ? `\n• **Community submissions** — ${approved.length} approved entr${approved.length === 1 ? 'y' : 'ies'}` : ''}`
      : 'No lore stories have been added yet.';
    await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    return;
  }
  if (action === 'search') {
    if (!query) { await interaction.reply({ content: 'Add a search term, for example `/lore action:search query:frog`.', flags: MessageFlags.Ephemeral }); return; }
    const matches = allEntries.filter(({ story, id, title, text, tags = [] }) => [story.title, story.author, id, title, text, ...story.tags, ...tags].join(' ').toLowerCase().includes(query));
    const content = matches.length
      ? `**Lore search: ${safe(query)}**\n${matches.slice(0, 10).map(({ story, title, text }) => `• **${safe(title)}** — ${safe(story.title)}\n  ${safe(text)}`).join('\n')}`
      : `No lore entries matched **${safe(query)}**.`;
    await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    return;
  }
  if (!allEntries.length) { await interaction.reply({ content: 'No lore stories have been added yet.', flags: MessageFlags.Ephemeral }); return; }
  const { story, title, text, tags = [] } = allEntries[Math.floor(Math.random() * allEntries.length)];
  await interaction.reply({ content: `📖 **${safe(story.title)}**\n**${safe(title)}**\n${safe(text)}\n\n*Contributed by ${safe(story.author)}${tags.length ? ` · ${tags.map(safe).join(', ')}` : ''}*`, allowedMentions: { parse: [] } });
}
