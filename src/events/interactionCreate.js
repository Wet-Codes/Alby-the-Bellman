const { MessageFlags } = require("discord.js");
const partyCommand = require("../commands/party");
const partyState = require("../data/partyState");
const { buildPartyEmbed, buildPartyComponents } = require("../utils/embedBuilder");

async function refreshPartyMessage(interaction, publicMessage) {
  const guildId = interaction.guildId;
  const party = partyState.getParty(guildId);
  if (!party || !party.messageId || !party.threadId) return;

  const thread = await interaction.client.channels.fetch(party.threadId);
  const message = await thread.messages.fetch(party.messageId);
  await message.edit({
    embeds: [buildPartyEmbed(party, interaction.client)],
    components: buildPartyComponents(party)
  });

  if (publicMessage) {
    await interaction.reply({ content: publicMessage, flags: [MessageFlags.Ephemeral] });
  } else if (!interaction.replied && !interaction.deferred) {
    await interaction.deferUpdate();
  }
}

function isLeader(interaction, party) {
  return party && party.leaderId === interaction.user.id;
}

async function handleRoleSelect(interaction) {
  const guildId = interaction.guildId;
  const roleName = interaction.values[0];
  const result = partyState.joinRole(guildId, interaction.user.id, roleName);
  await refreshPartyMessage(interaction, result.message);
}

async function handleLeave(interaction) {
  const guildId = interaction.guildId;
  const result = partyState.leaveParty(guildId, interaction.user.id);
  await refreshPartyMessage(interaction, result.message);
}

async function handleClose(interaction) {
  const guildId = interaction.guildId;
  const party = partyState.getParty(guildId);
  if (!isLeader(interaction, party)) {
    await interaction.reply({ content: "Only the party leader can close this party.", flags: [MessageFlags.Ephemeral] });
    return;
  }
  partyState.closeParty(guildId);
  await interaction.update({ content: "Party closed by the leader.", embeds: [], components: [] });
}

async function handlePromote(interaction) {
  const guildId = interaction.guildId;
  const party = partyState.getParty(guildId);
  if (!isLeader(interaction, party)) {
    await interaction.reply({ content: "Only the party leader can promote queued players.", flags: [MessageFlags.Ephemeral] });
    return;
  }
  const result = partyState.promoteFirstQueuedUser(guildId);
  await refreshPartyMessage(interaction, result.message);
}

async function handleRemoveSelect(interaction) {
  const guildId = interaction.guildId;
  const party = partyState.getParty(guildId);
  if (!isLeader(interaction, party)) {
    await interaction.reply({ content: "Only the party leader can remove players.", flags: [MessageFlags.Ephemeral] });
    return;
  }
  const userId = interaction.values[0];
  const result = partyState.leaveParty(guildId, userId);
  await refreshPartyMessage(interaction, result.message);
}

module.exports = async function handleInteractionCreate(interaction) {
  try {
    // Ignore DMs
    if (!interaction.guildId) {
      if (interaction.isRepliable()) {
        await interaction.reply({ content: "This bot only works in servers.", flags: [MessageFlags.Ephemeral] });
      }
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "party") {
      await partyCommand.execute(interaction);
      return;
    }

    const guildId = interaction.guildId;
    if (!partyState.hasActiveParty(guildId)) {
      if (interaction.isRepliable()) {
        await interaction.reply({ content: "There is no active party in this server.", flags: [MessageFlags.Ephemeral] });
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "party:role") {
        await handleRoleSelect(interaction);
      } else if (interaction.customId === "party:remove") {
        await handleRemoveSelect(interaction);
      }
      return;
    }

    if (interaction.isButton()) {
      switch (interaction.customId) {
        case "party:leave":
          await handleLeave(interaction);
          break;
        case "party:close":
          await handleClose(interaction);
          break;
        case "party:refresh":
          await refreshPartyMessage(interaction);
          break;
        case "party:promote":
          await handlePromote(interaction);
          break;
      }
      return;
    }
  } catch (error) {
    console.error("Interaction failed:", error);
    const response = { content: "Something went wrong while handling that action.", flags: [MessageFlags.Ephemeral] };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(response);
    } else if (interaction.isRepliable()) {
      await interaction.reply(response);
    }
  }
};