import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, MessageFlags } from 'discord.js';
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
    { name: 'Discuss next chapter', value: 'discuss' },
    { name: 'Progress', value: 'progress' },
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
  const progress = store.getLoreProgress(interaction.guildId, stories);
  if (action === 'progress') {
    const lines = stories.map(story => `**${safe(story.title)}** — ${Math.min(progress[story.id] + 1, story.entries.length)}/${story.entries.length} chapters available`);
    await interaction.reply({ content: `**Lore progress**\n${lines.join('\n')}\n\nUnlock the next chapter by discussing it with two other people, then joining the discussion prompt.`, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    return;
  }
  const approved = store.listLoreSubmissions(interaction.guildId, 'approved').map(submission => ({ story: { title: 'Community submissions', author: `<@${submission.authorId}>`, tags: submission.tags }, id: submission.id, title: submission.title, text: submission.text, tags: submission.tags }));
  const unlockedEntries = entries.filter(entry => (progress[entry.story.id] ?? 0) >= entry.story.entries.indexOf(entry));
  const visibleEntries = [...unlockedEntries, ...approved];
  if (action === 'discuss') {
    const candidates = stories.filter(story => (progress[story.id] ?? 0) < story.entries.length);
    if (!candidates.length) { await interaction.reply({ content: 'Every current lore chapter is unlocked. Ask the community to submit a new story.', flags: MessageFlags.Ephemeral }); return; }
    const story = candidates[Math.floor(Math.random() * candidates.length)];
    const nextEntry = story.entries[progress[story.id] ?? 0];
    const prompt = `What should the Frog learn from **${nextEntry.title}**? Discuss it in this channel, then click **I joined**. Three different people unlock the chapter.`;
    const result = store.startLoreDiscussion(interaction.guildId, story.id, nextEntry.id, prompt);
    if (!result.started) { await interaction.reply({ content: `A discussion for **${story.title}** is already active in this server. Join that prompt when you see it.`, flags: MessageFlags.Ephemeral }); return; }
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`lore-discuss:${interaction.guildId}:${story.id}:${nextEntry.id}`).setLabel('I joined the discussion').setStyle(ButtonStyle.Primary));
    await interaction.reply({ content: `📖 **Lore discussion: ${safe(story.title)}**\n${prompt}`, components: [row] });
    return;
  }
  const allEntries = [...entries, ...approved];
  if (action === 'list') {
    const content = stories.length
      ? `**ScioVirtual lore**\n${stories.map(story => `• **${safe(story.title)}** — ${safe(story.description)} (${Math.min((progress[story.id] ?? 0) + 1, story.entries.length)}/${story.entries.length} chapters available)`).join('\n')}${approved.length ? `\n• **Community submissions** — ${approved.length} approved entr${approved.length === 1 ? 'y' : 'ies'}` : ''}`
      : 'No lore stories have been added yet.';
    await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    return;
  }
  if (action === 'search') {
    if (!query) { await interaction.reply({ content: 'Add a search term, for example `/lore action:search query:frog`.', flags: MessageFlags.Ephemeral }); return; }
    const matches = [...visibleEntries].filter(({ story, id, title, text, tags = [] }) => [story.title, story.author, id, title, text, ...story.tags, ...tags].join(' ').toLowerCase().includes(query));
    const content = matches.length
      ? `**Lore search: ${safe(query)}**\n${matches.slice(0, 10).map(({ story, title, text }) => `• **${safe(title)}** — ${safe(story.title)}\n  ${safe(text)}`).join('\n')}`
      : `No lore entries matched **${safe(query)}**.`;
    await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    return;
  }
  if (!visibleEntries.length) { await interaction.reply({ content: 'No lore stories have been added yet.', flags: MessageFlags.Ephemeral }); return; }
  const { story, title, text, tags = [] } = visibleEntries[Math.floor(Math.random() * visibleEntries.length)];
  await interaction.reply({ content: `📖 **${safe(story.title)}**\n**${safe(title)}**\n${safe(text)}\n\n*Contributed by ${safe(story.author)}${tags.length ? ` · ${tags.map(safe).join(', ')}` : ''}*`, allowedMentions: { parse: [] } });
}

export async function handleButton(interaction) {
  const [, guildId, storyId, entryId] = interaction.customId.split(':');
  if (interaction.guildId !== guildId) return;
  const result = store.joinLoreDiscussion(guildId, interaction.user.id, storyId, entryId);
  if (!result.joined) { await interaction.reply({ content: result.reason === 'already-joined' ? 'You already joined this discussion.' : 'That discussion is no longer active.', flags: MessageFlags.Ephemeral }); return; }
  if (result.unlocked) await interaction.message.edit({ content: `${interaction.message.content}\n\n🔓 **Chapter unlocked!** Three community members joined the discussion. Use /lore to read it.`, components: [] });
  await interaction.reply({ content: result.unlocked ? 'You helped unlock the next lore chapter!' : `You joined. ${3 - result.discussion.participants.length} more participant${3 - result.discussion.participants.length === 1 ? '' : 's'} needed.`, flags: MessageFlags.Ephemeral });
}
