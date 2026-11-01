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
    ['**ScioVirtual help · 1/4**', '', '**Start here**', '`/menu` — choose Learn, Connect, Create, or Collect', '`/start` — create your profile', '`/profile` — view level, points, streak, title, and featured collectible', '`/inventory` — view currencies, resources, and collectibles', '`/daily` — claim your daily reward'],
    ['**ScioVirtual help · 2/4**', '', '**Learn and connect**', '`/trivia` — answer a science question', '`/camp-trivia ask` — answer a course-specific question', '`/race` — compete in a friendly science race', '`/poll status` — see the next weekly community poll', '`/lore action:solve` — solve a key clue to unlock the next chapter', '`/lore action:progress` — see story progress', '`/torture-om opt-in|opt-out` — manage the fictional Om challenge', '`/frog` — get a funny philosophical quote (30-minute cooldown)', '`/lore` — read shared stories'],
    ['**ScioVirtual help · 3/4**', '', '**Create and collect**', '`/lore action:submit` — students submit a story for review', '`/camp-trivia add` — instructors create course questions', '`/shop` — view or buy collectibles', '`/craft` — craft a collectible', '`/equip` — feature an owned collectible', '`/sets` — track collectible set progress', '`/trade` — exchange items with friends', '`/privacy` — control leaderboard, recognition, and camp visibility'],
    ['**ScioVirtual help · 4/4**', '', '`/ping` — check that the bot is online', '`/help topic:<start|economy|friendly>` — get a focused explanation'],
  ];
  if (canManage) pages[3].splice(1, 0, '', '**Admin tools**', '`/bot-status` — view scheduler and moderation health', '`/reports list|close|reopen` — review submitted reports', '`/lore-review list|approve|reject` — review student lore', '`/poll early` — post this week’s random poll now', '`/poll override` — post this week’s custom poll', '`/torture-om target|stop` — manage the opted-in Om challenge', '`/om-test` — run the temporary one-minute test', '`/camp-course` — manage, export, or import course data', '`/camp-instructor` — manage course instructors', '`/camp-trivia add|remove` — manage course questions');
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
