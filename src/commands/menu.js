import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('menu').setDescription('Choose how you want to participate in ScioCulture.');

const pages = {
  home: {
    content: '**ScioCulture menu**\nChoose a path: learn something, join the conversation, create community content, or build your collection.\n\nYou can participate whenever you want. There is no required daily grind.',
    buttons: [['learn', 'Learn', ButtonStyle.Primary], ['connect', 'Connect', ButtonStyle.Success], ['create', 'Create', ButtonStyle.Secondary], ['collect', 'Collect', ButtonStyle.Secondary]],
  },
  learn: { content: '**Learn**\n`/trivia` — answer a short science question\n`/camp-trivia ask` — try a course-specific question\n`/daily` — get a small reward and rotating fact\n\nAnswers give explanations, so a wrong answer still teaches you.', buttons: [['home', 'Back', ButtonStyle.Secondary]] },
  connect: { content: '**Connect**\n`/race create` — start a friendly science race\n`/poll status` — see the weekly community poll\n`/lore action:discuss` — help unlock the next story chapter\n`/lore` — read shared ScioVirtual stories\n\nInvite people into the conversation and celebrate good answers.', buttons: [['home', 'Back', ButtonStyle.Secondary]] },
  create: { content: '**Create**\n`/lore action:submit` — submit a story entry for review\n`/camp-trivia add` — instructors add course questions\n`/poll override` — admins shape this week’s prompt\n\nThe best reward is leaving something behind for the next person.', buttons: [['home', 'Back', ButtonStyle.Secondary]] },
  collect: { content: '**Collect**\n`/shop` — browse cosmetic collectibles\n`/craft` — make items from resources\n`/trade` — exchange items with friends\n`/sets` — track collection progress\n\nCollectibles are cultural souvenirs, not power or cash prizes.', buttons: [['home', 'Back', ButtonStyle.Secondary]] },
};

function components(page, userId) {
  return [new ActionRowBuilder().addComponents(pages[page].buttons.map(([id, label, style]) => new ButtonBuilder().setCustomId(`menu:${id}:${userId}`).setLabel(label).setStyle(style)))];
}

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  await interaction.reply({ content: pages.home.content, components: components('home', interaction.user.id), flags: MessageFlags.Ephemeral });
}

export async function handleButton(interaction) {
  const [, page, userId] = interaction.customId.split(':');
  if (interaction.user.id !== userId) { await interaction.reply({ content: 'This menu belongs to someone else. Run `/menu` to open your own.', flags: MessageFlags.Ephemeral }); return; }
  const selected = pages[page] ? page : 'home';
  await interaction.update({ content: pages[selected].content, components: components(selected, userId) });
}
