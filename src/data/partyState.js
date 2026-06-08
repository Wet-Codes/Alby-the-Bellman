let party = null;

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

function createParty({ leaderId, activity, template, threadId }) {
  party = {
    active: true,
    leaderId,
    activity,
    displayName: template.displayName,
    minPlayers: template.min,
    maxPlayers: template.max,
    importantRoles: template.importantRoles,
    roles: buildRoles(template),
    messageId: "",
    threadId
  };

  return party;
}

function getParty() {
  return party;
}

function hasActiveParty() {
  return Boolean(party && party.active);
}

function setMessageId(messageId) {
  if (party) {
    party.messageId = messageId;
  }
}

function getRoleEntryForUser(userId) {
  if (!party) {
    return null;
  }

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

function removeUserFromParty(userId) {
  const entry = getRoleEntryForUser(userId);

  if (!entry) {
    return null;
  }

  const list = party.roles[entry.roleName][entry.listName];
  party.roles[entry.roleName][entry.listName] = list.filter((id) => id !== userId);

  return entry;
}

function hasOpenSlot(role) {
  return role.limit === 0 || role.members.length < role.limit;
}

function promoteNextQueuedUser(roleName) {
  const role = party.roles[roleName];

  if (!role || !hasOpenSlot(role) || role.queue.length === 0) {
    return null;
  }

  const promotedUserId = role.queue.shift();
  role.members.push(promotedUserId);

  return promotedUserId;
}

function joinRole(userId, roleName) {
  if (!hasActiveParty()) {
    return { ok: false, message: "There is no active party." };
  }

  const role = party.roles[roleName];

  if (!role) {
    return { ok: false, message: "That role does not exist for this party." };
  }

  const currentEntry = getRoleEntryForUser(userId);

  if (currentEntry && currentEntry.roleName === roleName) {
    const status = currentEntry.listName === "members" ? "already in" : "already queued for";
    return { ok: true, message: `You are ${status} ${formatRoleName(roleName)}.` };
  }

  const previousEntry = removeUserFromParty(userId);

  if (previousEntry && previousEntry.listName === "members") {
    promoteNextQueuedUser(previousEntry.roleName);
  }

  if (hasOpenSlot(role)) {
    role.members.push(userId);
    return { ok: true, message: `You joined ${formatRoleName(roleName)}.` };
  }

  role.queue.push(userId);
  return { ok: true, message: `${formatRoleName(roleName)} is full, so you joined its queue.` };
}

function leaveParty(userId) {
  if (!hasActiveParty()) {
    return { ok: false, message: "There is no active party." };
  }

  const removedEntry = removeUserFromParty(userId);

  if (!removedEntry) {
    return { ok: false, message: "That player is not in the active party." };
  }

  let promotedUserId = null;

  if (removedEntry.listName === "members") {
    promotedUserId = promoteNextQueuedUser(removedEntry.roleName);
  }

  if (promotedUserId) {
    return {
      ok: true,
      message: `Player removed. <@${promotedUserId}> was promoted into ${formatRoleName(removedEntry.roleName)}.`
    };
  }

  return { ok: true, message: "Player removed from the party." };
}

function promoteFirstQueuedUser() {
  if (!hasActiveParty()) {
    return { ok: false, message: "There is no active party." };
  }

  for (const roleName of Object.keys(party.roles)) {
    const promotedUserId = promoteNextQueuedUser(roleName);

    if (promotedUserId) {
      return {
        ok: true,
        message: `<@${promotedUserId}> was promoted into ${formatRoleName(roleName)}.`
      };
    }
  }

  return { ok: false, message: "No queued players can be promoted right now." };
}

function closeParty() {
  if (party) {
    party.active = false;
  }

  party = null;
}

function getTotalMembers() {
  if (!party) {
    return 0;
  }

  return Object.values(party.roles).reduce((total, role) => total + role.members.length, 0);
}

function getMissingImportantRoles() {
  if (!party) {
    return [];
  }

  return party.importantRoles.filter((roleName) => {
    const role = party.roles[roleName];
    return role && role.members.length === 0;
  });
}

function getUserOptions() {
  if (!party) {
    return [];
  }

  const userIds = new Set();

  for (const role of Object.values(party.roles)) {
    role.members.forEach((userId) => userIds.add(userId));
    role.queue.forEach((userId) => userIds.add(userId));
  }

  return Array.from(userIds);
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
