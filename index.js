require("dotenv").config();

const { validateConfig } = require("./config");
const { initStorage, getStorageMode, getSqlitePath } = require("./storage/backend");
const { setupLockHandlers } = require("./lib/lock");
const log = require("./lib/logger");

validateConfig();

const storage = initStorage();
log.info("Storage ready", {
  mode: getStorageMode(),
  sqlite: getStorageMode() === "sqlite" ? getSqlitePath() : null,
  fallbackFrom: storage.fallbackFrom ?? null
});

setupLockHandlers();

const { startHealthServer } = require("./lib/healthServer");
startHealthServer();

const { Client, GatewayIntentBits } = require("discord.js");
const { loadCommands } = require("./bot/commands");
const { registerEvents } = require("./events");

const { commands, files: commandFiles } = loadCommands();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = commands;
registerEvents(client, commandFiles);

client.login(process.env.TOKEN);
