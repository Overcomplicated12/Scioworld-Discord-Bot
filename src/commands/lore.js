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
    { name: 'Solve key clue', value: 'solve' },
    { name: 'Progress', value: 'progress' },
  ))
  .addStringOption(option => option.setName('query').setDescription('Search text, title, tag, or author').setRequired(false))
  .addStringOption(option => option.setName('title').setDescription('Title for a submitted story entry').setMaxLength(120).setRequired(false))
  .addStringOption(option => option.setName('story').setDescription('Story ID for solving a clue').setRequired(false))
  .addStringOption(option => option.setName('answer').setDescription('Your answer to the key clue').setMaxLength(200).setRequired(false));

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
    store.getOrCreate(interaction.guildId, interaction.user.id);
    const submission = store.createLoreSubmission(interaction.guildId, interaction.user.id, title, text, []);
    await interaction.reply({ content: `Submitted **${submission.id}** for lore review. A moderator will decide whether it becomes part of the public archive.`, flags: MessageFlags.Ephemeral });
    return;
  }
  const progress = store.getLoreProgress(interaction.guildId, stories);
  if (action === 'progress') {
    const lines = stories.map(story => `**${safe(story.title)}** — ${Math.min(progress[story.id] + 1, story.entries.length)}/${story.entries.length} chapters available`);
    await interaction.reply({ content: `**Lore progress**\n${lines.join('\n')}\n\nUse /lore action:solve to solve the key clue and unlock the next chapter.`, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    return;
  }
  const approved = store.listLoreSubmissions(interaction.guildId, 'approved').map(submission => ({ story: { title: 'Community submissions', author: `<@${submission.authorId}>`, tags: submission.tags }, id: submission.id, title: submission.title, text: submission.text, tags: submission.tags }));
  const unlockedEntries = entries.filter(entry => (progress[entry.story.id] ?? 0) >= entry.story.entries.indexOf(entry));
  const visibleEntries = [...unlockedEntries, ...approved];
  if (action === 'solve') {
    const candidates = stories.filter(story => (progress[story.id] ?? 0) < story.entries.length);
    if (!candidates.length) { await interaction.reply({ content: 'Every current lore chapter is unlocked. Ask the community to submit a new story.', flags: MessageFlags.Ephemeral }); return; }
    const requestedStory = interaction.options.getString('story')?.trim().toLowerCase();
    const story = candidates.find(item => item.id === requestedStory || item.title.toLowerCase() === requestedStory) || candidates[Math.floor(Math.random() * candidates.length)];
    const nextEntry = story.entries[progress[story.id] ?? 0];
    const clue = nextEntry.unlockClue || `What is the next chapter called? Use the clues in the story so far. Hint tags: ${(nextEntry.tags || []).join(', ') || 'read the previous chapter carefully'}.`;
    const answer = nextEntry.unlockAnswer || nextEntry.title;
    const aliases = nextEntry.unlockAliases || [nextEntry.id];
    const result = store.startLoreChallenge(interaction.guildId, story.id, nextEntry.id, clue, answer, aliases);
    if (!result.started && result.reason !== 'active') { await interaction.reply({ content: 'That lore clue could not be started.', flags: MessageFlags.Ephemeral }); return; }
    const submittedAnswer = interaction.options.getString('answer')?.trim();
    if (submittedAnswer) {
      const attempt = store.answerLoreChallenge(interaction.guildId, interaction.user.id, story.id, nextEntry.id, submittedAnswer);
      const message = attempt.solved ? `🔓 Correct! **${safe(nextEntry.title)}** is now unlocked in **${safe(story.title)}**.` : attempt.reason === 'cooldown' ? `You can try another answer in about **${Math.ceil(attempt.remainingMs / 60000)} minutes**.` : 'That answer does not solve the clue. Talk it through with other players and try again later.';
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
      return;
    }
    await interaction.reply({ content: `🗝️ **Lore key clue: ${safe(story.title)}**\n${safe(result.challenge.clue)}\n\nSubmit your answer with:\n\`/lore action:solve story:${story.id} answer:<your answer>\``, flags: MessageFlags.Ephemeral });
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

