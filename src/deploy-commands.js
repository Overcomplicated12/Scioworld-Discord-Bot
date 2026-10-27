import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands/index.js';

const { DISCORD_TOKEN, DISCORD_APPLICATION_ID, DISCORD_GUILD_ID } = process.env;
if (!DISCORD_TOKEN || !DISCORD_APPLICATION_ID || !DISCORD_GUILD_ID) {
  console.error('Set DISCORD_TOKEN, DISCORD_APPLICATION_ID, and DISCORD_GUILD_ID in .env.');
  process.exit(1);
}

try {
  const rest = new REST().setToken(DISCORD_TOKEN);
  await rest.put(
    Routes.applicationGuildCommands(DISCORD_APPLICATION_ID, DISCORD_GUILD_ID),
    { body: commands.map(command => command.data.toJSON()) },
  );
  console.log(`Registered ${commands.length} commands in the test server.`);
} catch (error) {
  console.error('Could not register commands:', error.message);
  process.exitCode = 1;
}
