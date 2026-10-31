import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('List available commands or learn about a topic.')
  .addStringOption(option => option.setName('topic').setDescription('A topic to explain').setRequired(false).addChoices(
    { name: 'Getting started', value: 'start' },
    { name: 'Economy', value: 'economy' },
    { name: 'Friendly play', value: 'friendly' },
  ));

function pagesFor(canManage) {
  const pages = [
    ['**ScioVirtual help · 1/4**', '', '**Start here**', '`/start` — create your profile', '`/profile` — view level, points, streak, title, and featured collectible', '`/inventory` — view currencies, resources, and collectibles', '`/daily` — claim your daily reward'],
    ['**ScioVirtual help · 2/4**', '', '**Play and explore**', '`/trivia` — answer a science question', '`/race` — compete in a friendly science race', '`/poll status` — see the next weekly community poll', '`/om opt-in|opt-out` — manage the fictional Om challenge', '`/frog` — get a funny philosophical quote (30-minute cooldown)', '`/lore` — read ScioVirtual stories'],
    ['**ScioVirtual help · 3/4**', '', '**Collectibles and economy**', '`/shop` — view or buy collectibles', '`/craft` — craft a collectible', '`/equip` — feature an owned collectible', '`/sets` — track collectible set progress', '`/trade` — offer, accept, decline, cancel, or list trades', '', '**Community**', '`/leaderboard` — view rankings', '`/privacy` — hide or show your ranking', '`/camp-resources` — see instructors for your course roles', '`/report` — send a player report to moderators'],
    ['**ScioVirtual help · 4/4**', '', '`/ping` — check that the bot is online', '`/help topic:<start|economy|friendly>` — get a focused explanation'],
  ];
  if (canManage) pages[3].splice(1, 0, '', '**Admin tools**', '`/bot-status` — view scheduler and moderation health', '`/poll early` — post this week’s random poll now', '`/poll override` — post this week’s custom poll', '`/om target|stop` — manage the opted-in Om challenge', '`/om-test` — run the temporary one-minute test', '`/camp-course` — manage course categories', '`/camp-instructor` — manage course instructors');
  return pages.map(lines => lines.join('\n'));
}

function pageButtons(page, total, userId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`help:${page - 1}:${userId}`).setLabel('Previous').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId(`help:${page + 1}:${userId}`).setLabel('Next').setStyle(ButtonStyle.Primary).setDisabled(page === total - 1),
  );
}

export async function execute(interaction) {
  const topic = interaction.options.getString('topic');
  const canManage = Boolean(interaction.guild && (interaction.guild.ownerId === interaction.user.id || interaction.memberPermissions?.has('Administrator')));
  const messages = {
    start: '**Getting started**\nUse `/start` to create your profile, `/daily` for a daily reward, `/trivia` to answer science questions, and `/profile` or `/inventory` to see your progress. Use `/help` any time you need this menu again.',
    economy: '**Economy**\nSciocoins are fictional server currency with no cash value. Earn them from trivia and daily rewards, then spend them on collectibles, crafting, and trades. Knowledge points track your learning progress and levels.',
    friendly: '**Friendly play**\nGames are opt-in. Keep competition welcoming, avoid spam, and celebrate good answers. Use `/report` if a player is behaving inappropriately.',
  };
  if (messages[topic]) {
    await interaction.reply({ content: messages[topic], flags: MessageFlags.Ephemeral });
    return;
  }
  const pages = pagesFor(canManage);
  await interaction.reply({ content: pages[0], components: [pageButtons(0, pages.length, interaction.user.id)], flags: MessageFlags.Ephemeral });
}

export async function handleButton(interaction) {
  const [, pageText, userId] = interaction.customId.split(':');
  if (interaction.user.id !== userId) {
    await interaction.reply({ content: 'This help menu belongs to someone else. Run `/help` to open your own.', flags: MessageFlags.Ephemeral });
    return;
  }
  const canManage = Boolean(interaction.guild && (interaction.guild.ownerId === interaction.user.id || interaction.memberPermissions?.has('Administrator')));
  const pages = pagesFor(canManage);
  const page = Math.max(0, Math.min(Number(pageText), pages.length - 1));
  await interaction.update({ content: pages[page], components: [pageButtons(page, pages.length, interaction.user.id)] });
}
