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
  const messages = {
    start: 'Start with `/start`, then use `/daily` for a reward, `/frog` for a philosopher quote, `/lore` for community stories, and `/profile` or `/inventory` to see your progress.',
    economy: 'Sciocoins are fictional server currency. Earn them from activities and daily rewards; spend them on collectibles and crafting. They have no cash value.',
    friendly: 'Games are opt-in and competition should stay kind. Celebrate good answers and do not spam or target other players.',
  };
  const content = messages[topic] || '**ScioVirtual commands**\n`/start` — create your profile\n`/daily` — claim today\'s reward\n`/trivia` — answer a science question\n`/frog` — ask the Frog of Wisdom for a quote (30-minute cooldown)\n`/lore` — explore community stories\n`/shop` — view or buy collectibles\n`/trade` — offer, accept, decline, cancel, or list trades\n`/leaderboard` — view server rankings\n`/privacy` — hide or show your ranking\n`/craft` — craft a collectible\n`/equip` — feature a collectible\n`/race` — run a friendly science race\n`/camp-resources` — see instructors for courses in your roles\n`/camp-course` — admins manage course categories\n`/camp-instructor` — admins manage course instructors\n`/report` — report a player for moderator review\n`/sets` — view collectible set progress\n`/profile` — view a profile\n`/inventory` — view your items\n`/ping` — check that the bot is online\n`/help [topic]` — get guidance`';
  await interaction.reply({ content, ...(topic ? { flags: MessageFlags.Ephemeral } : {}) });
}
