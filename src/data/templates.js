const templates = {
  tracking: {
    name: "tracking",
    displayName: "Tracking",
    min: 4,
    max: 7,
    importantRoles: ["tank", "healer", "pierce"],
    roles: {
      tank: 1,
      healer: 1,
      pierce: 1,
      badon: 1,
      dps: 3
    }
  },

  dungeon: {
    name: "dungeon",
    displayName: "Group Dungeon",
    min: 4,
    max: 7,
    importantRoles: ["tank", "healer", "badon"],
    roles: {
      tank: 1,
      healer: 1,
      badon: 1,
      pierce: 1,
      dps: 3
    }
  },

  pvp: {
    name: "pvp",
    displayName: "PvP",
    min: 4,
    max: 10,
    importantRoles: ["tank", "healer"],
    roles: {
      tank: 0,
      healer: 1,
      support: 0,
      dps: 0
    }
  }
};

function getTemplate(name) {
  return templates[name];
}

function getTemplates() {
  return templates;
}

module.exports = {
  getTemplate,
  getTemplates
};
