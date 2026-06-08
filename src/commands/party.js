const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { getTemplate } = require("../data/templates");
const partyState = require("../data/partyState");
const { buildPartyEmbed, buildPartyComponents } = require("../utils/embedBuilder");

const data = new SlashCommandBuilder()
  .setName("party")
  .setDescription("Create an Albion party session.")
  .addSubcommand((subcommand) =>
    subcommand.setName("tracking").setDescription("Create a tracking party.")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("dungeon").setDescription("Create a group dungeon party.")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("pvp").setDescription("Create a PvP party.")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("camp").setDescription("Create a camping party.")
  );

async function execute(interaction) {
  if (partyState.hasActiveParty()) {
    await interaction.reply({
      content: "There is already an active party. Close it before creating a new one.",
      ephemeral: true
    });
    return;
  }

  const activity = interaction.options.getSubcommand();
  const template = getTemplate(activity);

  if (!template) {
    await interaction.reply({
      content: "Unknown party type.",
      ephemeral: true
    });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const thread = await interaction.channel.threads.create({
    name: `${template.displayName} Party - ${interaction.user.username}`,
    autoArchiveDuration: 1440,
    type: ChannelType.PublicThread,
    reason: "Albion party session created"
  });

  const party = partyState.createParty({
    leaderId: interaction.user.id,
    activity,
    template,
    threadId: thread.id
  });

  const message = await thread.send({
    embeds: [buildPartyEmbed(party, interaction.client)],
    components: buildPartyComponents(party)
  });

  partyState.setMessageId(message.id);

  await interaction.editReply(`Party created: ${thread}`);
}

module.exports = {
  data,
  execute
};