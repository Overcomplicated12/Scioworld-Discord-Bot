import { SlashCommandBuilder, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('List available commands or learn about a topic.')
  .addStringOption(option => option.setName('topic').setDescription('A topic to explain').setRequired(false).addChoices(
    { name: 'Getting started', value: 'start' },
    { name: 'Economy', value: 'economy' },
    { name: 'Friendly play', value: 'friendly' },
  ));

export async function execute(interaction) {
  const topic = interaction.options.getString('topic');
  const canManage = Boolean(interaction.guild && (interaction.guild.ownerId === interaction.user.id || interaction.memberPermissions?.has('Administrator')));
  const messages = {
    start: '**Getting started**\nUse `/start` to create your profile, `/daily` for a daily reward, `/trivia` to answer science questions, and `/profile` or `/inventory` to see your progress. Use `/help` any time you need this menu again.',
    economy: '**Economy**\nSciocoins are fictional server currency with no cash value. Earn them from trivia and daily rewards, then spend them on collectibles, crafting, and trades. Knowledge points track your learning progress and levels.',
    friendly: '**Friendly play**\nGames are opt-in. Keep competition welcoming, avoid spam, and celebrate good answers. Use `/report` if a player is behaving inappropriately.',
  };
  const sections = [
    '**ScioVirtual help**',
    '',
    '**Start here**',
    '`/start` — create your profile',
    '`/profile` — view level, points, streak, and featured collectible',
    '`/inventory` — view currencies, resources, and collectibles',
    '`/daily` — claim your daily reward',
    '',
    '**Play and explore**',
    '`/trivia` — answer a science question',
    '`/race` — compete in a friendly science race',
    '`/poll status` — see the next weekly community poll',
    '`/frog` — get a funny philosophical quote (30-minute cooldown)',
    '`/lore` — read ScioVirtual stories',
    '',
    '**Collectibles and economy**',
    '`/shop` — view or buy collectibles',
    '`/craft` — craft a collectible',
    '`/equip` — feature an owned collectible',
    '`/sets` — track collectible set progress',
    '`/trade` — offer, accept, decline, cancel, or list trades',
    '',
    '**Community**',
    '`/leaderboard` — view rankings',
    '`/privacy` — hide or show your ranking',
    '`/camp-resources` — see instructors for your course roles',
    '`/report` — send a player report to moderators',
    '',
    '`/ping` — check that the bot is online',
    '`/help topic:<start|economy|friendly>` — get a focused explanation',
  ];
  if (canManage) sections.splice(-2, 0, '', '**Admin tools**', '`/poll early` — post this week’s random poll now', '`/poll override` — post this week’s custom poll', '`/camp-course` — manage course categories', '`/camp-instructor` — manage course instructors');
  const content = messages[topic] || sections.join('\n');
  await interaction.reply({ content, ...(topic ? { flags: MessageFlags.Ephemeral } : {}) });
}
