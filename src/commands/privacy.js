import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('privacy').setDescription('Hide or show your leaderboard profile.')
  .addBooleanOption(option => option.setName('hide').setDescription('Hide your profile from leaderboards').setRequired(true));

export async function execute(interaction) { if (!requireGuild(interaction)) return; const hide = interaction.options.getBoolean('hide'); store.setLeaderboardPrivacy(interaction.guildId, interaction.user.id, hide); await interaction.reply({ content: hide ? 'Your profile is hidden from leaderboards.' : 'Your profile is visible on leaderboards again.', flags: MessageFlags.Ephemeral }); }
