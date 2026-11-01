import { notifySubmissionStaff } from './staff-notifications.js';
import { ensureDiscussionThread } from './discussion-links.js';
import { createHash } from 'node:crypto';
import { store } from './store.js';
import { activityMessage } from './commands/weekly.js';
let running = false;
export async function checkPilotSchedules(client, now = Date.now(), persistence = store) {
  if (running) return;
  running = true;
  try {
    for (const guild of client.guilds.cache.values()) {
      let jobs;
      try { jobs = persistence.getPilotJobs(guild.id, now); }
      catch (e) { console.error('Pilot schedule read failed:', guild.id, e.message); continue; }
      for (const job of jobs) {
        try {
          if (job.kind === 'staff-submission') {
            const delivered = await notifySubmissionStaff(guild, job);
            persistence.ackPilotJob(guild.id, job, { delivered, now });
            if (!delivered) console.warn('No staff DM delivered; retrying in 15 minutes:', guild.id, job.id);
            continue;
          }
          if (persistence.pilotQuiet(guild.id)) continue;
          if (job.kind === 'qualified') {
            try {
              await (await client.users.fetch(job.userId)).send({ content: `${job.simulation ? '**Simulation only:** ' : ''}You qualified for the ScioCulture seasonal sticker milestone! Use /passport in ${guild.name} to see eligibility and claim status. Organizers handle approval and mailing separately.`, allowedMentions: { parse: [] } });
            } catch (e) {
              // A closed inbox must not cause a DM attempt every minute. Passport is the fallback.
              if (![50007,10013].includes(e.code)) throw e;
            }
            persistence.ackPilotJob(guild.id,job); continue;
          }
          const channel = await guild.channels.fetch(job.channelId);
          if (!channel?.isTextBased()) throw new Error('Configured pilot channel is unavailable.');
          const marker = `ScioCulture season ${job.season} / ${job.activity.id}`;
          let message;
          if (job.activity.messageId) {
            try { message = await channel.messages.fetch(job.activity.messageId); }
            catch (e) { if (e.code !== 10008) throw e; }
          }
          if (!message) {
            // Reconcile a send that succeeded just before a crash, before sending again.
            const recent = await channel.messages.fetch({ limit: 100 });
            message = recent.find(m => m.author.id === client.user.id && m.embeds.some(e => e.footer?.text === marker));
          }
          const payload = activityMessage(job, now);
          payload.embeds[0].footer = { text: marker };
          if (message) await message.edit(payload);
          else message = await channel.send({ ...payload, nonce: createHash('sha256').update(`${guild.id}:${marker}`).digest('hex').slice(0,24), enforceNonce: true });
          // Persist the post before thread creation, so a permissions failure never loses its ID.
          persistence.ackPilotJob(guild.id,job,message.id);
          if (!job.activity.threadId && !job.revealed) {
            job.activity.threadId = await ensureDiscussionThread(message, channel, job.activity);
            const withThread = activityMessage(job, now);
            withThread.embeds[0].footer = { text: marker };
            await message.edit(withThread);
            persistence.ackPilotJob(guild.id,job,message.id);
          }
        } catch (e) { console.error('Pilot delivery failed; will retry:', guild.id,job.season,e.message); }
      }
    }
  } finally { running = false; }
}
