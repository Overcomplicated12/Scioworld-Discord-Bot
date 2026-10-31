import 'dotenv/config';
import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { commands, help, omTest, trivia } from './commands/index.js';
import { checkOmSchedules, checkPollSchedules } from './poll-scheduler.js';
import { backupProfileData } from './backups.js';
import { store } from './store.js';

if (!process.env.DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN in .env.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const commandsByName = new Map(commands.map(command => [command.data.name, command]));

client.once(Events.ClientReady, readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}.`);
  try { backupProfileData(); } catch (error) { console.error('Initial profile backup failed:', error); }
  checkPollSchedules(readyClient).catch(error => console.error('Initial poll schedule check failed:', error));
  checkOmSchedules(readyClient).catch(error => console.error('Initial Om schedule check failed:', error));
  setInterval(() => {
    checkPollSchedules(readyClient).catch(error => console.error('Poll schedule check failed:', error));
    checkOmSchedules(readyClient).catch(error => console.error('Om schedule check failed:', error));
  }, 15 * 60 * 1000);
  setInterval(() => {
    try { backupProfileData(); } catch (error) { console.error('Profile backup failed:', error); }
  }, 24 * 60 * 60 * 1000);
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
  if (interaction.isButton() && interaction.customId.startsWith('help:')) {
    try {
      await help.handleButton(interaction);
    } catch (error) {
      console.error('Help page failed:', error);
      if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'That help page could not be opened.', flags: MessageFlags.Ephemeral });
    }
    return;
  }
  if (interaction.isButton() && interaction.customId.startsWith('om-test:')) {
    try {
      await omTest.handleButton(interaction);
    } catch (error) {
      console.error('Om test button failed:', error);
      if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: 'That Om test response could not be processed.', flags: MessageFlags.Ephemeral });
    }
    return;
  }
  if (interaction.isButton() && interaction.customId.startsWith('om-mode:')) {
    const [, guildId, mode] = interaction.customId.split(':');
    if (interaction.guildId !== guildId) return;
    const result = store.recordOmModeVote(guildId, interaction.user.id, mode);
    await interaction.reply({ content: result.recorded ? 'Your Om challenge style vote was recorded.' : result.reason === 'already-voted' ? 'You already voted in this poll.' : 'That Om poll is not active.', flags: MessageFlags.Ephemeral });
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
