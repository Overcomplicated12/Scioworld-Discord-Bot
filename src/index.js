import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  verifyKey
} from 'discord-interactions';
import { CAMP } from './camp-data.js';
import { EXPLORE_COOLDOWN_SECONDS, FROG_QUOTES, getWorldStatus, rollExploration } from './game.js';

const R = InteractionResponseType;
const EPHEMERAL = InteractionResponseFlags.EPHEMERAL;
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
function reply(content, ephemeral = false) {
  return json({ type: R.CHANNEL_MESSAGE_WITH_SOURCE, data: {
    content, ...(ephemeral ? { flags: EPHEMERAL } : {}), allowed_mentions: { parse: [] }
  } });
}
function getGuild(interaction) { return interaction.guild_id; }
function getUser(interaction) { return interaction.member?.user?.id ?? interaction.user?.id; }
function getOption(interaction, name) {
  return interaction.data.options?.find(o => o.name === name)?.value;
}
async function initialize(env, guildId, userId) {
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO worlds (guild_id) VALUES (?)').bind(guildId),
    env.DB.prepare('INSERT OR IGNORE INTO players (guild_id,user_id) VALUES (?,?)').bind(guildId, userId)
  ]);
}
async function player(env, guildId, userId) {
  return env.DB.prepare('SELECT * FROM players WHERE guild_id=? AND user_id=?').bind(guildId, userId).first();
}
async function world(env, guildId) {
  return env.DB.prepare('SELECT total_points FROM worlds WHERE guild_id=?').bind(guildId).first();
}

