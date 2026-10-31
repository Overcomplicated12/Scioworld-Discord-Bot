import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { randomOmMessage, randomWaterDropMessage } from '../om.js';
import { store } from '../store.js';
import { requireGuild } from './utils.js';

export const data = new SlashCommandBuilder().setName('om-test').setDescription('Temporary admin test for the one-minute Om poll.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addStringOption(option => option.setName('mode').setDescription('Test message style').setRequired(false).addChoices({ name: 'General Om', value: 'general' }, { name: 'Water drop', value: 'water-drop' }));

export async function execute(interaction) {
  if (!requireGuild(interaction)) return;
  if (!(interaction.guild.ownerId === interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))) { await interaction.reply({ content: 'Only the server owner or an administrator can run the Om test.', flags: MessageFlags.Ephemeral }); return; }
  const mode = interaction.options.getString('mode') || 'general';
  const schedule = store.getOmSchedule(interaction.guildId);
  const hasPersistentTarget = schedule.targetId && schedule.optedIn.includes(schedule.targetId);
  const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`om-test:yes:${interaction.id}`).setLabel('Opt in for this test').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`om-test:no:${interaction.id}`).setLabel('Skip').setStyle(ButtonStyle.Secondary));
  const message = await interaction.channel.send({ content: hasPersistentTarget ? '🧪 **One-minute Om test** — the saved opted-in target will receive the test message by DM when the timer ends.' : '🧪 **One-minute Om test** — choose whether to receive the harmless test message. This choice is saved for future tests. This test expires in one minute.', ...(hasPersistentTarget ? {} : { components: [row] }) });
  await interaction.reply({ content: 'The one-minute test poll is running.', flags: MessageFlags.Ephemeral });
  setTimeout(async () => {
    try {
      await message.edit({ content: `${message.content}\n\n⏱️ Test complete.`, components: [] });
      const currentSchedule = store.getOmSchedule(interaction.guildId);
      if (currentSchedule.targetId && currentSchedule.optedIn.includes(currentSchedule.targetId)) {
        const target = await interaction.client.users.fetch(currentSchedule.targetId);
        const messageText = mode === 'water-drop' ? randomWaterDropMessage() : randomOmMessage();
        await target.send(`🧪 **Om test message**\n${messageText}\n\nYou are receiving this because you opted into the test.`);
      }
    } catch (error) { console.error('Om test failed:', error); }
  }, 60 * 1000);
}

export async function handleButton(interaction) {
  const [, choice] = interaction.customId.split(':');
  if (choice === 'yes') {
    store.setOmOptIn(interaction.guildId, interaction.user.id, true);
    store.setOmTarget(interaction.guildId, interaction.user.id);
    await interaction.update({ content: '🧪 **One-minute Om test** — you opted in. The test message will arrive when the timer ends.', components: [] });
  } else {
    await interaction.update({ content: '🧪 **One-minute Om test** — skipped.', components: [] });
  }
}
