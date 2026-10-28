import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { collectibles, itemName } from '../collectibles.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

const itemChoices = collectibles.slice(0, 25).map(item => ({ name: item.name, value: item.id }));

export const data = new SlashCommandBuilder().setName('trade').setDescription('Trade collectibles and Sciocoins with another player.')
  .addSubcommand(command => command.setName('offer').setDescription('Offer a trade to another player.')
    .addUserOption(option => option.setName('player').setDescription('The player receiving the offer').setRequired(true))
    .addStringOption(option => option.setName('give_item').setDescription('Your collectible').setRequired(true).addChoices(...itemChoices))
    .addStringOption(option => option.setName('want_item').setDescription('The collectible you want').setRequired(true).addChoices(...itemChoices))
    .addIntegerOption(option => option.setName('give_coins').setDescription('Sciocoins you offer').setMinValue(0).setMaxValue(10000).setRequired(false))
    .addIntegerOption(option => option.setName('want_coins').setDescription('Sciocoins you want').setMinValue(0).setMaxValue(10000).setRequired(false)))
  .addSubcommand(command => command.setName('accept').setDescription('Accept a trade offer.').addStringOption(option => option.setName('offer_id').setDescription('Offer ID, such as T0001').setRequired(true)))
  .addSubcommand(command => command.setName('decline').setDescription('Decline a trade offer.').addStringOption(option => option.setName('offer_id').setDescription('Offer ID').setRequired(true)))
  .addSubcommand(command => command.setName('cancel').setDescription('Cancel one of your trade offers.').addStringOption(option => option.setName('offer_id').setDescription('Offer ID').setRequired(true)))
  .addSubcommand(command => command.setName('list').setDescription('List your pending trade offers.'));

function tradeSummary(trade) { return `**${trade.id}** — give ${itemName(trade.giveItem)}${trade.giveCoins ? ` + ${trade.giveCoins} coins` : ''} for ${itemName(trade.wantItem)}${trade.wantCoins ? ` + ${trade.wantCoins} coins` : ''}`; }

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  const action = interaction.options.getSubcommand();
  if (action === 'offer') {
    const target = interaction.options.getUser('player');
    if (target.bot) { await interaction.reply({ content: 'Bots cannot participate in trades.', flags: MessageFlags.Ephemeral }); return; }
    const result = store.createTradeOffer(interaction.guildId, interaction.user.id, target.id, interaction.options.getString('give_item'), interaction.options.getString('want_item'), interaction.options.getInteger('give_coins') || 0, interaction.options.getInteger('want_coins') || 0, Date.now());
    if (!result.created) {
      const messages = { self: 'You cannot trade with yourself.', 'missing-give-item': 'You do not own the collectible you offered.', 'insufficient-give-coins': `You need ${result.costNeeded} more Sciocoins to make that offer.`, identical: 'That offer would exchange identical items and coins.' };
      await interaction.reply({ content: messages[result.reason] || 'That trade offer could not be created.', flags: MessageFlags.Ephemeral }); return;
    }
    await interaction.reply({ content: `<@${target.id}>, <@${interaction.user.id}> offered you a trade. Use **/trade accept offer_id:${result.offer.id}** or decline it.\n${tradeSummary(result.offer)}`, allowedMentions: { users: [target.id] } }); return;
  }
  if (action === 'list') {
    const trades = store.pendingTrades(interaction.guildId, interaction.user.id);
    const content = trades.length ? `**Your pending trades**\n${trades.map(tradeSummary).join('\n')}` : 'You have no pending trade offers.';
    await interaction.reply({ content, flags: MessageFlags.Ephemeral }); return;
  }
  const offerId = interaction.options.getString('offer_id');
  const result = store.settleTrade(interaction.guildId, interaction.user.id, offerId, action, Date.now());
  if (!result.settled) {
    const messages = { 'not-found': 'That offer does not exist.', 'not-recipient': 'Only the receiving player can accept or decline that offer.', 'not-owner': 'Only the player who created the offer can cancel it.', expired: 'That offer has expired.', 'sender-missing-item': 'The offer creator no longer owns the offered collectible.', 'recipient-missing-item': 'You no longer own the requested collectible.', 'sender-missing-coins': 'The offer creator no longer has enough coins.', 'recipient-missing-coins': 'You no longer have enough coins.', 'recipient-already-owns-give': 'You already own the offered collectible.', 'sender-already-owns-want': 'The offer creator already owns the requested collectible.' };
    await interaction.reply({ content: messages[result.reason] || 'That trade could not be completed.', flags: MessageFlags.Ephemeral }); return;
  }
  const status = action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled';
  await interaction.reply(`Trade **${offerId}** ${status}.`);
}
