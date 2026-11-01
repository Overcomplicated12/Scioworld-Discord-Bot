import { PilotError } from './pilot.js';

// Fetch only a message explicitly linked by its author. No message-content intent
// or passive monitoring is needed: moderators read the original public message.
export async function verifyDiscussionLink(guild, userId, url, activity, seasonEnd) {
  const match = url.trim().match(/^https:\/\/(?:www\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)$/);
  if (!match || match[1] !== guild.id || match[2] !== activity.threadId) {
    throw new PilotError('Link your own message in this question’s discussion thread.');
  }
  let channel, message;
  try {
    channel = await guild.channels.fetch(match[2]);
    if (!channel?.isThread()) throw new Error('Not a thread');
    message = await channel.messages.fetch(match[3]);
  } catch {
    throw new PilotError('That message is unavailable. Check the link and the bot’s thread permissions.');
  }
  if (message.author.id !== userId || message.author.bot || message.system) {
    throw new PilotError('You can only submit your own discussion message.');
  }
  if (message.createdTimestamp < activity.opensAt || message.createdTimestamp >= seasonEnd) {
    throw new PilotError('The message must have been written during this activity’s season.');
  }
  return { guildId: guild.id, threadId: channel.id, messageId: message.id, authorId: userId, createdAt: message.createdTimestamp, url: `https://discord.com/channels/${guild.id}/${channel.id}/${message.id}` };
}

export async function ensureDiscussionThread(message, channel, activity) {
  if (activity.threadId) return activity.threadId;
  if (message.thread) return message.thread.id;
  try {
    const thread = await message.startThread({ name: `Discuss: ${activity.id}`.slice(0, 100), autoArchiveDuration: 1440, reason: 'Public discussion for the daily ScioCulture question' });
    return thread.id;
  } catch (error) {
    // A previous attempt may have created the thread before the bot restarted.
    if (error.code !== 160004) throw error;
    const thread = await channel.guild.channels.fetch(message.id);
    if (!thread?.isThread()) throw error;
    return thread.id;
  }
}
