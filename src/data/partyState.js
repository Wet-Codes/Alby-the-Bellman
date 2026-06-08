const parties = new Map(); // guildId -> party

function buildRoles(template) {
  const roles = {};
  for (const [roleName, limit] of Object.entries(template.roles)) {
    roles[roleName] = {
      limit,
      members: [],
      queue: []
    };
  }
  return roles;
}

function createParty({ guildId, leaderId, activity, template, threadId }) {
  if (!guildId) {
    console.error("createParty missing guildId");
    return null;
  }
  if (!template || !template.roles) {
    console.error("createParty missing template or template.roles");
    return null;
  }
  if (parties.has(guildId)) {
    console.log(`Party already exists for guild ${guildId}, not creating.`);
    return null;
  }

  const party = {
    active: true,
    leaderId,
    activity,
    displayName: template.displayName,
    minPlayers: template.min,
    maxPlayers: template.max,
    importantRoles: template.importantRoles,
    roles: buildRoles(template),
    messageId: "",
    threadId,
    guildId
  };
  parties.set(guildId, party);
  console.log(`Party created for guild ${guildId}`, party.roles);
  return party;
}

function getParty(guildId) {
  return parties.get(guildId) || null;
}

function hasActiveParty(guildId) {
  const party = parties.get(guildId);
  return Boolean(party && party.active);
}

function setMessageId(guildId, messageId) {
  const party = parties.get(guildId);
  if (party) party.messageId = messageId;
}

function getRoleEntryForUser(party, userId) {
  for (const [roleName, role] of Object.entries(party.roles)) {
    if (role.members.includes(userId)) {
      return { roleName, listName: "members" };
    }
    if (role.queue.includes(userId)) {
      return { roleName, listName: "queue" };
    }
  }
  return null;
}

function removeUserFromParty(party, userId) {
  const entry = getRoleEntryForUser(party, userId);
  if (!entry) return null;

  const list = party.roles[entry.roleName][entry.listName];
  party.roles[entry.roleName][entry.listName] = list.filter(id => id !== userId);
  return entry;
}

function hasOpenSlot(role) {
  return role.limit === 0 || role.members.length < role.limit;
}

function promoteNextQueuedUser(party, roleName) {
  const role = party.roles[roleName];
  if (!role || !hasOpenSlot(role) || role.queue.length === 0) return null;

  const promotedUserId = role.queue.shift();
  role.members.push(promotedUserId);
  return promotedUserId;
}

function joinRole(guildId, userId, roleName) {
  const party = parties.get(guildId);
  if (!party || !party.active) {
    return { ok: false, message: "There is no active party in this server." };
  }

  const role = party.roles[roleName];
  if (!role) {
    return { ok: false, message: "That role does not exist for this party." };
  }

  const currentEntry = getRoleEntryForUser(party, userId);
  if (currentEntry && currentEntry.roleName === roleName) {
    const status = currentEntry.listName === "members" ? "already in" : "already queued for";
    return { ok: true, message: `You are ${status} ${formatRoleName(roleName)}.` };
  }

  const previousEntry = removeUserFromParty(party, userId);
  if (previousEntry && previousEntry.listName === "members") {
    promoteNextQueuedUser(party, previousEntry.roleName);
  }

  if (hasOpenSlot(role)) {
    role.members.push(userId);
    return { ok: true, message: `You joined ${formatRoleName(roleName)}.` };
  } else {
    role.queue.push(userId);
    return { ok: true, message: `${formatRoleName(roleName)} is full, so you joined its queue.` };
  }
}

function leaveParty(guildId, userId) {
  const party = parties.get(guildId);
  if (!party || !party.active) {
    return { ok: false, message: "There is no active party in this server." };
  }

  const removedEntry = removeUserFromParty(party, userId);
  if (!removedEntry) {
    return { ok: false, message: "You are not in the active party." };
  }

  let promotedUserId = null;
  if (removedEntry.listName === "members") {
    promotedUserId = promoteNextQueuedUser(party, removedEntry.roleName);
  }

  if (promotedUserId) {
    return {
      ok: true,
      message: `You left. <@${promotedUserId}> was promoted into ${formatRoleName(removedEntry.roleName)}.`
    };
  }
  return { ok: true, message: "You left the party." };
}

function promoteFirstQueuedUser(guildId) {
  const party = parties.get(guildId);
  if (!party || !party.active) {
    return { ok: false, message: "There is no active party in this server." };
  }

  for (const roleName of Object.keys(party.roles)) {
    const promotedUserId = promoteNextQueuedUser(party, roleName);
    if (promotedUserId) {
      return {
        ok: true,
        message: `<@${promotedUserId}> was promoted into ${formatRoleName(roleName)}.`
      };
    }
  }
  return { ok: false, message: "No queued players can be promoted right now." };
}

function closeParty(guildId) {
  parties.delete(guildId);
}

function getTotalMembers(party) {
  if (!party || !party.roles) return 0;
  return Object.values(party.roles).reduce((sum, role) => sum + (role.members?.length || 0), 0);
}

function getUserOptions(party) {
  if (!party || !party.roles) return [];
  const userIds = new Set();
  for (const role of Object.values(party.roles)) {
    role.members?.forEach(id => userIds.add(id));
    role.queue?.forEach(id => userIds.add(id));
  }
  return Array.from(userIds);
}

function getMissingImportantRoles(party) {
  if (!party || !party.roles || !party.importantRoles) return [];
  return party.importantRoles.filter(roleName => {
    const role = party.roles[roleName];
    return role && role.members.length === 0;
  });
}


function formatRoleName(roleName) {
  return roleName.charAt(0).toUpperCase() + roleName.slice(1);
}

module.exports = {
  createParty,
  getParty,
  hasActiveParty,
  setMessageId,
  joinRole,
  leaveParty,
  promoteFirstQueuedUser,
  closeParty,
  getTotalMembers,
  getMissingImportantRoles,
  getUserOptions,
  formatRoleName
};