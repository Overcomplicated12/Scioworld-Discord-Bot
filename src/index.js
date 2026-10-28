import 'dotenv/config';
import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { commands, trivia } from './commands/index.js';

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN in .env.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const commandsByName = new Map(commands.map(command => [command.data.name, command]));

client.once(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}.`);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton() && interaction.customId.startsWith('trivia:')) {
    try {
      await trivia.handleButton(interaction);
    } catch (error) {
      console.error('Trivia button failed:', error);
      if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'That trivia answer could not be processed.', flags: MessageFlags.Ephemeral });
    }
    return;
  }
  if (!interaction.isChatInputCommand()) return;
  const command = commandsByName.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error('Command failed:', error);
    try {
      const response = { content: 'Something went wrong while running that command.', flags: MessageFlags.Ephemeral };
      if (interaction.replied || interaction.deferred) await interaction.followUp(response);
      else await interaction.reply(response);
    } catch (replyError) {
      console.error('Could not send the error response:', replyError);
    }
  }
});

client.on(Events.Error, error => console.error('Discord client error:', error));
client.login(process.env.DISCORD_TOKEN).catch(() => {
  console.error('Could not log in to Discord. Check the bot token and network connection.');
  process.exitCode = 1;
});