async function onCommand(interaction, env) {
  const name = interaction.data.name;
  const guild = getGuild(interaction);
  const user = getUser(interaction);
  if (!guild || !user) return reply('Please use this bot in the ScioVirtual Discord server.', true);
  if (!env.DB) return reply('Database is not configured yet. Please contact the bot maintainers.', true);

  if (name === 'camp') {
    const which = interaction.data.options?.[0]?.name;
    const key = ({ resources: 'resources', courses: 'courses', schedule: 'events' })[which];
    if (!key) return reply('Choose resources, courses, or schedule.', true);
    const rows = CAMP[key];
    if (!rows.length) return reply(`No ${which} have been published yet. The directors can add approved entries to src/camp-data.js.`, true);
    const lines = rows.slice(0, 10).map(r => {
      const title = r.title || r.name;
      const details = r.description || r.when || '';
      // Only team-authored static content lives in camp-data.js; no student input.
      return `• **${title}**${details ? ` — ${details}` : ''}${r.url ? `\n  ${r.url}` : ''}`;
    });
    return reply(`**ScioCamp ${which}**\n${lines.join('\n')}`, true);
  }

  await initialize(env, guild, user);
  if (name === 'start') return reply('Welcome to **ScioWorld**! Explore for resources with `/explore`, help construct the Frog Republic with `/build`, and see progress with `/world`. Your inventory is saved automatically.', true);
  if (name === 'inventory') {
    const p = await player(env, guild, user);
    return reply(`**Your ScioWorld inventory**\n🪙 Coins: ${p.coins}\n🪵 Wood: ${p.wood}\n🪨 Stone: ${p.stone}\n🐸 Frog artifacts: ${p.artifacts}\n🏗️ Community points contributed: ${p.contributed}`, true);
  }
  if (name === 'world') {
    const w = await world(env, guild);
    const state = getWorldStatus(w.total_points);
    const completed = state.built.length ? state.built.map(b => b.name).join(', ') : 'Nothing yet';
    return reply(`🌍 **The Frog Republic**\n🏛️ Civilization level: ${state.level}\n✅ Constructed: ${completed}\n🔨 Next project: **${state.next.name}**\n📊 ${w.total_points}/${state.next.target} total construction points (${state.pointsRemaining} to go)\n\nUse /explore for materials, then /build to contribute.`);
  }
  if (name === 'explore') {
    const now = Math.floor(Date.now() / 1000);
    const reward = rollExploration();
    // Conditional update prevents rapid repeated rewards even with concurrent requests.
    const result = await env.DB.prepare(`
      UPDATE players SET coins=coins+?, wood=wood+?, stone=stone+?, artifacts=artifacts+?, last_explore_at=?
      WHERE guild_id=? AND user_id=? AND last_explore_at <= ?
      RETURNING coins,wood,stone,artifacts
    `).bind(reward.coins, reward.wood, reward.stone, reward.artifacts,
      now, guild, user, now - EXPLORE_COOLDOWN_SECONDS).first();
    if (!result) {
      const p = await player(env, guild, user);
      return reply(`Your expedition team is recovering. Explore again <t:${p.last_explore_at + EXPLORE_COOLDOWN_SECONDS}:R>.`, true);
    }
    return reply(`🧭 **Expedition complete!** ${reward.headline}\n+${reward.coins} coins · +${reward.wood} wood · +${reward.stone} stone${reward.artifacts ? ` · +${reward.artifacts} artifact 🐸` : ''}`);
  }
  if (name === 'build') {
    const resource = getOption(interaction, 'resource');
    const amount = getOption(interaction, 'amount');
    if (!['wood', 'stone'].includes(resource) || !Number.isInteger(amount) || amount < 1 || amount > 20) return reply('Please choose wood/stone and 1–20 units.', true);
    const points = amount * (resource === 'stone' ? 2 : 1);
    try {
      // Atomic SQLite triggers validate balance and update both player and world.
      await env.DB.prepare(`INSERT INTO contributions
        (interaction_id,guild_id,user_id,resource,amount,points) VALUES (?,?,?,?,?,?)`)
        .bind(interaction.id, guild, user, resource, amount, points).run();
    } catch (err) {
      const message = String(err);
      if (message.includes('INSUFFICIENT_RESOURCES')) return reply(`Not enough ${resource}. Try /explore first.`, true);
      if (message.includes('UNIQUE constraint failed')) return reply('That contribution has already been recorded.', true);
      throw err;
    }
    const w = await world(env, guild);
    const state = getWorldStatus(w.total_points);
    return reply(`🏗️ <@${user}> contributed **${amount} ${resource}** (+${points} points).\nThe Frog Republic has **${w.total_points}** construction points. Next: **${state.next.name}** at ${state.next.target}.`);
  }
  if (name === 'leaderboard') {
    const top = await env.DB.prepare(`SELECT user_id,contributed FROM players
      WHERE guild_id=? ORDER BY contributed DESC, joined_at ASC LIMIT 10`).bind(guild).all();
    const lines = top.results.map((p, i) => `${i + 1}. <@${p.user_id}> — ${p.contributed} pts`);
    return reply(`🏆 **ScioWorld Contributors**\n${lines.join('\n') || 'No contributors yet.'}`);
  }
  if (name === 'frog') return reply(`🐸 **Frog of Wisdom:** ${FROG_QUOTES[Math.floor(Math.random() * FROG_QUOTES.length)]}`);
  return reply('Unknown command. Try `/start` or `/world`.', true);
}

export default {
  async fetch(request, env) {
    if (request.method === 'GET') return new Response('ScioWorld Discord bot is online. Use commands inside Discord.');
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const signature = request.headers.get('x-signature-ed25519');
    const timestamp = request.headers.get('x-signature-timestamp');
    const rawBody = await request.text();
    if (!signature || !timestamp || !env.DISCORD_PUBLIC_KEY ||
        !(await verifyKey(rawBody, signature, timestamp, env.DISCORD_PUBLIC_KEY))) {
      return new Response('Invalid signature', { status: 401 });
    }
    let interaction;
    try { interaction = JSON.parse(rawBody); }
    catch { return new Response('Invalid JSON', { status: 400 }); }
    if (interaction.type === InteractionType.PING) return json({ type: R.PONG });
    if (interaction.type !== InteractionType.APPLICATION_COMMAND) return reply('Unsupported interaction.', true);
    try { return await onCommand(interaction, env); }
    catch (error) {
      console.error('ScioWorld command error:', error);
      return reply('Something went wrong. Please notify the bot maintainers.', true);
    }
  }
};
