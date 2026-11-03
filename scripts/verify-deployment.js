import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from '../src/commands/index.js';

const required = ['DISCORD_TOKEN', 'DISCORD_APPLICATION_ID'];
const missing = required.filter(name => !process.env[name]);
if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);

let processes;
try { processes = JSON.parse(execFileSync('pm2', ['jlist'], { encoding: 'utf8' })); }
catch { throw new Error('Could not query PM2. Run this on the deployment host with PM2 installed.'); }
const app = processes.find(process => process.name === 'scioworld');
if (!app || app.pm2_env?.status !== 'online') throw new Error('PM2 app scioworld is not online.');
const logPath = app.pm2_env?.pm_out_log_path;
if (!logPath || !fs.existsSync(logPath)) throw new Error('PM2 output log was not found.');
const recentLog = fs.readFileSync(logPath, 'utf8').split('\n').slice(-200).join('\n');
if (!/Logged in as /.test(recentLog)) throw new Error('No recent Discord login found in the PM2 output log.');

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
const registered = process.env.DISCORD_GUILD_ID
  ? await rest.get(Routes.applicationGuildCommands(process.env.DISCORD_APPLICATION_ID, process.env.DISCORD_GUILD_ID))
  : await rest.get(Routes.applicationCommands(process.env.DISCORD_APPLICATION_ID));
const expected = new Set(commands.map(command => command.data.name));
const actual = new Set(registered.map(command => command.name));
const missingCommands = [...expected].filter(name => !actual.has(name));
if (missingCommands.length) throw new Error(`Registered commands are missing: ${missingCommands.join(', ')}`);
console.log(`Deployment verified: PM2 online, recent Discord login, and ${actual.size} registered commands.`);
