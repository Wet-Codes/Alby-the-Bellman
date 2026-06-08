const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const partyState = require("../data/partyState");

function buildPartyEmbed(party, client) {
  if (!party || !party.roles) {
    console.error("buildPartyEmbed received invalid party", party);
    return new EmbedBuilder()
      .setTitle("Error")
      .setDescription("Party data is corrupted. Close and recreate the party.");
  }





  const totalMembers = partyState.getTotalMembers();
  const missingRoles = partyState.getMissingImportantRoles();
  const roleLines = Object.entries(party.roles).map(([roleName, role]) => {
    const limitText = role.limit === 0 ? "Flexible" : `${role.members.length}/${role.limit}`;
    const memberText = role.members.length
      ? role.members.map((userId) => `<@${userId}>`).join(", ")
      : "Open";
    const queueText = role.queue.length
      ? `\nQueue: ${role.queue.map((userId) => `<@${userId}>`).join(" -> ")}`
      : "";

    return `**${partyState.formatRoleName(roleName)}** (${limitText})\n${memberText}${queueText}`;
  });

  const missingText = missingRoles.length
    ? missingRoles.map((roleName) => partyState.formatRoleName(roleName)).join(", ")
    : "None";

  return new EmbedBuilder()
    .setTitle(`${party.displayName} Party`)
    .setDescription("Pick a role from the dropdown. If a role is full, you will be queued automatically.")
    .setColor(missingRoles.length ? 0xe67e22 : 0x2ecc71)
    .addFields(
      {
        name: "Leader",
        value: `<@${party.leaderId}>`,
        inline: true
      },
      {
        name: "Players",
        value: `${totalMembers}/${party.maxPlayers} (Min ${party.minPlayers})`,
        inline: true
      },
      {
        name: "Needed Roles",
        value: missingText,
        inline: true
      },
      {
        name: "Roles",
        value: roleLines.join("\n\n") || "No roles configured."
      }
    )
    .setFooter({
      text: `One active party at a time${client.user ? ` - ${client.user.username}` : ""}`
    })
    .setTimestamp();
}

function buildRoleSelect(party) {
  return new StringSelectMenuBuilder()
    .setCustomId("party:role")
    .setPlaceholder("Choose or swap role")
    .addOptions(
      Object.keys(party.roles).map((roleName) => ({
        label: partyState.formatRoleName(roleName),
        value: roleName,
        description: getRoleDescription(party.roles[roleName])
      }))
    );
}

function getRoleDescription(role) {
  if (role.limit === 0) {
    return `${role.members.length} joined, flexible capacity`;
  }

  if (role.members.length < role.limit) {
    return `${role.limit - role.members.length} slot(s) open`;
  }

  return `Full, ${role.queue.length} queued`;
}

function buildRemoveSelect(party) {
  if (!party) return null;
  const userOptions = partyState.getUserOptions(party);
  if (!userOptions || userOptions.length === 0) return null;
  return new StringSelectMenuBuilder()
    .setCustomId("party:remove")
    .setPlaceholder("Leader: remove player")
    .addOptions(
      userOptions.slice(0, 25).map(userId => ({
        label: `Remove ${userId}`,
        value: userId,
        description: "Removes this player from their slot or queue"
      }))
    );
}

function buildPartyComponents(party) {
  if (!party) return [];
  const roleRow = new ActionRowBuilder().addComponents(buildRoleSelect(party));
  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("party:leave").setLabel("Leave Party").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("party:refresh").setLabel("Refresh").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("party:promote").setLabel("Promote Queue").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("party:close").setLabel("Close Party").setStyle(ButtonStyle.Danger)
  );
  const rows = [roleRow, buttonRow];
  const removeSelect = buildRemoveSelect(party);
  if (removeSelect) rows.push(new ActionRowBuilder().addComponents(removeSelect));
  return rows;
}

module.exports = {
  buildPartyEmbed,
  buildPartyComponents
};