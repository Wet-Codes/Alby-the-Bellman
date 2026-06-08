require("dotenv").config();

const { Client, GatewayIntentBits, REST, Routes } = require("discord.js");
const partyCommand = require("./commands/party");
const handleReady = require("./events/ready");
const handleInteractionCreate = require("./events/interactionCreate");

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("Missing DISCORD_TOKEN, CLIENT_ID, or GUILD_ID in .env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  const commands = [partyCommand.data.toJSON()];

  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commands
  });
}

client.once("ready", handleReady);
client.on("interactionCreate", handleInteractionCreate);

(async () => {
  try {
    await registerCommands();
    await client.login(DISCORD_TOKEN);
  } catch (error) {
    console.error("Bot startup failed:", error);
    process.exit(1);
  }
})();