import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { collectibles, itemName } from '../collectibles.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('equip').setDescription('Choose a collectible to feature on your profile.')
  .addStringOption(option => option.setName('item').setDescription('Collectible to equip').setRequired(true).addChoices(...collectibles.slice(0, 25).map(item => ({ name: item.name, value: item.id }))));
export async function execute(interaction) { if (!requireGuild(interaction)) return; const item = interaction.options.getString('item'); const result = store.equipCollectible(interaction.guildId, interaction.user.id, item); if (!result.equipped) { await interaction.reply({ content: `You do not own **${itemName(item)}**.`, flags: MessageFlags.Ephemeral }); return; } await interaction.reply(`You equipped **${itemName(item)}** on your profile.`); }
