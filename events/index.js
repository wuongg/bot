const { handleReady } = require("./ready");
const { registerInteractionCreate } = require("./interactionCreate");
const { registerMessageCreate } = require("./messageCreate");
const { registerThreadCreate } = require("./threadCreate");

function registerEvents(client, commandFiles) {
  client.once("clientReady", () => handleReady(client, commandFiles));
  registerInteractionCreate(client);
  registerMessageCreate(client);
  registerThreadCreate(client);

  client.on("error", (error) => {
    const log = require("../lib/logger");
    log.error("Discord client error", { message: error.message });
  });
}

module.exports = { registerEvents };
