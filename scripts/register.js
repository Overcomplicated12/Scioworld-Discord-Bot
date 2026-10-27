import { COMMANDS } from '../src/commands.js';

const mode = process.argv[2];
const appId = process.env.DISCORD_APPLICATION_ID;
const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;
if (!appId || !token) throw new Error('Set DISCORD_APPLICATION_ID and DISCORD_TOKEN in .dev.vars');
if (mode !== 'guild' && mode !== 'global') throw new Error('Pass guild or global');
if (mode === 'guild' && !guildId) throw new Error('Set DISCORD_GUILD_ID for guild registration');
const base = `https://discord.com/api/v10/applications/${appId}`;
const url = mode === 'guild' ? `${base}/guilds/${guildId}/commands` : `${base}/commands`;
const response = await fetch(url, {
  method: 'PUT',
  headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(COMMANDS)
});
const body = await response.json();
if (!response.ok) throw new Error(`Discord ${response.status}: ${JSON.stringify(body)}`);
console.log(`Registered ${body.length} ${mode} commands.`);
