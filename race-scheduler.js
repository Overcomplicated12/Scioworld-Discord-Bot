import { store } from './src/store.js';

export async function checkRaceSchedules(client, persistence = store, now = Date.now()) {
  for (const guild of client.guilds.cache.values()) {
    const expired = persistence.expireRaces(guild.id, now);
    for (const race of expired) {
      if (!race.channelId) continue;
      try {
        const channel = await guild.channels.fetch(race.channelId);
        if (!channel?.isTextBased?.()) continue;
        const detail = race.round < 0 ? 'No one started the lobby within 15 minutes.' : 'No answers were recorded for 10 minutes.';
        await channel.send(`⏱️ Race **${race.id}** timed out. ${detail} Create a new race whenever you are ready.`);
      } catch (error) {
        console.error(`Could not post timeout for race ${race.id}:`, error.message);
      }
    }
  }
}
