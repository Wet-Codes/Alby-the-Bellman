const partyCommand = require("../commands/party");
const partyState = require("../data/partyState");
const { buildPartyEmbed, buildPartyComponents } = require("../utils/embedBuilder");

async function refreshPartyMessage(interaction, publicMessage) {
  const party = partyState.getParty();

  if (!party || !party.messageId || !party.threadId) {
    return;
  }

  const thread = await interaction.client.channels.fetch(party.threadId);
  const message = await thread.messages.fetch(party.messageId);

  await message.edit({
    embeds: [buildPartyEmbed(party, interaction.client)],
    components: buildPartyComponents(party)
  });

  if (publicMessage) {
    await interaction.reply({ content: publicMessage, ephemeral: true });
    return;
  }

  if (!interaction.replied && !interaction.deferred) {
    await interaction.deferUpdate();
  }
}

function isLeader(interaction, party) {
  return party && party.leaderId === interaction.user.id;
}

async function handleRoleSelect(interaction) {
  const roleName = interaction.values[0];
  const result = partyState.joinRole(interaction.user.id, roleName);

  await refreshPartyMessage(interaction, result.message);
}

async function handleLeave(interaction) {
  const result = partyState.leaveParty(interaction.user.id);
  await refreshPartyMessage(interaction, result.message);
}

async function handleClose(interaction) {
  const party = partyState.getParty();

  if (!isLeader(interaction, party)) {
    await interaction.reply({
      content: "Only the party leader can close this party.",
      ephemeral: true
    });
    return;
  }

  partyState.closeParty();

  await interaction.update({
    content: "Party closed by the leader.",
    embeds: [],
    components: []
  });
}

async function handlePromote(interaction) {
  const party = partyState.getParty();

  if (!isLeader(interaction, party)) {
    await interaction.reply({
      content: "Only the party leader can promote queued players.",
      ephemeral: true
    });
    return;
  }

  const result = partyState.promoteFirstQueuedUser();
  await refreshPartyMessage(interaction, result.message);
}

async function handleRemoveSelect(interaction) {
  const party = partyState.getParty();

  if (!isLeader(interaction, party)) {
    await interaction.reply({
      content: "Only the party leader can remove players.",
      ephemeral: true
    });
    return;
  }

  const userId = interaction.values[0];
  const result = partyState.leaveParty(userId);
  await refreshPartyMessage(interaction, result.message);
}

module.exports = async function handleInteractionCreate(interaction) {
  try {
    if (interaction.guildId !== process.env.GUILD_ID) {
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: "This bot is configured for one Discord server only.",
          ephemeral: true
        });
      }
      return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === "party") {
      await partyCommand.execute(interaction);
      return;
    }

    if (!partyState.hasActiveParty()) {
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: "There is no active party right now.",
          ephemeral: true
        });
      }
      return;
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "party:role") {
        await handleRoleSelect(interaction);
        return;
      }

      if (interaction.customId === "party:remove") {
        await handleRemoveSelect(interaction);
        return;
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === "party:leave") {
        await handleLeave(interaction);
        return;
      }

      if (interaction.customId === "party:close") {
        await handleClose(interaction);
        return;
      }

      if (interaction.customId === "party:refresh") {
        await refreshPartyMessage(interaction);
        return;
      }

      if (interaction.customId === "party:promote") {
        await handlePromote(interaction);
      }
    }
  } catch (error) {
    console.error("Interaction failed:", error);

    const response = {
      content: "Something went wrong while handling that action.",
      ephemeral: true
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(response);
    } else if (interaction.isRepliable()) {
      await interaction.reply(response);
    }
  }
};
