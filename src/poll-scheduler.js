import { pollBank } from './polls.js';
import { store } from './store.js';

const DAY = 24 * 60 * 60 * 1000;
const YEAR = 366 * DAY;

async function dmOwner(guild, content) {
  try {
    const owner = await guild.fetchOwner();
    await owner.user.send(content);
  } catch (error) {
    console.warn(`Could not DM poll reminder for guild ${guild.id}:`, error.message);
  }
}

async function findChannel(guild, preferredId) {
  if (preferredId) {
    const preferred = guild.channels.cache.get(preferredId);
    if (preferred?.isTextBased() && preferred.permissionsFor(guild.members.me)?.has('SendMessages')) return preferred;
  }
  if (guild.systemChannel?.isTextBased() && guild.systemChannel.permissionsFor(guild.members.me)?.has('SendMessages')) return guild.systemChannel;
  return guild.channels.cache.find(channel => channel.isTextBased() && channel.permissionsFor(guild.members.me)?.has('SendMessages'));
}

async function sendScheduledPoll(guild, nowMs) {
  const schedule = store.getPollSchedule(guild.id, nowMs);
  const available = pollBank.filter(poll => !store.pollUsedWithinYear(guild.id, poll.id, nowMs));
  if (!available.length) {
    if (!schedule.exhaustedReminderAt || schedule.exhaustedReminderAt < nowMs - 7 * DAY) {
      await dmOwner(guild, 'The weekly poll question bank is exhausted for this server. Please add more poll prompts before the next weekly poll. Existing prompts are protected from reuse for one year.');
      store.markPollExhaustedReminderSent(guild.id, nowMs);
    }
    return;
  }
  const poll = available[Math.floor(Math.random() * available.length)];
  const channel = await findChannel(guild, schedule.channelId);
  if (!channel) {
    await dmOwner(guild, 'I could not find a text channel where I can post the weekly poll. Please give me Send Messages permission in a channel.');
    return;
  }
  await channel.send({ poll: { question: { text: poll.question }, answers: poll.answers.map(text => ({ text })), duration: 168, allowMultiselect: false } });
  store.markPollSent(guild.id, poll.id, nowMs, channel.id);
}

export async function checkPollSchedules(client, nowMs = Date.now()) {
  for (const guild of client.guilds.cache.values()) {
    try {
      const schedule = store.getPollSchedule(guild.id, nowMs);
      if (nowMs >= schedule.nextDueAt - DAY && nowMs < schedule.nextDueAt && !schedule.reminderSent) {
        await dmOwner(guild, 'Your weekly ScioVirtual poll is scheduled for about 24 hours from now. Use `/poll override` if you want to choose this week’s question.');
        store.markPollReminderSent(guild.id);
      }
      if (nowMs >= schedule.nextDueAt) await sendScheduledPoll(guild, nowMs);
    } catch (error) {
      console.error(`Weekly poll scheduler failed for guild ${guild.id}:`, error);
    }
  }
}
