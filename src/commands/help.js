import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('List available commands.');

export async function execute(interaction) {
  await interaction.reply('Available commands:\n/ping - Check that the bot is responding.\n/help - List available commands.');
}
