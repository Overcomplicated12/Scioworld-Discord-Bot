import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { pollBank } from './polls.js';
import { store } from './store.js';
import { omModes, randomOmMessageForMode, randomSillyOmMessage } from './om.js';

const DAY = 24 * 60 * 60 * 1000;
const YEAR = 366 * DAY;
let pollSchedulerRunning = false;

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
  if (pollSchedulerRunning) return;
  pollSchedulerRunning = true;
  try {
    for (const guild of client.guilds.cache.values()) {
      try {
        if (store.pilotQuiet(guild.id)) continue;
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
  } finally {
    pollSchedulerRunning = false;
  }
}

export async function checkOmSchedules(client, nowMs = Date.now()) {
  for (const guild of client.guilds.cache.values()) {
    try {
      if (store.pilotQuiet(guild.id)) continue;
      const pollSchedule = store.getPollSchedule(guild.id, nowMs);
      // nextDueAt points to the *next* weekly poll after markPollSent(). The
      // Om activity belongs to the poll that was just posted, so anchor it to
      // that poll's persisted send time instead of the next due date.
      const activationAt = Number.isFinite(pollSchedule.lastSentAt) ? pollSchedule.lastSentAt + DAY : Infinity;
      const activationKey = Number.isFinite(pollSchedule.lastSentAt) ? String(pollSchedule.lastSentAt) : null;
      const omSchedule = store.getOmSchedule(guild.id);
      if (activationKey && nowMs >= activationAt && omSchedule.targetId && omSchedule.optedIn.includes(omSchedule.targetId) && omSchedule.activatedFor !== activationKey) {
        if (!omSchedule.modePoll) {
          const channel = await findChannel(guild, pollSchedule.channelId);
          if (channel) {
            const choices = omModes.map(mode => `**${mode.label}**`).join('\n');
            const row = new ActionRowBuilder().addComponents(omModes.map(mode => new ButtonBuilder().setCustomId(`om-mode:${guild.id}:${mode.id}`).setLabel(mode.label).setStyle(ButtonStyle.Primary)));
            await channel.send({ content: `🧪 **Choose this week’s Om challenge style**\nVote by using the buttons below. The poll closes in one hour.\n${choices}`, components: [row] });
            store.beginOmModePoll(guild.id, activationKey, nowMs, channel.id);
          }
          continue;
        }
        if (nowMs >= omSchedule.modePoll.endsAt) {
          store.finishOmModePoll(guild.id, nowMs);
          store.activateOm(guild.id, activationKey, nowMs);
        }
      }
      const result = store.recordOmMessage(guild.id, nowMs);
      if (!result.sent) continue;
      const target = await client.users.fetch(result.targetId);
      await target.send(`🧪 **Om challenge**\n${randomOmMessageForMode(result.mode)}\n\nYou are receiving this because you opted in. Use /torture-om opt-out at any time.`);
    } catch (error) {
      console.error(`Om challenge scheduler failed for guild ${guild.id}:`, error);
    }
  }
}

export async function checkBotherOmSchedules(client, nowMs = Date.now()) {
  for (const guild of client.guilds.cache.values()) {
    try {
      const schedule = store.getOmSchedule(guild.id);
      if (schedule.botherPoll && nowMs >= schedule.botherPoll.endsAt) {
        const poll = { ...schedule.botherPoll };
        const result = store.finishBotherPoll(guild.id, nowMs);
        if (poll.messageId) {
          const channel = guild.channels.cache.get(poll.channelId);
          const message = await channel?.messages.fetch(poll.messageId).catch(() => null);
          const summary = result.option
            ? `The vote is closed. **${result.option.label}** won; messages are spaced one hour apart.`
            : result.cancelled ? 'The vote closed because Om opted out. No action was sent.' : 'The vote closed with no votes, so no action was sent.';
          await message?.edit({ content: `${message.content}\n\n${summary}`, components: [] }).catch(() => {});
        }
      }
      const action = store.getOmSchedule(guild.id).botherAction;
      if (!action || nowMs < action.nextAt) continue;
      const claimed = store.recordBotherSend(guild.id, nowMs);
      if (!claimed.sent) continue;
      try {
        if (claimed.action.kind === 'ping') {
          const channel = await findChannel(guild, claimed.action.channelId);
          if (!channel) throw new Error('No text channel is available for the opted-in ping.');
          await channel.send({ content: `<@${claimed.action.targetId}>`, allowedMentions: { users: [claimed.action.targetId] } });
        } else {
          const target = await client.users.fetch(claimed.action.targetId);
          const text = claimed.action.kind === 'silly-dm' ? randomSillyOmMessage() : 'Hi 👋';
          await target.send(`📨 ${text}\n\nYou opted into the Om challenge. Use /torture-om opt-out to stop future messages.`);
        }
        if (claimed.complete) {
          const channel = guild.channels.cache.get(claimed.action.channelId);
          await channel?.send({ content: '✅ Om has been tortured. Thanks for voting!', allowedMentions: { parse: [] } }).catch(() => {});
        }
      } catch (error) {
        store.closeBotherPoll(guild.id);
        console.error(`Bother Om delivery failed for guild ${guild.id}:`, error);
      }
    } catch (error) {
      console.error(`Bother Om scheduler failed for guild ${guild.id}:`, error);
    }
  }
}
