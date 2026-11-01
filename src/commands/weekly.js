import { verifyDiscussionLink } from '../discussion-links.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, MessageFlags } from 'discord.js';
import { store } from '../store.js';
import { PilotError } from '../pilot.js';
import { requireGuild } from './utils.js';
export const data = new SlashCommandBuilder().setName('question').setDescription('Answer today’s science question or check your private feedback.')
  .addStringOption(o => o.setName('activity').setDescription('Optional activity ID to revisit'))
  .addStringOption(o => o.setName('season').setDescription('Optional previous season ID'));
export const privateReply = (content) => ({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
export function activityMessage(result, now = Date.now()) {
  const { activity: a, season, simulation } = result;
  const closed = now >= a.closesAt;
  const header = `${simulation ? '**SIMULATION — no real prizes or currency**\n' : ''}🧪 **${a.id} · ${a.format === 'truths' ? 'Two Truths and a Lie' : a.format === 'prediction' ? 'Science Prediction' : 'Science Discussion'}**`;
  let content = `${header}\n${a.prompt}\n\n${a.choices.map((c,i)=>`**${i+1}.** ${c}`).join('\n')}\n\n${closed ? 'Answers closed' : 'Answers close'} <t:${Math.floor(a.closesAt/1000)}:F>.`;
  if (closed) content += `\n\n${a.explanations.map((e,i)=>`**${i+1}:** ${e} (${result.distribution?.[i] || 0} votes)`).join('\n')}\n${a.source ? `Source: ${a.source}` : 'This question has no single correct answer.'}`;
  else content += '\nChoose below. You can revise until the deadline; each person earns one answer stamp.';
  content += '\nUse `/question` for your private answer and review feedback. Join the public thread to compare ideas. Submit a link to your own message for optional stamp review. Button choices stay private; anything you write in the thread is public.';
  const rows = [];
  if (!closed && now >= a.opensAt) rows.push(new ActionRowBuilder().addComponents(a.choices.map((_,i)=>new ButtonBuilder().setCustomId(`weekly:answer:${season}:${a.id}:${i}`).setLabel(`Choice ${i+1}`).setStyle(ButtonStyle.Primary))));
  const discussionButtons = new ActionRowBuilder();
  if (a.threadId && result.guildId) discussionButtons.addComponents(new ButtonBuilder().setURL(`https://discord.com/channels/${result.guildId}/${a.threadId}`).setLabel('Join discussion').setStyle(ButtonStyle.Link));
  discussionButtons.addComponents(new ButtonBuilder().setCustomId(`weekly:link:${season}:${a.id}`).setLabel('Submit discussion for review').setStyle(ButtonStyle.Secondary));
  rows.push(discussionButtons);
  return { embeds: [{ description: content }], components: rows, allowedMentions: { parse: [] } };
}
export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  try {
    const result = store.pilot(interaction.guildId, interaction.user.id, 'weekly', { activity: interaction.options.getString('activity'), season: interaction.options.getString('season') });
    const payload = activityMessage(result);
    payload.embeds[0].description += `\n\n**Your answer:** ${result.answer ? result.activity.choices[result.answer.choice] : 'Not submitted'}.`;
    if (result.discussion) payload.embeds[0].description += `\n**Your explanation:** ${result.discussion.status}${result.discussion.reason ? ` — ${result.discussion.reason}` : ''}`;
    await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  } catch (e) { if (!(e instanceof PilotError)) throw e; if (interaction.deferred) await interaction.editReply({ content: e.message, allowedMentions: { parse: [] } }); else await interaction.reply(privateReply(e.message)); }
}
export async function handleInteraction(interaction, persistence = store) {
  if (!requireGuild(interaction)) return;
  const [, action, season, activity, choice] = interaction.customId.split(':');
  try {
    if (action === 'link') {
      const text = new TextInputBuilder().setCustomId('message-link').setLabel('Link to your public discussion message').setStyle(TextInputStyle.Short).setMaxLength(200).setRequired(true);
      await interaction.showModal(new ModalBuilder().setCustomId(`weekly:link-submit:${season}:${activity}`).setTitle('Submit your discussion').addComponents(new ActionRowBuilder().addComponents(text)));
      return;
    }
    if (action === 'link-submit' && interaction.isModalSubmit()) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const result = persistence.pilot(interaction.guildId, interaction.user.id, 'weekly', { season, activity });
      const sourceMessage = await verifyDiscussionLink(interaction.guild, interaction.user.id, interaction.fields.getTextInputValue('message-link'), result.activity, result.seasonEnd);
      persistence.pilot(interaction.guildId, interaction.user.id, 'discuss', { season, activity, sourceMessage, text: `Public contribution: ${sourceMessage.url}\nReview the linked message in its thread.` });
      await interaction.editReply({ content: 'Your message link is in the review queue. One approved contribution per question can earn a stamp. Check /question for private feedback.', allowedMentions: { parse: [] } });
      return;
    }
    // Older private modals remain private; never republish their contents.
    if (action === 'explain') {
      const text = new TextInputBuilder().setCustomId('reasoning').setLabel('Your reasoning or follow-up question').setStyle(TextInputStyle.Paragraph).setMaxLength(1000).setRequired(true);
      await interaction.showModal(new ModalBuilder().setCustomId(`weekly:submit:${season}:${activity}`).setTitle('Share your reasoning').addComponents(new ActionRowBuilder().addComponents(text)));
      return;
    }
    if (action === 'answer') {
      const result = persistence.pilot(interaction.guildId, interaction.user.id, 'answer', { season, activity, choice: Number(choice) });
      await interaction.reply(privateReply(`${result.simulation ? 'Simulation: ' : ''}Saved: **${result.choice}**. You can revise before the deadline. Your answer stamp is awarded only once. Check /passport for progress.`));
    } else if (action === 'submit' && interaction.isModalSubmit()) {
      persistence.pilot(interaction.guildId, interaction.user.id, 'discuss', { season, activity, text: interaction.fields.getTextInputValue('reasoning') });
      await interaction.reply(privateReply('Your explanation is in the private review queue. Check /question for feedback. It will not be published automatically.'));
    }
  } catch (e) { if (!(e instanceof PilotError)) throw e; if (interaction.deferred) await interaction.editReply({ content: e.message, allowedMentions: { parse: [] } }); else await interaction.reply(privateReply(e.message)); }
}
