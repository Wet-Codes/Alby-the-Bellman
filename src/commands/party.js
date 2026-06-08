const { SlashCommandBuilder, ChannelType, MessageFlags } = require("discord.js");
const { getTemplate } = require("../data/templates");
const partyState = require("../data/partyState");
const { buildPartyEmbed, buildPartyComponents } = require("../utils/embedBuilder");

const data = new SlashCommandBuilder()
  .setName("party")
  .setDescription("Create an Albion party session.")
  .addSubcommand(sub => sub.setName("tracking").setDescription("Create a tracking party."))
  .addSubcommand(sub => sub.setName("dungeon").setDescription("Create a group dungeon party."))
  .addSubcommand(sub => sub.setName("pvp").setDescription("Create a PvP party."))
  .addSubcommand(sub => sub.setName("camp").setDescription("Create a camping party."));

async function execute(interaction) {
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: [MessageFlags.Ephemeral] });
    return;
  }

  if (partyState.hasActiveParty(guildId)) {
    await interaction.reply({
      content: "There is already an active party in this server. Close it before creating a new one.",
      flags: [MessageFlags.Ephemeral]
    });
    return;
  }

  const activity = interaction.options.getSubcommand();
  const template = getTemplate(activity);
  if (!template) {
    await interaction.reply({ content: "Unknown party type.", flags: [MessageFlags.Ephemeral] });
    return;
  }

  await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

  const thread = await interaction.channel.threads.create({
    name: `${template.displayName} Party - ${interaction.user.username}`,
    autoArchiveDuration: 1440,
    type: ChannelType.PublicThread,
    reason: "Albion party session created"
  });

  const party = partyState.createParty({
  guildId: guildId,
  leaderId: interaction.user.id,
  activity,
  template,
  threadId: thread.id
});

console.log("Party object after createParty:", party);
if (!party) {
  await interaction.editReply({ content: "Failed to create party. Check console for errors.", flags: [MessageFlags.Ephemeral] });
  return;
}

  const message = await thread.send({
    embeds: [buildPartyEmbed(party, interaction.client)],
    components: buildPartyComponents(party)
  });

  partyState.setMessageId(guildId, message.id);
  await interaction.editReply(`Party created: ${thread}`);
}

module.exports = { data, execute };